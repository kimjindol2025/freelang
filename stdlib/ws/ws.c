/**
 * FreeLang WebSocket Module (Phase 16 Week 4)
 * WebSocket server and client with libuv integration
 *
 * 구현 방식:
 * - uv_tcp_t 기반 비동기 TCP 연결
 * - HTTP Upgrade 핸드셰이크 (직접 처리)
 * - core/websocket.c의 프레임 파싱/마스킹 재활용
 * - stream.c의 uv_idle_t 펌프 패턴 적용
 * - freelang_enqueue_callback으로 VM 콜백 큐 연결
 */

#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <uv.h>
#include <pthread.h>
#include <stdint.h>
#include "../ffi/freelang_ffi.h"

/* ===== WebSocket Frame Types (from websocket.h) ===== */

typedef enum {
  FL_WS_FRAME_CONTINUATION = 0x0,
  FL_WS_FRAME_TEXT = 0x1,
  FL_WS_FRAME_BINARY = 0x2,
  FL_WS_FRAME_CLOSE = 0x8,
  FL_WS_FRAME_PING = 0x9,
  FL_WS_FRAME_PONG = 0xa
} fl_ws_frame_type_t;

typedef struct {
  int fin;
  int rsv1, rsv2, rsv3;
  fl_ws_frame_type_t opcode;
  int masked;
  uint8_t *mask_key;
  uint64_t payload_len;
  uint8_t *payload;
  size_t payload_size;
} fl_ws_frame_t;

/* ===== WebSocket Frame Parsing (RFC 6455) ===== */

/* Frame parsing implementation */
fl_ws_frame_t* ws_frame_parse(const uint8_t *buffer, size_t buffer_len,
                              size_t *bytes_consumed) {
  if (!buffer || buffer_len < 2 || !bytes_consumed) return NULL;

  fl_ws_frame_t *frame = (fl_ws_frame_t *)malloc(sizeof(fl_ws_frame_t));
  if (!frame) return NULL;

  memset(frame, 0, sizeof(fl_ws_frame_t));

  /* Parse first byte: FIN (1 bit) + RSV (3 bits) + Opcode (4 bits) */
  frame->fin = (buffer[0] & 0x80) ? 1 : 0;
  frame->rsv1 = (buffer[0] & 0x40) ? 1 : 0;
  frame->rsv2 = (buffer[0] & 0x20) ? 1 : 0;
  frame->rsv3 = (buffer[0] & 0x10) ? 1 : 0;
  frame->opcode = (fl_ws_frame_type_t)(buffer[0] & 0x0F);

  /* Parse second byte: MASK (1 bit) + Payload Length (7 bits) */
  frame->masked = (buffer[1] & 0x80) ? 1 : 0;
  uint64_t payload_len = buffer[1] & 0x7F;

  *bytes_consumed = 2;

  /* Handle extended payload length */
  if (payload_len == 126) {
    if (buffer_len < 4) {
      free(frame);
      return NULL;
    }
    payload_len = ((uint16_t)buffer[2] << 8) | buffer[3];
    *bytes_consumed = 4;
  } else if (payload_len == 127) {
    if (buffer_len < 10) {
      free(frame);
      return NULL;
    }
    payload_len = 0;
    for (int i = 0; i < 8; i++) {
      payload_len = (payload_len << 8) | buffer[2 + i];
    }
    *bytes_consumed = 10;
  }

  /* Handle masking key */
  if (frame->masked) {
    if (buffer_len < *bytes_consumed + 4) {
      free(frame);
      return NULL;
    }
    frame->mask_key = (uint8_t *)malloc(4);
    if (!frame->mask_key) {
      free(frame);
      return NULL;
    }
    memcpy(frame->mask_key, buffer + *bytes_consumed, 4);
    *bytes_consumed += 4;
  }

  /* Allocate and copy payload */
  if (payload_len > 0) {
    if (buffer_len < *bytes_consumed + payload_len) {
      if (frame->mask_key) free(frame->mask_key);
      free(frame);
      return NULL;
    }
    frame->payload = (uint8_t *)malloc(payload_len);
    if (!frame->payload) {
      if (frame->mask_key) free(frame->mask_key);
      free(frame);
      return NULL;
    }
    memcpy(frame->payload, buffer + *bytes_consumed, payload_len);
    frame->payload_size = payload_len;
  }

  frame->payload_len = payload_len;
  *bytes_consumed += payload_len;

  return frame;
}

