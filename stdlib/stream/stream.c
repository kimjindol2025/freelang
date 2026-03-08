/**
 * FreeLang Stream Module (Phase 16 Week 4)
 * Streaming APIs with libuv integration
 * Readable, Writable, and Transform streams
 *
 * 구현 방식:
 * - uv_idle_t 기반 메모리 스트림 (OS FIFO 아님)
 * - 청크 링크드 리스트로 데이터 버퍼링
 * - write() → 청크 추가 → uv_idle_cb에서 on_data_cb 호출
 * - freelang_enqueue_callback()으로 FreeLang VM 콜백 큐에 등록
 */

#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <uv.h>
#include "../ffi/freelang_ffi.h"

/* ===== Constants ===== */

#define MAX_STREAMS 1024

/* ===== Stream Types ===== */

typedef enum {
  STREAM_TYPE_READABLE,
  STREAM_TYPE_WRITABLE,
  STREAM_TYPE_TRANSFORM
} stream_type_t;

/* ===== Chunk Node (LinkedList) ===== */

typedef struct chunk_node {
  char *data;
  size_t size;
  struct chunk_node *next;
} chunk_node_t;

/* ===== Internal Structures ===== */

typedef struct {
  int id;
  stream_type_t type;

  /* libuv */
  uv_idle_t idle_handle;
  uv_loop_t *loop;
  fl_event_context_t *ctx;

  /* Chunk queue (linked list) */
  chunk_node_t *head;
  chunk_node_t *tail;

  /* Configuration */
  int high_water_mark;
  int paused;
  int ended;
  int write_ended;
  int destroyed;

  /* Callback IDs (-1 = not registered) */
  int on_data_cb;
  int on_end_cb;
  int on_error_cb;
  int on_close_cb;
  int on_drain_cb;
  int on_finish_cb;
  int transform_fn_cb;
} fl_stream_t;

/* ===== Global State ===== */

static fl_stream_t *stream_table[MAX_STREAMS] = {NULL};
static int next_stream_id = 1;

/* ===== Helper Functions ===== */

static int stream_alloc_id(fl_stream_t *stream) {
  if (next_stream_id >= MAX_STREAMS) {
    return -1;
  }
  int id = next_stream_id++;
  stream_table[id] = stream;
  return id;
}

static fl_stream_t* stream_get(int id) {
  if (id <= 0 || id >= MAX_STREAMS) {
    return NULL;
  }
  return stream_table[id];
}

static void stream_free_id(int id) {
  if (id > 0 && id < MAX_STREAMS) {
    stream_table[id] = NULL;
  }
}

static size_t stream_buffer_size(fl_stream_t *stream) {
  size_t total = 0;
  chunk_node_t *node = stream->head;
  while (node) {
    total += node->size;
    node = node->next;
  }
  return total;
}

/* ===== libuv Idle Callback (핵심) ===== */

static void stream_idle_cb(uv_idle_t *handle) {
  fl_stream_t *stream = (fl_stream_t *)handle->data;

  if (!stream || stream->paused || stream->destroyed) {
    return;
  }

  if (!stream->head) {
    /* 큐 비었으면 → ended 확인 */
    if (stream->ended && stream->on_end_cb >= 0) {
      fprintf(stderr, "[stream] Calling on_end callback: id=%d\n", stream->on_end_cb);
      freelang_enqueue_callback(stream->ctx, stream->on_end_cb, NULL);
      stream->on_end_cb = -1;
    }
    uv_idle_stop(handle);
    return;
  }

  /* 청크 꺼내기 */
  chunk_node_t *node = stream->head;
  stream->head = node->next;
  if (!stream->head) {
    stream->tail = NULL;
  }

  /* FreeLang VM 콜백 큐에 등록 */
  if (stream->on_data_cb >= 0) {
    fprintf(stderr, "[stream] Enqueue data callback: id=%d, data_len=%zu\n",
            stream->on_data_cb, node->size);
    freelang_enqueue_callback(stream->ctx, stream->on_data_cb, node->data);
  } else {
    fprintf(stderr, "[stream] No data callback registered\n");
    free(node->data);
  }
  free(node);
}

/* ===== Readable Stream ===== */

int fl_stream_readable_create(int high_water_mark) {
  fl_stream_t *stream = calloc(1, sizeof(fl_stream_t));
  if (!stream) return -1;

  stream->type = STREAM_TYPE_READABLE;
  stream->high_water_mark = (high_water_mark <= 0) ? 16384 : high_water_mark;
  stream->paused = 0;
  stream->ended = 0;
  stream->destroyed = 0;

  /* Callback IDs: -1 = not registered */
  stream->on_data_cb = -1;
  stream->on_end_cb = -1;
  stream->on_error_cb = -1;
  stream->on_close_cb = -1;
  stream->on_drain_cb = -1;
  stream->on_finish_cb = -1;

  /* libuv idle handle 초기화 */
  stream->loop = uv_default_loop();
  stream->ctx = NULL;  /* TODO: context from global state */

  int ret = uv_idle_init(stream->loop, &stream->idle_handle);
  if (ret < 0) {
    fprintf(stderr, "[stream] uv_idle_init failed: %d\n", ret);
    free(stream);
    return -1;
  }
  stream->idle_handle.data = stream;

  int id = stream_alloc_id(stream);
  if (id < 0) {
    free(stream);
    return -1;
  }

  stream->id = id;
  fprintf(stderr, "[stream] Readable stream created: id=%d, high_water=%d\n",
          id, stream->high_water_mark);

  return id;
}

