/**
 * Stream Module Test
 *
 * Tests:
 *  - Stream creation/destruction
 *  - Write/read operations
 *  - Memory safety
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

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

/* ===== Stream Buffer Implementation ===== */

typedef struct {
  char *buffer;
  size_t capacity;
  size_t size;
  int id;
} stream_buffer_t;

stream_buffer_t* stream_create(size_t capacity) {
  stream_buffer_t *s = (stream_buffer_t *)malloc(sizeof(stream_buffer_t));
  if (!s) return NULL;

  s->buffer = (char *)malloc(capacity);
  if (!s->buffer) {
    free(s);
    return NULL;
  }

  s->capacity = capacity;
  s->size = 0;
  s->id = 1;
  return s;
}

int stream_write(stream_buffer_t *s, const char *data, size_t len) {
  if (!s || !data || len == 0) return -1;
  if (s->size + len > s->capacity) return -1;

  memcpy(s->buffer + s->size, data, len);
  s->size += len;
  return len;
}

int stream_read(stream_buffer_t *s, char *buf, size_t len) {
  if (!s || !buf || s->size == 0) return -1;

  size_t to_read = (len < s->size) ? len : s->size;
  memcpy(buf, s->buffer, to_read);

  // Shift remaining data
  if (to_read < s->size) {
    memmove(s->buffer, s->buffer + to_read, s->size - to_read);
  }
  s->size -= to_read;

  return to_read;
}

void stream_destroy(stream_buffer_t *s) {
  if (!s) return;
  if (s->buffer) free(s->buffer);
  free(s);
}

/* ===== Test Cases ===== */

void test_stream_creation() {
  TEST("Stream creation and destruction");

  stream_buffer_t *s = stream_create(256);
  ASSERT(s != NULL, "Stream created");
  ASSERT(s->capacity == 256, "Capacity is 256");
  ASSERT(s->size == 0, "Initial size is 0");
  ASSERT(s->buffer != NULL, "Buffer allocated");

  stream_destroy(s);
  ASSERT(1, "Stream destroyed");
}

void test_stream_write() {
  TEST("Stream write operations");

  stream_buffer_t *s = stream_create(256);
  ASSERT(s != NULL, "Stream created");

  int w1 = stream_write(s, "Hello", 5);
  ASSERT(w1 == 5, "Wrote 5 bytes");
  ASSERT(s->size == 5, "Size is 5");

  int w2 = stream_write(s, " World", 6);
  ASSERT(w2 == 6, "Wrote 6 bytes");
  ASSERT(s->size == 11, "Size is 11");

  stream_destroy(s);
}

void test_stream_read() {
  TEST("Stream read operations");

  stream_buffer_t *s = stream_create(256);
  const char *msg = "TestMessage";

  stream_write(s, msg, strlen(msg));
  ASSERT(s->size == strlen(msg), "Data written");

  char buf[128];
  int r = stream_read(s, buf, sizeof(buf));
  ASSERT(r == strlen(msg), "Read all data");
  ASSERT(memcmp(buf, msg, r) == 0, "Data matches");
  ASSERT(s->size == 0, "Buffer empty after read");

  stream_destroy(s);
}

void test_stream_partial_read() {
  TEST("Stream partial read operations");

  stream_buffer_t *s = stream_create(256);
  stream_write(s, "0123456789", 10);
  ASSERT(s->size == 10, "10 bytes written");

  char buf[128];
  int r1 = stream_read(s, buf, 3);
  ASSERT(r1 == 3, "Read 3 bytes");
  ASSERT(s->size == 7, "7 bytes remaining");
  ASSERT(memcmp(buf, "012", 3) == 0, "First 3 bytes correct");

  int r2 = stream_read(s, buf, 5);
  ASSERT(r2 == 5, "Read 5 bytes");
  ASSERT(s->size == 2, "2 bytes remaining");
  ASSERT(memcmp(buf, "34567", 5) == 0, "Next 5 bytes correct");

  stream_destroy(s);
}

void test_stream_overflow() {
  TEST("Stream buffer overflow prevention");

  stream_buffer_t *s = stream_create(10);
  ASSERT(s != NULL, "Stream created with capacity 10");

  int w1 = stream_write(s, "12345", 5);
  ASSERT(w1 == 5, "Wrote 5 bytes");

  int w2 = stream_write(s, "12345", 5);
  ASSERT(w2 == 5, "Wrote 5 more bytes");

  // Try to overflow
  int w3 = stream_write(s, "extra", 5);
  ASSERT(w3 == -1, "Overflow prevented");

  stream_destroy(s);
}

void test_stream_empty_read() {
  TEST("Stream empty read handling");

  stream_buffer_t *s = stream_create(256);
  ASSERT(s->size == 0, "Buffer is empty");

  char buf[128];
  int r = stream_read(s, buf, sizeof(buf));
  ASSERT(r == -1, "Read from empty returns -1");

  stream_destroy(s);
}

void test_stream_invalid_ops() {
  TEST("Stream invalid operations");

  stream_buffer_t *s = stream_create(256);

  int w1 = stream_write(s, NULL, 10);
  ASSERT(w1 == -1, "Write NULL fails");

  int w2 = stream_write(s, "test", 0);
  ASSERT(w2 == -1, "Write zero length fails");

  int r = stream_read(NULL, NULL, 10);
  ASSERT(r == -1, "Read NULL stream fails");

  stream_destroy(s);
}

/* ===== Main ===== */

int main() {
  printf("\n╔════════════════════════════════════════════════╗\n");
  printf("║         Stream Module Tests                   ║\n");
  printf("╚════════════════════════════════════════════════╝\n");

  test_stream_creation();
  test_stream_write();
  test_stream_read();
  test_stream_partial_read();
  test_stream_overflow();
  test_stream_empty_read();
  test_stream_invalid_ops();

  printf("\n╔════════════════════════════════════════════════╗\n");
  printf("║              Test Summary                      ║\n");
  printf("╠════════════════════════════════════════════════╣\n");
  printf("│ Total:  %d\n", test_count);
  printf("│ Passed: %d ✓\n", pass_count);
  printf("│ Failed: %d ✗\n", fail_count);
  printf("╚════════════════════════════════════════════════╝\n\n");

  return (fail_count == 0) ? 0 : 1;
}