/* Frame unmasking implementation */
int ws_frame_unmask(fl_ws_frame_t *frame) {
  if (!frame || !frame->payload || !frame->mask_key) return -1;

  /* Unmask: payload[i] ^= mask_key[i % 4] (XOR is symmetric) */
  for (size_t i = 0; i < frame->payload_len; i++) {
    frame->payload[i] ^= frame->mask_key[i % 4];
  }

  frame->masked = 0;
  return 0;
}

/* Frame cleanup */
void ws_frame_destroy(fl_ws_frame_t *frame) {
  if (!frame) return;
  if (frame->payload) free(frame->payload);
  if (frame->mask_key) free(frame->mask_key);
  free(frame);
}

/* ===== Constants ===== */

#define MAX_SERVERS 256
#define MAX_SOCKETS 4096
#define WS_RECV_BUFFER_SIZE 65536

/* ===== WebSocket State ===== */

typedef enum {
  WS_STATE_CONNECTING = 0,
  WS_STATE_HANDSHAKE = 1,
  WS_STATE_OPEN = 2,
  WS_STATE_CLOSING = 3,
  WS_STATE_CLOSED = 4
} ws_state_t;

/* ===== Message Node (LinkedList) ===== */

typedef struct msg_node {
  char *data;
  size_t size;
  struct msg_node *next;
} msg_node_t;

/* ===== Internal Structures ===== */

typedef struct {
  int id;
  uv_tcp_t tcp;
  int port;
  int on_connection_cb;
  int state;
  int destroyed;
  fl_event_context_t *ctx;
} fl_ws_server_t;

typedef struct {
  int id;
  uv_tcp_t tcp;
  fl_event_context_t *ctx;

  /* libuv 리소스 */
  uv_idle_t idle_handle;
  uv_loop_t *loop;

  /* WebSocket 상태 */
  int state;
  int handshake_done;
  int is_client;

  /* 수신 버퍼 */
  uint8_t recv_buf[WS_RECV_BUFFER_SIZE];
  size_t recv_buf_len;

  /* 메시지 큐 (stream.c 패턴) */
  msg_node_t *head;
  msg_node_t *tail;

  /* 콜백 IDs */
  int on_msg_cb;
  int on_close_cb;
  int on_error_cb;
  int on_open_cb;

  /* 메타데이터 */
  char *url;  /* 클라이언트용 */
  int destroyed;
} fl_ws_socket_t;

/* ===== Global State ===== */

static fl_ws_server_t *server_table[MAX_SERVERS] = {NULL};
static int next_server_id = 1;

static fl_ws_socket_t *socket_table[MAX_SOCKETS] = {NULL};
static int next_socket_id = 1;

/* ===== Helper Functions ===== */

static int server_alloc_id(fl_ws_server_t *server) {
  if (next_server_id >= MAX_SERVERS) return -1;
  int id = next_server_id++;
  server_table[id] = server;
  return id;
}

static fl_ws_server_t* server_get(int id) {
  if (id <= 0 || id >= MAX_SERVERS) return NULL;
  return server_table[id];
}

static void server_free_id(int id) {
  if (id > 0 && id < MAX_SERVERS) {
    server_table[id] = NULL;
  }
}

static int socket_alloc_id(fl_ws_socket_t *socket) {
  if (next_socket_id >= MAX_SOCKETS) return -1;
  int id = next_socket_id++;
  socket_table[id] = socket;
  return id;
}

static fl_ws_socket_t* socket_get(int id) {
  if (id <= 0 || id >= MAX_SOCKETS) return NULL;
  return socket_table[id];
}

static void socket_free_id(int id) {
  if (id > 0 && id < MAX_SOCKETS) {
    socket_table[id] = NULL;
  }
}

/* ===== libuv Callbacks ===== */