int fl_stream_readable_read(int stream_id, int size, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream || stream->destroyed) return -1;

  /* Stub: read() does not actually read from system */
  size_t available = stream_buffer_size(stream);
  if (available == 0) {
    return 0;
  }

  size_t read_size = (size <= 0) ? available :
                     (size > (int)available) ? available : size;

  fprintf(stderr, "[stream] Read requested: size=%d, available=%zu\n",
          size, available);

  return (int)read_size;
}

int fl_stream_readable_resume(int stream_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream || stream->destroyed) return -1;

  stream->paused = 0;

  /* Restart idle callback if there's pending data */
  if (stream->head && !uv_is_active((uv_handle_t *)&stream->idle_handle)) {
    uv_idle_start(&stream->idle_handle, stream_idle_cb);
  }

  fprintf(stderr, "[stream] Readable resumed: id=%d\n", stream_id);
  return 0;
}

int fl_stream_readable_pause(int stream_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream || stream->destroyed) return -1;

  stream->paused = 1;
  fprintf(stderr, "[stream] Readable paused: id=%d\n", stream_id);
  return 0;
}

int fl_stream_readable_pipe(int readable_id, int writable_id, int callback_id) {
  fl_stream_t *readable = stream_get(readable_id);
  fl_stream_t *writable = stream_get(writable_id);

  if (!readable || !writable || readable->destroyed || writable->destroyed) {
    return -1;
  }

  /* TODO: Connect readable → writable chunk queue */
  fprintf(stderr, "[stream] Pipe: readable=%d -> writable=%d\n",
          readable_id, writable_id);

  return 0;
}

int fl_stream_readable_on_data(int stream_id, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream) return -1;

  stream->on_data_cb = callback_id;
  fprintf(stderr, "[stream] on_data registered: stream=%d, cb=%d\n",
          stream_id, callback_id);
  return 0;
}

int fl_stream_readable_on_end(int stream_id, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream) return -1;

  stream->on_end_cb = callback_id;
  return 0;
}

int fl_stream_readable_on_error(int stream_id, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream) return -1;

  stream->on_error_cb = callback_id;
  return 0;
}

int fl_stream_readable_on_close(int stream_id, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream) return -1;

  stream->on_close_cb = callback_id;
  return 0;
}

int fl_stream_readable_destroy(int stream_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream || stream->destroyed) return -1;

  stream->destroyed = 1;

  /* Stop idle callback */
  if (uv_is_active((uv_handle_t *)&stream->idle_handle)) {
    uv_idle_stop(&stream->idle_handle);
  }

  /* Free remaining chunks */
  chunk_node_t *node = stream->head;
  while (node) {
    chunk_node_t *next = node->next;
    free(node->data);
    free(node);
    node = next;
  }

  stream_free_id(stream_id);
  free(stream);
  fprintf(stderr, "[stream] Readable destroyed: id=%d\n", stream_id);

  return 0;
}

/* ===== Writable Stream ===== */

int fl_stream_writable_create(int high_water_mark) {
  fl_stream_t *stream = calloc(1, sizeof(fl_stream_t));
  if (!stream) return -1;

  stream->type = STREAM_TYPE_WRITABLE;
  stream->high_water_mark = (high_water_mark <= 0) ? 16384 : high_water_mark;
  stream->paused = 0;
  stream->ended = 0;
  stream->destroyed = 0;

  /* Callback IDs */
  stream->on_data_cb = -1;
  stream->on_end_cb = -1;
  stream->on_error_cb = -1;
  stream->on_close_cb = -1;
  stream->on_drain_cb = -1;
  stream->on_finish_cb = -1;

  /* libuv */
  stream->loop = uv_default_loop();
  stream->ctx = NULL;

  int ret = uv_idle_init(stream->loop, &stream->idle_handle);
  if (ret < 0) {
    free(stream);
    return -1;
  }
  stream->idle_handle.data = stream;

  int id = stream_alloc_id(stream);
  if (id < 0) {
    free(stream);
    return -1;
  }

  stream->id = id;
  fprintf(stderr, "[stream] Writable stream created: id=%d\n", id);

  return id;
}

