/**
 * WebSocket RFC 6455 Frame Parsing Test
 *
 * Tests:
 *  - Frame structure parsing (header + masking key + payload)
 *  - XOR unmasking
 *  - Frame type handling
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

/* ===== Frame Types ===== */
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

/* Forward-declare frame functions (from ws.c) */
extern fl_ws_frame_t* ws_frame_parse(const uint8_t *buffer, size_t buffer_len,
                                     size_t *bytes_consumed);
extern int ws_frame_unmask(fl_ws_frame_t *frame);
extern void ws_frame_destroy(fl_ws_frame_t *frame);

/* ===== Test Utilities ===== */

static int test_count = 0;
static int pass_count = 0;
static int fail_count = 0;

#define TEST(name) \
  do { \
    test_count++; \
    printf("\n[Test %d] %s\n", test_count, name); \
  } while(0)

#define ASSERT(cond, msg) \
  do { \
    if (cond) { \
      pass_count++; \
      printf("  ✓ %s\n", msg); \
    } else { \
      fail_count++; \
      printf("  ✗ %s\n", msg); \
    } \
  } while(0)

/* ===== Test Cases ===== */

void test_text_frame_parsing() {
  TEST("TEXT frame parsing (unmasked server→client)");

  // RFC 6455 Example: server sends "Hello"
  // Frame: [FIN=1, opcode=1] [len=5] [payload="Hello"]
  uint8_t frame_data[] = {
    0x81,              // FIN=1, opcode=TEXT(1)
    0x05,              // No mask, len=5
    'H', 'e', 'l', 'l', 'o'
  };

  size_t consumed = 0;
  fl_ws_frame_t *frame = ws_frame_parse(frame_data, sizeof(frame_data), &consumed);

  ASSERT(frame != NULL, "Frame parsed successfully");
  ASSERT(frame->fin == 1, "FIN flag set");
  ASSERT(frame->opcode == FL_WS_FRAME_TEXT, "Opcode is TEXT");
  ASSERT(frame->masked == 0, "Not masked");
  ASSERT(frame->payload_len == 5, "Payload length is 5");
  ASSERT(consumed == 7, "Bytes consumed correct");
  ASSERT(frame->payload != NULL, "Payload allocated");
  ASSERT(strncmp((char*)frame->payload, "Hello", 5) == 0, "Payload matches");

  if (frame) ws_frame_destroy(frame);
}

void test_masked_frame_parsing() {
  TEST("Masked frame parsing (client→server with masking)");

  // RFC 6455 Example: client sends masked "Hi"
  // Binary: [0x81] [0x82] [MASK_KEY(4)] [DATA_MASKED(2)]

  uint8_t mask_key[] = {0x37, 0xfa, 0x21, 0x3d};
  uint8_t original[] = {'H', 'i'};
  uint8_t masked[] = {
    (uint8_t)(original[0] ^ mask_key[0]),
    (uint8_t)(original[1] ^ mask_key[1])
  };

  uint8_t frame_data[] = {
    0x81,                              // FIN=1, opcode=TEXT
    0x82,                              // MASK=1, len=2
    mask_key[0], mask_key[1], mask_key[2], mask_key[3],  // Mask key
    masked[0], masked[1]               // Masked payload
  };

  size_t consumed = 0;
  fl_ws_frame_t *frame = ws_frame_parse(frame_data, sizeof(frame_data), &consumed);

  ASSERT(frame != NULL, "Masked frame parsed");
  ASSERT(frame->masked == 1, "MASK flag set");
  ASSERT(frame->mask_key != NULL, "Mask key extracted");
  ASSERT(memcmp(frame->mask_key, mask_key, 4) == 0, "Mask key matches");
  ASSERT(frame->payload_len == 2, "Payload length is 2");
  ASSERT(consumed == 8, "Bytes consumed (2 + 4 + 2)");

  // Unmask
  int unmask_result = ws_frame_unmask(frame);
  ASSERT(unmask_result == 0, "Unmasking succeeded");
  ASSERT(memcmp(frame->payload, original, 2) == 0, "Unmasked payload matches original");

  if (frame) ws_frame_destroy(frame);
}

void test_extended_payload_length() {
  TEST("Extended payload length (126 → 16-bit length)");

  // Frame with 200-byte payload
  // Binary: [0x81] [0x7e 0x00 0xc8] [200 bytes payload]
  uint8_t frame_data[207];
  frame_data[0] = 0x81;              // FIN=1, opcode=TEXT
  frame_data[1] = 0x7e;              // len=126 (extended)
  frame_data[2] = 0x00;              // high byte
  frame_data[3] = 200;               // low byte (200 = 0xc8)

  // Fill payload
  for (int i = 0; i < 200; i++) {
    frame_data[4 + i] = (uint8_t)i;
  }

  size_t consumed = 0;
  fl_ws_frame_t *frame = ws_frame_parse(frame_data, sizeof(frame_data), &consumed);

  ASSERT(frame != NULL, "Extended length frame parsed");
  ASSERT(frame->payload_len == 200, "Extended payload length correct");
  ASSERT(consumed == 204, "Bytes consumed (4 header + 200 payload)");

  if (frame) ws_frame_destroy(frame);
}