/* idle_cb: stream.c 패턴 - 메시지 큐에서 꺼내서 콜백 호출 */
static void ws_idle_cb(uv_idle_t *handle) {
  fl_ws_socket_t *socket = (fl_ws_socket_t *)handle->data;

  if (!socket || socket->destroyed) return;

  if (!socket->head) {
    uv_idle_stop(handle);
    return;
  }

  /* 메시지 꺼내기 */
  msg_node_t *node = socket->head;
  socket->head = node->next;
  if (!socket->head) socket->tail = NULL;

  /* FreeLang VM 콜백 큐에 등록 */
  if (socket->on_msg_cb >= 0) {
    fprintf(stderr, "[ws] Enqueue message callback: id=%d, size=%zu\n",
            socket->on_msg_cb, node->size);
    freelang_enqueue_callback(socket->ctx, socket->on_msg_cb, node->data);
  } else {
    free(node->data);
  }
  free(node);
}

/* read_cb: TCP 데이터 수신 */
static void ws_read_cb(uv_stream_t *stream, ssize_t nread, const uv_buf_t *buf) {
  fl_ws_socket_t *socket = (fl_ws_socket_t *)stream->data;

  if (nread < 0) {
    fprintf(stderr, "[ws] Read error: %s\n", uv_strerror(nread));
    if (socket->on_error_cb >= 0) {
      freelang_enqueue_callback(socket->ctx, socket->on_error_cb, NULL);
    }
    if (buf->base) free(buf->base);
    return;
  }

  if (nread == 0) {
    if (buf->base) free(buf->base);
    return;
  }

  fprintf(stderr, "[ws] Read %zd bytes\n", nread);

  if (!socket->handshake_done) {
    /* HTTP Upgrade 핸드셰이크 처리 */
    memcpy(socket->recv_buf + socket->recv_buf_len, buf->base, nread);
    socket->recv_buf_len += nread;

    /* \r\n\r\n 찾기 (HTTP 헤더 끝) */
    if (socket->recv_buf_len >= 4) {
      uint8_t *end = memchr(socket->recv_buf, '\r', socket->recv_buf_len - 3);
      if (end && *(end+1) == '\n' && *(end+2) == '\r' && *(end+3) == '\n') {
        socket->handshake_done = 1;
        socket->state = WS_STATE_OPEN;
        socket->recv_buf_len = 0;  /* 헤더 버퍼 초기화 */

        fprintf(stderr, "[ws] Handshake complete, entering frame mode\n");

        if (socket->on_open_cb >= 0) {
          freelang_enqueue_callback(socket->ctx, socket->on_open_cb, NULL);
        }
      }
    }
  } else {
    /* WebSocket 프레임 처리 (RFC 6455) */
    /* 수신 데이터를 버퍼에 추가 */
    if (socket->recv_buf_len + nread > WS_RECV_BUFFER_SIZE) {
      fprintf(stderr, "[ws] Receive buffer overflow\n");
      if (socket->on_error_cb >= 0) {
        freelang_enqueue_callback(socket->ctx, socket->on_error_cb, NULL);
      }
      if (buf->base) free(buf->base);
      return;
    }

    memcpy(socket->recv_buf + socket->recv_buf_len, buf->base, nread);
    socket->recv_buf_len += nread;

    /* 프레임 파싱 루프 */
    size_t offset = 0;
    while (offset < socket->recv_buf_len) {
      size_t bytes_consumed = 0;

      /* RFC 6455 프레임 파싱 */
      fl_ws_frame_t *frame = ws_frame_parse(
          socket->recv_buf + offset,
          socket->recv_buf_len - offset,
          &bytes_consumed
      );

      if (!frame) {
        /* 불완전한 프레임, 더 많은 데이터를 기다림 */
        break;
      }

      /* 마스크 해제 (클라이언트→서버는 항상 masked) */
      if (frame->masked && frame->payload) {
        ws_frame_unmask(frame);
      }

      /* 프레임 타입별 처리 */
      if (frame->opcode == FL_WS_FRAME_TEXT || frame->opcode == FL_WS_FRAME_BINARY) {
        /* 데이터 프레임: 메시지 큐에 추가 */
        msg_node_t *node = malloc(sizeof(msg_node_t));
        if (node) {
          node->size = frame->payload_len;
          node->data = malloc(frame->payload_len + 1);
          if (node->data) {
            if (frame->payload) {
              memcpy(node->data, frame->payload, frame->payload_len);
            }
            node->data[frame->payload_len] = '\0';
            node->next = NULL;

            if (!socket->tail) {
              socket->head = socket->tail = node;
            } else {
              socket->tail->next = node;
              socket->tail = node;
            }
          } else {
            free(node);
          }
        }

        fprintf(stderr, "[ws] Frame parsed: type=%d, len=%zu, masked=%d\n",
                frame->opcode, frame->payload_len, frame->masked);
      } else if (frame->opcode == FL_WS_FRAME_CLOSE) {
        /* 닫힘 프레임: 연결 종료 */
        socket->state = WS_STATE_CLOSED;
        fprintf(stderr, "[ws] Close frame received\n");
        if (socket->on_close_cb >= 0) {
          freelang_enqueue_callback(socket->ctx, socket->on_close_cb, NULL);
        }
      } else if (frame->opcode == FL_WS_FRAME_PING) {
        /* Ping 프레임: Pong 응답 (TODO) */
        fprintf(stderr, "[ws] Ping received, should send pong\n");
      } else if (frame->opcode == FL_WS_FRAME_PONG) {
        /* Pong 프레임: 무시 */
        fprintf(stderr, "[ws] Pong received\n");
      }

      /* 프레임 정리 */
      ws_frame_destroy(frame);

      /* 버퍼 오프셋 업데이트 */
      offset += bytes_consumed;
    }

    /* 처리된 데이터를 버퍼 앞으로 이동 */
    if (offset > 0) {
      if (offset < socket->recv_buf_len) {
        memmove(socket->recv_buf, socket->recv_buf + offset, socket->recv_buf_len - offset);
      }
      socket->recv_buf_len -= offset;
    }

    /* 메시지 펌프 시작 */
    if (socket->head && !uv_is_active((uv_handle_t *)&socket->idle_handle)) {
      uv_idle_start(&socket->idle_handle, ws_idle_cb);
    }
  }

  if (buf->base) free(buf->base);
}

