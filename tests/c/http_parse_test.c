/**
 * HTTP Request Parsing Test
 *
 * Tests:
 *  - HTTP/1.1 request line parsing
 *  - Method extraction
 *  - Path parsing
 *  - Version parsing
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

/* ===== Simple HTTP Line Parser ===== */

typedef struct {
  char method[32];
  char path[256];
  char version[32];
} http_request_line_t;

int http_parse_line(const char *line, http_request_line_t *req) {
  if (!line || !req) return -1;

  memset(req, 0, sizeof(http_request_line_t));

  // Find first space (method end)
  const char *space1 = strchr(line, ' ');
  if (!space1) return -1;

  size_t method_len = space1 - line;
  if (method_len >= 32) return -1;

  memcpy(req->method, line, method_len);
  req->method[method_len] = '\0';

  // Find second space (path end)
  const char *space2 = strchr(space1 + 1, ' ');
  if (!space2) return -1;

  size_t path_len = space2 - (space1 + 1);
  if (path_len >= 256) return -1;

  memcpy(req->path, space1 + 1, path_len);
  req->path[path_len] = '\0';

  // Rest is version
  const char *version_start = space2 + 1;
  size_t version_len = strlen(version_start);
  if (version_len >= 32) return -1;

  memcpy(req->version, version_start, version_len);
  req->version[version_len] = '\0';

  return 0;
}

/* ===== Test Cases ===== */

void test_get_request() {
  TEST("GET request line parsing");

  http_request_line_t req;
  int result = http_parse_line("GET / HTTP/1.1", &req);

  ASSERT(result == 0, "Parsing succeeded");
  ASSERT(strcmp(req.method, "GET") == 0, "Method is GET");
  ASSERT(strcmp(req.path, "/") == 0, "Path is /");
  ASSERT(strcmp(req.version, "HTTP/1.1") == 0, "Version is HTTP/1.1");
}

void test_post_request() {
  TEST("POST request line parsing");

  http_request_line_t req;
  int result = http_parse_line("POST /api/users HTTP/1.1", &req);

  ASSERT(result == 0, "Parsing succeeded");
  ASSERT(strcmp(req.method, "POST") == 0, "Method is POST");
  ASSERT(strcmp(req.path, "/api/users") == 0, "Path is /api/users");
}

void test_path_with_query() {
  TEST("Path with query parameters");

  http_request_line_t req;
  int result = http_parse_line("GET /search?q=test&page=1 HTTP/1.1", &req);

  ASSERT(result == 0, "Parsing succeeded");
  ASSERT(strcmp(req.path, "/search?q=test&page=1") == 0, "Query parameters preserved");
}

void test_various_methods() {
  TEST("Various HTTP methods");

  const char *methods[] = {"GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"};
  int method_count = 6;
  int success_count = 0;

  for (int i = 0; i < method_count; i++) {
    http_request_line_t req;
    char line[256];
    snprintf(line, sizeof(line), "%s /api HTTP/1.1", methods[i]);

    int result = http_parse_line(line, &req);
    if (result == 0 && strcmp(req.method, methods[i]) == 0) {
      success_count++;
    }
  }

  ASSERT(success_count == method_count, "All methods parsed correctly");
}

void test_versions() {
  TEST("HTTP version parsing");

  const char *versions[] = {"HTTP/1.0", "HTTP/1.1", "HTTP/2.0"};
  int version_count = 3;
  int success_count = 0;

  for (int i = 0; i < version_count; i++) {
    http_request_line_t req;
    char line[256];
    snprintf(line, sizeof(line), "GET / %s", versions[i]);

    int result = http_parse_line(line, &req);
    if (result == 0 && strcmp(req.version, versions[i]) == 0) {
      success_count++;
    }
  }

  ASSERT(success_count == version_count, "All versions parsed");
}

void test_root_path() {
  TEST("Root path requests");

  http_request_line_t req;
  int result = http_parse_line("GET / HTTP/1.1", &req);

  ASSERT(result == 0, "Parsing succeeded");
  ASSERT(strcmp(req.path, "/") == 0, "Root path is /");
}

void test_deep_path() {
  TEST("Deep path requests");

  http_request_line_t req;
  int result = http_parse_line("GET /api/v1/users/123/profile HTTP/1.1", &req);

  ASSERT(result == 0, "Parsing succeeded");
  ASSERT(strcmp(req.path, "/api/v1/users/123/profile") == 0, "Deep path preserved");
}

void test_invalid_format() {
  TEST("Invalid request format");

  http_request_line_t req;

  // Missing spaces
  int r1 = http_parse_line("GET/HTTP/1.1", &req);
  ASSERT(r1 != 0, "Missing spaces detected");

  // Too few parts
  int r2 = http_parse_line("GET /", &req);
  ASSERT(r2 != 0, "Incomplete request detected");

  // NULL input
  int r3 = http_parse_line(NULL, &req);
  ASSERT(r3 != 0, "NULL input rejected");
}

void test_overflow_protection() {
  TEST("Buffer overflow protection");

  http_request_line_t req;

  // Very long method (should fail)
  char long_method[256];
  memset(long_method, 'X', sizeof(long_method) - 1);
  long_method[sizeof(long_method) - 1] = '\0';

  char line[512];
  snprintf(line, sizeof(line), "%s / HTTP/1.1", long_method);
  int result = http_parse_line(line, &req);

  ASSERT(result != 0, "Overflow prevented");
}

/* ===== Main ===== */

int main() {
  printf("\n╔════════════════════════════════════════════════╗\n");
  printf("║      HTTP Request Line Parsing Tests          ║\n");
  printf("╚════════════════════════════════════════════════╝\n");

  test_get_request();
  test_post_request();
  test_path_with_query();
  test_various_methods();
  test_versions();
  test_root_path();
  test_deep_path();
  test_invalid_format();
  test_overflow_protection();

  printf("\n╔════════════════════════════════════════════════╗\n");
  printf("║              Test Summary                      ║\n");
  printf("╠════════════════════════════════════════════════╣\n");
  printf("│ Total:  %d\n", test_count);
  printf("│ Passed: %d ✓\n", pass_count);
  printf("│ Failed: %d ✗\n", fail_count);
  printf("╚════════════════════════════════════════════════╝\n\n");

  return (fail_count == 0) ? 0 : 1;
}