int fl_stream_writable_write(int stream_id, const char *chunk,
                              const char *encoding, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream || stream->destroyed || stream->write_ended) {
    return -1;
  }

  if (!chunk) {
    return -1;
  }

  /* 청크를 링크드 리스트에 추가 */
  chunk_node_t *node = malloc(sizeof(chunk_node_t));
  if (!node) return -1;

  node->size = strlen(chunk);
  node->data = malloc(node->size + 1);
  if (!node->data) {
    free(node);
    return -1;
  }

  memcpy(node->data, chunk, node->size + 1);
  node->next = NULL;

  if (!stream->tail) {
    stream->head = stream->tail = node;
  } else {
    stream->tail->next = node;
    stream->tail = node;
  }

  /* Activate idle callback if not already active */
  if (!uv_is_active((uv_handle_t *)&stream->idle_handle)) {
    int ret = uv_idle_start(&stream->idle_handle, stream_idle_cb);
    if (ret < 0) {
      fprintf(stderr, "[stream] uv_idle_start failed: %d\n", ret);
      return -1;
    }
  }

  /* Check high water mark */
  size_t buffered = stream_buffer_size(stream);
  int should_drain = (buffered >= (size_t)stream->high_water_mark) ? 1 : 0;

  fprintf(stderr, "[stream] Write: buffered=%zu, high_water=%d, drain=%d\n",
          buffered, stream->high_water_mark, should_drain);

  return should_drain;
}

int fl_stream_writable_end(int stream_id, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream || stream->destroyed) return -1;

  stream->write_ended = 1;
  stream->ended = 1;

  fprintf(stderr, "[stream] Writable ended: id=%d\n", stream_id);

  /* TODO: Call finish callback when all chunks flushed */
  return 0;
}

int fl_stream_writable_on_drain(int stream_id, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream) return -1;

  stream->on_drain_cb = callback_id;
  return 0;
}

int fl_stream_writable_on_finish(int stream_id, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream) return -1;

  stream->on_finish_cb = callback_id;
  return 0;
}

int fl_stream_writable_on_error(int stream_id, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream) return -1;

  stream->on_error_cb = callback_id;
  return 0;
}

int fl_stream_writable_on_close(int stream_id, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream) return -1;

  stream->on_close_cb = callback_id;
  return 0;
}

int fl_stream_writable_destroy(int stream_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream || stream->destroyed) return -1;

  stream->destroyed = 1;

  if (uv_is_active((uv_handle_t *)&stream->idle_handle)) {
    uv_idle_stop(&stream->idle_handle);
  }

  chunk_node_t *node = stream->head;
  while (node) {
    chunk_node_t *next = node->next;
    free(node->data);
    free(node);
    node = next;
  }

  stream_free_id(stream_id);
  free(stream);
  fprintf(stderr, "[stream] Writable destroyed: id=%d\n", stream_id);

  return 0;
}

/* ===== Transform Stream ===== */

int fl_stream_transform_create(int high_water_mark, int transform_fn_cb) {
  fl_stream_t *stream = calloc(1, sizeof(fl_stream_t));
  if (!stream) return -1;

  stream->type = STREAM_TYPE_TRANSFORM;
  stream->high_water_mark = (high_water_mark <= 0) ? 16384 : high_water_mark;
  stream->transform_fn_cb = transform_fn_cb;
  stream->destroyed = 0;

  stream->on_data_cb = -1;
  stream->on_end_cb = -1;
  stream->on_error_cb = -1;
  stream->on_close_cb = -1;

  stream->loop = uv_default_loop();
  stream->ctx = NULL;

  int ret = uv_idle_init(stream->loop, &stream->idle_handle);
  if (ret < 0) {
    free(stream);
    return -1;
  }
  stream->idle_handle.data = stream;

  int id = stream_alloc_id(stream);
  if (id < 0) {
    free(stream);
    return -1;
  }

  stream->id = id;
  fprintf(stderr, "[stream] Transform stream created: id=%d\n", id);

  return id;
}

int fl_stream_transform_write(int stream_id, const char *chunk, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream || stream->destroyed || stream->write_ended) {
    return -1;
  }

  /* TODO: Call transform_fn_cb(chunk) and push result to output */
  fprintf(stderr, "[stream] Transform write: %zu bytes\n", strlen(chunk));

  return 0;
}

int fl_stream_transform_end(int stream_id, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream || stream->destroyed) return -1;

  stream->write_ended = 1;
  stream->ended = 1;

  fprintf(stderr, "[stream] Transform ended: id=%d\n", stream_id);

  /* TODO: Flush remaining transformed data */
  return 0;
}

/* ===== Info ===== */

void fl_stream_info(void) {
  fprintf(stderr, "[stream] Stream module initialized (libuv integrated)\n");
  fprintf(stderr, "[stream] Max streams: %d\n", MAX_STREAMS);
  fprintf(stderr, "[stream] Using uv_idle_t for async chunk pump\n");
}