/* alloc_cb: 수신 버퍼 할당 */
static void ws_alloc_cb(uv_handle_t *handle, size_t suggested_size, uv_buf_t *buf) {
  buf->base = malloc(suggested_size);
  buf->len = suggested_size;
}

/* connect_cb: 클라이언트 TCP 연결 완료 */
static void ws_connect_cb(uv_connect_t *req, int status) {
  fl_ws_socket_t *socket = (fl_ws_socket_t *)req->data;

  if (status < 0) {
    fprintf(stderr, "[ws] Connect error: %s\n", uv_strerror(status));
    if (socket->on_error_cb >= 0) {
      freelang_enqueue_callback(socket->ctx, socket->on_error_cb, NULL);
    }
    free(req);
    return;
  }

  fprintf(stderr, "[ws] Client connected\n");

  /* HTTP Upgrade 요청 전송 */
  const char *upgrade_req =
    "GET / HTTP/1.1\r\n"
    "Host: localhost\r\n"
    "Upgrade: websocket\r\n"
    "Connection: Upgrade\r\n"
    "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n"
    "Sec-WebSocket-Version: 13\r\n\r\n";

  uv_buf_t buf = uv_buf_init((char *)upgrade_req, strlen(upgrade_req));
  uv_write_t *write_req = malloc(sizeof(uv_write_t));
  uv_write(write_req, (uv_stream_t *)&socket->tcp, &buf, 1, NULL);

  socket->state = WS_STATE_HANDSHAKE;

  /* 수신 시작 */
  uv_read_start((uv_stream_t *)&socket->tcp, ws_alloc_cb, ws_read_cb);

  free(req);
}