void test_close_frame() {
  TEST("CLOSE frame handling");

  // RFC 6455: Close frame
  // Binary: [0x88] [0x00] = FIN=1, opcode=CLOSE, no payload
  uint8_t frame_data[] = {0x88, 0x00};

  size_t consumed = 0;
  fl_ws_frame_t *frame = ws_frame_parse(frame_data, sizeof(frame_data), &consumed);

  ASSERT(frame != NULL, "Close frame parsed");
  ASSERT(frame->opcode == FL_WS_FRAME_CLOSE, "Opcode is CLOSE");
  ASSERT(frame->fin == 1, "FIN set");
  ASSERT(frame->payload_len == 0, "No payload");
  ASSERT(consumed == 2, "Bytes consumed");

  if (frame) ws_frame_destroy(frame);
}

void test_ping_pong_frames() {
  TEST("PING and PONG frame handling");

  // PING frame: [0x89] [0x00]
  uint8_t ping_data[] = {0x89, 0x00};
  size_t consumed = 0;
  fl_ws_frame_t *ping = ws_frame_parse(ping_data, sizeof(ping_data), &consumed);

  ASSERT(ping != NULL, "PING frame parsed");
  ASSERT(ping->opcode == FL_WS_FRAME_PING, "Opcode is PING");

  // PONG frame: [0x8a] [0x00]
  uint8_t pong_data[] = {0x8a, 0x00};
  consumed = 0;
  fl_ws_frame_t *pong = ws_frame_parse(pong_data, sizeof(pong_data), &consumed);

  ASSERT(pong != NULL, "PONG frame parsed");
  ASSERT(pong->opcode == FL_WS_FRAME_PONG, "Opcode is PONG");

  if (ping) ws_frame_destroy(ping);
  if (pong) ws_frame_destroy(pong);
}

void test_fragmentation() {
  TEST("Fragmented message (multiple frames)");

  // Frame 1: FIN=0, opcode=TEXT, len=3, payload="Hel"
  uint8_t frame1[] = {0x01, 0x03, 'H', 'e', 'l'};

  // Frame 2: FIN=1, opcode=CONTINUATION, len=2, payload="lo"
  uint8_t frame2[] = {0x80, 0x02, 'l', 'o'};

  size_t consumed = 0;
  fl_ws_frame_t *f1 = ws_frame_parse(frame1, sizeof(frame1), &consumed);
  ASSERT(f1 != NULL, "Fragment 1 parsed");
  ASSERT(f1->fin == 0, "Fragment 1: FIN not set");
  ASSERT(f1->opcode == FL_WS_FRAME_TEXT, "Fragment 1: opcode is TEXT");

  consumed = 0;
  fl_ws_frame_t *f2 = ws_frame_parse(frame2, sizeof(frame2), &consumed);
  ASSERT(f2 != NULL, "Fragment 2 parsed");
  ASSERT(f2->fin == 1, "Fragment 2: FIN set");
  ASSERT(f2->opcode == FL_WS_FRAME_CONTINUATION, "Fragment 2: opcode is CONTINUATION");

  if (f1) ws_frame_destroy(f1);
  if (f2) ws_frame_destroy(f2);
}

void test_incomplete_frame() {
  TEST("Incomplete frame handling (return NULL)");

  // Only 1 byte (need at least 2)
  uint8_t incomplete[] = {0x81};

  size_t consumed = 0;
  fl_ws_frame_t *frame = ws_frame_parse(incomplete, sizeof(incomplete), &consumed);

  ASSERT(frame == NULL, "Incomplete frame returns NULL");
}

/* ===== Main ===== */

int main() {
  printf("\n╔════════════════════════════════════════════════╗\n");
  printf("║   WebSocket RFC 6455 Frame Parsing Tests       ║\n");
  printf("╚════════════════════════════════════════════════╝\n");

  test_text_frame_parsing();
  test_masked_frame_parsing();
  test_extended_payload_length();
  test_close_frame();
  test_ping_pong_frames();
  test_fragmentation();
  test_incomplete_frame();

  printf("\n╔════════════════════════════════════════════════╗\n");
  printf("║              Test Summary                      ║\n");
  printf("╠════════════════════════════════════════════════╣\n");
  printf("│ Total:  %d\n", test_count);
  printf("│ Passed: %d ✓\n", pass_count);
  printf("│ Failed: %d ✗\n", fail_count);
  printf("╚════════════════════════════════════════════════╝\n\n");

  return (fail_count == 0) ? 0 : 1;
}