/* connection_cb: 서버 새 연결 도착 */
static void ws_connection_cb(uv_stream_t *server, int status) {
  fl_ws_server_t *srv = (fl_ws_server_t *)server->data;

  if (status < 0) {
    fprintf(stderr, "[ws] Connection error: %s\n", uv_strerror(status));
    return;
  }

  /* 새 소켓 생성 */
  fl_ws_socket_t *socket = calloc(1, sizeof(fl_ws_socket_t));
  if (!socket) return;

  socket->loop = srv->ctx ? NULL : uv_default_loop();
  socket->ctx = srv->ctx;
  socket->state = WS_STATE_HANDSHAKE;
  socket->is_client = 0;
  socket->on_msg_cb = -1;
  socket->on_close_cb = -1;
  socket->on_error_cb = -1;
  socket->on_open_cb = -1;

  /* libuv TCP 초기화 */
  uv_tcp_init(socket->loop, &socket->tcp);
  socket->tcp.data = socket;

  uv_idle_init(socket->loop, &socket->idle_handle);
  socket->idle_handle.data = socket;

  int id = socket_alloc_id(socket);
  socket->id = id;

  fprintf(stderr, "[ws] New connection: socket=%d\n", id);

  /* TCP accept */
  if (uv_accept(server, (uv_stream_t *)&socket->tcp) == 0) {
    /* HTTP Upgrade 응답 전송 */
    const char *upgrade_resp =
      "HTTP/1.1 101 Switching Protocols\r\n"
      "Upgrade: websocket\r\n"
      "Connection: Upgrade\r\n"
      "Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=\r\n\r\n";

    uv_buf_t buf = uv_buf_init((char *)upgrade_resp, strlen(upgrade_resp));
    uv_write_t *write_req = malloc(sizeof(uv_write_t));
    uv_write(write_req, (uv_stream_t *)&socket->tcp, &buf, 1, NULL);

    socket->handshake_done = 1;
    socket->state = WS_STATE_OPEN;

    /* 수신 시작 */
    uv_read_start((uv_stream_t *)&socket->tcp, ws_alloc_cb, ws_read_cb);

    fprintf(stderr, "[ws] Handshake sent, ready for frames\n");
  } else {
    fprintf(stderr, "[ws] Accept failed\n");
    socket_free_id(id);
    free(socket);
  }
}

/* ===== WebSocket Server API ===== */

int fl_ws_server_create(int port, int callback_id) {
  fl_ws_server_t *server = calloc(1, sizeof(fl_ws_server_t));
  if (!server) return -1;

  server->port = port;
  server->on_connection_cb = callback_id;
  server->state = WS_STATE_CLOSED;
  server->destroyed = 0;
  server->ctx = NULL;  /* TODO: get from global context */

  int id = server_alloc_id(server);
  if (id < 0) {
    free(server);
    return -1;
  }

  server->id = id;
  fprintf(stderr, "[ws] Server created: id=%d, port=%d\n", id, port);

  return id;
}

int fl_ws_server_listen(int server_id, int callback_id) {
  fl_ws_server_t *server = server_get(server_id);
  if (!server || server->destroyed) return -1;

  uv_loop_t *loop = uv_default_loop();
  uv_tcp_init(loop, (uv_tcp_t *)&server->tcp);
  ((uv_tcp_t *)&server->tcp)->data = server;

  struct sockaddr_in addr;
  uv_ip4_addr("0.0.0.0", server->port, &addr);

  int ret = uv_tcp_bind((uv_tcp_t *)&server->tcp, (struct sockaddr *)&addr, 0);
  if (ret < 0) {
    fprintf(stderr, "[ws] Bind failed: %s\n", uv_strerror(ret));
    return -1;
  }

  ret = uv_listen((uv_stream_t *)&server->tcp, 128, ws_connection_cb);
  if (ret < 0) {
    fprintf(stderr, "[ws] Listen failed: %s\n", uv_strerror(ret));
    return -1;
  }

  server->state = WS_STATE_OPEN;
  fprintf(stderr, "[ws] Server listening: port=%d\n", server->port);

  return 0;
}

int fl_ws_server_close(int server_id, int callback_id) {
  fl_ws_server_t *server = server_get(server_id);
  if (!server) return -1;

  if (!server->destroyed) {
    server->destroyed = 1;
    server->state = WS_STATE_CLOSED;
    /* TODO: uv_close() TCP handle */
    free(server);
    server_free_id(server_id);
    fprintf(stderr, "[ws] Server closed: id=%d\n", server_id);
  }

  return 0;
}

/* ===== WebSocket Frame Encoding (RFC 6455 - Server to Client) ===== */

/* Encode and send a WebSocket frame (unmasked, server→client) */
static int ws_send_frame(fl_ws_socket_t *socket, const char *data, size_t len,
                         fl_ws_frame_type_t opcode) {
  if (!socket || !data) return -1;

  /* Calculate frame size */
  size_t frame_size = 2 + len;  /* FIN+opcode + length + payload */
  if (len >= 126) frame_size += 2;
  if (len >= 65536) frame_size += 6;

  uint8_t *frame = (uint8_t *)malloc(frame_size);
  if (!frame) return -1;

  /* Byte 1: FIN (1) + RSV (3) + Opcode (4) */
  frame[0] = 0x80 | opcode;  /* FIN=1, opcode */

  /* Bytes 2+: MASK (0 for server) + Payload length */
  uint8_t *pos = frame + 1;
  if (len < 126) {
    pos[0] = len & 0x7F;  /* MASK=0, length 7 bits */
    pos += 1;
  } else if (len < 65536) {
    pos[0] = 126;  /* Extended 16-bit length */
    pos[1] = (len >> 8) & 0xFF;
    pos[2] = len & 0xFF;
    pos += 3;
  } else {
    pos[0] = 127;  /* Extended 64-bit length */
    for (int i = 0; i < 8; i++) {
      pos[1 + i] = (len >> (8 * (7 - i))) & 0xFF;
    }
    pos += 9;
  }

  /* Copy payload */
  memcpy(pos, data, len);

  /* Send frame */
  uv_buf_t buf = uv_buf_init((char *)frame, frame_size);
  uv_write_t *write_req = malloc(sizeof(uv_write_t));
  write_req->data = frame;  /* Store for cleanup in write_cb */
  uv_write(write_req, (uv_stream_t *)&socket->tcp, &buf, 1, NULL);

  fprintf(stderr, "[ws] Frame sent: len=%zu, opcode=%d\n", len, opcode);

  return 0;
}

/* ===== WebSocket Socket API ===== */

int fl_ws_send(int socket_id, const char *message, int callback_id) {
  fl_ws_socket_t *socket = socket_get(socket_id);
  if (!socket || socket->destroyed) return -1;

  if (socket->state != WS_STATE_OPEN) return -1;

  /* RFC 6455 프레임 인코딩 + 전송 (서버→클라이언트는 unmasked) */
  return ws_send_frame(socket, message, strlen(message), FL_WS_FRAME_TEXT);
}

int fl_ws_close(int socket_id) {
  fl_ws_socket_t *socket = socket_get(socket_id);
  if (!socket || socket->destroyed) return -1;

  socket->state = WS_STATE_CLOSING;
  fprintf(stderr, "[ws] Close: socket=%d\n", socket_id);

  /* TODO: RFC 6455 close 프레임 전송 */
  return 0;
}

int fl_ws_on_message(int socket_id, int callback_id) {
  fl_ws_socket_t *socket = socket_get(socket_id);
  if (!socket) return -1;

  socket->on_msg_cb = callback_id;
  fprintf(stderr, "[ws] on_message registered: socket=%d, cb=%d\n", socket_id, callback_id);
  return 0;
}

int fl_ws_on_close(int socket_id, int callback_id) {
  fl_ws_socket_t *socket = socket_get(socket_id);
  if (!socket) return -1;

  socket->on_close_cb = callback_id;
  return 0;
}

int fl_ws_on_error(int socket_id, int callback_id) {
  fl_ws_socket_t *socket = socket_get(socket_id);
  if (!socket) return -1;

  socket->on_error_cb = callback_id;
  return 0;
}

/* ===== URL Parsing Helper ===== */

typedef struct {
  char *host;
  int port;
  char *path;
} ws_url_t;

/* Simple WS URL parser: ws://host:port/path */
static ws_url_t* ws_parse_url(const char *url) {
  if (!url) return NULL;

  ws_url_t *parsed = malloc(sizeof(ws_url_t));
  if (!parsed) return NULL;

  memset(parsed, 0, sizeof(ws_url_t));

  /* Skip "ws://" or "wss://" */
  const char *ptr = url;
  if (strncmp(ptr, "wss://", 6) == 0) {
    ptr += 6;
  } else if (strncmp(ptr, "ws://", 5) == 0) {
    ptr += 5;
  } else {
    free(parsed);
    return NULL;
  }

  /* Extract host:port */
  const char *colon = strchr(ptr, ':');
  const char *slash = strchr(ptr, '/');

  if (!slash) slash = ptr + strlen(ptr);

  if (colon && colon < slash) {
    /* host:port format */
    size_t host_len = colon - ptr;
    parsed->host = malloc(host_len + 1);
    strncpy(parsed->host, ptr, host_len);
    parsed->host[host_len] = '\0';

    /* Parse port */
    parsed->port = atoi(colon + 1);
  } else {
    /* host only (use default port 80) */
    size_t host_len = slash - ptr;
    parsed->host = malloc(host_len + 1);
    strncpy(parsed->host, ptr, host_len);
    parsed->host[host_len] = '\0';
    parsed->port = 80;
  }

  /* Extract path (default: "/") */
  if (*slash == '\0') {
    parsed->path = malloc(2);
    strcpy(parsed->path, "/");
  } else {
    parsed->path = malloc(strlen(slash) + 1);
    strcpy(parsed->path, slash);
  }

  return parsed;
}

static void ws_url_free(ws_url_t *parsed) {
  if (!parsed) return;
  if (parsed->host) free(parsed->host);
  if (parsed->path) free(parsed->path);
  free(parsed);
}

/* ===== WebSocket Client API ===== */

int fl_ws_client_connect(const char *url, int callback_id) {
  fl_ws_socket_t *socket = calloc(1, sizeof(fl_ws_socket_t));
  if (!socket) return -1;

  socket->url = malloc(strlen(url) + 1);
  if (!socket->url) {
    free(socket);
    return -1;
  }
  strcpy(socket->url, url);

  socket->state = WS_STATE_CONNECTING;
  socket->is_client = 1;
  socket->loop = uv_default_loop();
  socket->ctx = NULL;
  socket->on_open_cb = callback_id;
  socket->on_msg_cb = -1;
  socket->on_close_cb = -1;
  socket->on_error_cb = -1;
  socket->destroyed = 0;

  /* libuv TCP 초기화 */
  uv_tcp_init(socket->loop, &socket->tcp);
  socket->tcp.data = socket;

  uv_idle_init(socket->loop, &socket->idle_handle);
  socket->idle_handle.data = socket;

  int id = socket_alloc_id(socket);
  if (id < 0) {
    free(socket->url);
    free(socket);
    return -1;
  }

  socket->id = id;
  fprintf(stderr, "[ws] Client connecting: id=%d, url=%s\n", id, url);

  /* URL 파싱 (ws://host:port/path) */
  ws_url_t *parsed = ws_parse_url(url);
  if (!parsed) {
    fprintf(stderr, "[ws] Invalid URL format\n");
    socket_free_id(id);
    free(socket->url);
    free(socket);
    return -1;
  }

  fprintf(stderr, "[ws] Parsed URL: host=%s, port=%d, path=%s\n",
          parsed->host, parsed->port, parsed->path);

  /* TCP connect to host:port */
  struct sockaddr_in addr;
  uv_ip4_addr(parsed->host, parsed->port, &addr);

  uv_connect_t *req = malloc(sizeof(uv_connect_t));
  req->data = socket;

  int ret = uv_tcp_connect(req, &socket->tcp, (struct sockaddr *)&addr, ws_connect_cb);
  if (ret < 0) {
    fprintf(stderr, "[ws] Connect failed: %s\n", uv_strerror(ret));
    socket_free_id(id);
    free(socket->url);
    free(socket);
    free(req);
    ws_url_free(parsed);
    return -1;
  }

  ws_url_free(parsed);
  return id;
}

/* RFC 6455 Client→Server masked frame */
static int ws_send_masked_frame(fl_ws_socket_t *socket, const char *data, size_t len,
                                fl_ws_frame_type_t opcode) {
  if (!socket || !data) return -1;

  /* Calculate frame size: FIN+opcode + MASK+length + mask_key(4) + payload */
  size_t frame_size = 2 + 4 + len;  /* min size with mask */
  if (len >= 126) frame_size += 2;
  if (len >= 65536) frame_size += 6;

  uint8_t *frame = (uint8_t *)malloc(frame_size);
  if (!frame) return -1;

  /* Random mask key (should be crypto-random, but for demo use time-based) */
  uint8_t mask_key[4];
  mask_key[0] = (rand() >> 0) & 0xFF;
  mask_key[1] = (rand() >> 8) & 0xFF;
  mask_key[2] = (rand() >> 16) & 0xFF;
  mask_key[3] = (rand() >> 24) & 0xFF;

  /* Byte 0: FIN (1) + RSV (3) + Opcode (4) */
  frame[0] = 0x80 | opcode;

  /* Bytes 1+: MASK (1) + Payload length (7 bits, extended as needed) */
  uint8_t *pos = frame + 1;
  if (len < 126) {
    pos[0] = 0x80 | (len & 0x7F);  /* MASK=1, length */
    pos += 1;
  } else if (len < 65536) {
    pos[0] = 0x80 | 126;  /* MASK=1, extended 16-bit */
    pos[1] = (len >> 8) & 0xFF;
    pos[2] = len & 0xFF;
    pos += 3;
  } else {
    pos[0] = 0x80 | 127;  /* MASK=1, extended 64-bit */
    for (int i = 0; i < 8; i++) {
      pos[1 + i] = (len >> (8 * (7 - i))) & 0xFF;
    }
    pos += 9;
  }

  /* Copy mask key */
  memcpy(pos, mask_key, 4);
  pos += 4;

  /* Copy and mask payload */
  for (size_t i = 0; i < len; i++) {
    pos[i] = ((uint8_t *)data)[i] ^ mask_key[i % 4];
  }

  /* Send frame */
  uv_buf_t buf = uv_buf_init((char *)frame, frame_size);
  uv_write_t *write_req = malloc(sizeof(uv_write_t));
  write_req->data = frame;
  uv_write(write_req, (uv_stream_t *)&socket->tcp, &buf, 1, NULL);

  fprintf(stderr, "[ws] Masked frame sent: len=%zu, opcode=%d\n", len, opcode);

  return 0;
}

int fl_ws_client_send(int socket_id, const char *message, int callback_id) {
  fl_ws_socket_t *socket = socket_get(socket_id);
  if (!socket || socket->destroyed) return -1;

  if (socket->state != WS_STATE_OPEN) return -1;

  /* RFC 6455 클라이언트→서버 마스킹된 프레임 전송 */
  return ws_send_masked_frame(socket, message, strlen(message), FL_WS_FRAME_TEXT);
}

int fl_ws_client_close(int socket_id, int callback_id) {
  fl_ws_socket_t *socket = socket_get(socket_id);
  if (!socket || socket->destroyed) return -1;

  socket->state = WS_STATE_CLOSING;
  fprintf(stderr, "[ws] Client close: socket=%d\n", socket_id);

  return 0;
}

int fl_ws_client_on_message(int socket_id, int callback_id) {
  fl_ws_socket_t *socket = socket_get(socket_id);
  if (!socket) return -1;

  socket->on_msg_cb = callback_id;
  return 0;
}

int fl_ws_client_on_close(int socket_id, int callback_id) {
  fl_ws_socket_t *socket = socket_get(socket_id);
  if (!socket) return -1;

  socket->on_close_cb = callback_id;
  return 0;
}

int fl_ws_client_on_error(int socket_id, int callback_id) {
  fl_ws_socket_t *socket = socket_get(socket_id);
  if (!socket) return -1;

  socket->on_error_cb = callback_id;
  return 0;
}

int fl_ws_client_on_open(int socket_id, int callback_id) {
  fl_ws_socket_t *socket = socket_get(socket_id);
  if (!socket) return -1;

  socket->on_open_cb = callback_id;
  return 0;
}

/* ===== Info ===== */

void fl_ws_info(void) {
  fprintf(stderr, "[ws] WebSocket module initialized (libuv integrated)\n");
  fprintf(stderr, "[ws] Max servers: %d, Max sockets: %d\n", MAX_SERVERS, MAX_SOCKETS);
}
