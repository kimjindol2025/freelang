/**
 * FreeLang core/http - Test Suite
 *
 * Tests for HTTP client and server
 * Total: 20 test cases
 */

#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "http.h"

/* ===== Test Framework ===== */

static int test_count = 0;
static int pass_count = 0;
static int fail_count = 0;

#define ASSERT(condition, message) \
  do { \
    test_count++; \
    if (condition) { \
      pass_count++; \
      printf("✓ Test %d: %s\n", test_count, message); \
    } else { \
      fail_count++; \
      printf("✗ Test %d: %s\n", test_count, message); \
    } \
  } while(0)

#define ASSERT_EQUAL_INT(actual, expected, message) \
  ASSERT((actual) == (expected), message)

#define ASSERT_EQUAL_STR(actual, expected, message) \
  ASSERT(strcmp((actual), (expected)) == 0, message)

/* ===== REQUEST TESTS ===== */

/**
 * Test 1: HTTP request creation
 */
void test_http_request_create(void) {
  fl_http_request_t *req = fl_http_request_create();
  ASSERT(req != NULL, "HTTP request created");

  if (req) {
    fl_http_request_destroy(req);
  }
}

/**
 * Test 2: Set GET method
 */
void test_http_request_get(void) {
  fl_http_request_t *req = fl_http_request_create();

  int ret = fl_http_request_set_method(req, "GET");
  ASSERT(ret == 0, "GET method set successfully");
  ASSERT_EQUAL_STR(req->method, "GET", "Method is GET");

  fl_http_request_destroy(req);
}

/**
 * Test 3: Set POST method
 */
void test_http_request_post(void) {
  fl_http_request_t *req = fl_http_request_create();

  int ret = fl_http_request_set_method(req, "POST");
  ASSERT(ret == 0, "POST method set successfully");
  ASSERT_EQUAL_STR(req->method, "POST", "Method is POST");

  fl_http_request_destroy(req);
}

/**
 * Test 4: Set request path
 */
void test_http_request_path(void) {
  fl_http_request_t *req = fl_http_request_create();

  int ret = fl_http_request_set_path(req, "/api/users");
  ASSERT(ret == 0, "Path set successfully");
  ASSERT_EQUAL_STR(req->path, "/api/users", "Path is /api/users");

  fl_http_request_destroy(req);
}

/**
 * Test 5: Add request header
 */
void test_http_request_add_header(void) {
  fl_http_request_t *req = fl_http_request_create();

  int ret = fl_http_request_add_header(req, "Content-Type", "application/json");
  ASSERT(ret == 0, "Header added successfully");
  ASSERT(req->header_count > 0, "Header count increased");

  fl_http_request_destroy(req);
}

/**
 * Test 6: Add multiple headers
 */
void test_http_request_multiple_headers(void) {
  fl_http_request_t *req = fl_http_request_create();

  fl_http_request_add_header(req, "Content-Type", "application/json");
  fl_http_request_add_header(req, "Authorization", "Bearer token123");
  fl_http_request_add_header(req, "User-Agent", "FreeLang/1.0");

  ASSERT(req->header_count == 3, "All 3 headers added");

  fl_http_request_destroy(req);
}

/**
 * Test 7: Set request body
 */
void test_http_request_body(void) {
  fl_http_request_t *req = fl_http_request_create();

  const char *body = "{\"name\": \"John\"}";
  int ret = fl_http_request_set_body(req, body, strlen(body));

  ASSERT(ret == 0, "Body set successfully");
  ASSERT(req->body_len > 0, "Body length set");
  ASSERT_EQUAL_STR((char*)req->body, body, "Body content matches");

  fl_http_request_destroy(req);
}

/**
 * Test 8: Serialize GET request
 */
void test_http_request_serialize_get(void) {
  fl_http_request_t *req = fl_http_request_create();

  fl_http_request_set_method(req, "GET");
  fl_http_request_set_path(req, "/api/test");
  fl_http_request_add_header(req, "Host", "example.com");

  char *serialized = fl_http_request_serialize(req);

  ASSERT(serialized != NULL, "Request serialized");
  ASSERT(strstr(serialized, "GET") != NULL, "Contains GET method");
  ASSERT(strstr(serialized, "/api/test") != NULL, "Contains path");
  ASSERT(strstr(serialized, "Host: example.com") != NULL, "Contains header");

  free(serialized);
  fl_http_request_destroy(req);
}

/* ===== RESPONSE TESTS ===== */

/**
 * Test 9: HTTP response creation
 */
void test_http_response_create(void) {
  fl_http_response_t *resp = fl_http_response_create();
  ASSERT(resp != NULL, "HTTP response created");

  if (resp) {
    fl_http_response_destroy(resp);
  }
}

/**
 * Test 10: Set response status
 */
void test_http_response_status(void) {
  fl_http_response_t *resp = fl_http_response_create();

  int ret = fl_http_response_set_status(resp, 200, "OK");
  ASSERT(ret == 0, "Status set successfully");
  ASSERT_EQUAL_INT(resp->status_code, 200, "Status code is 200");
  ASSERT_EQUAL_STR(resp->status_text, "OK", "Status text is OK");

  fl_http_response_destroy(resp);
}

/**
 * Test 11: Set various status codes
 */
void test_http_response_various_status(void) {
  fl_http_response_t *resp = fl_http_response_create();

  fl_http_response_set_status(resp, 404, "Not Found");
  ASSERT(resp->status_code == 404, "404 status code");

  fl_http_response_set_status(resp, 500, "Internal Server Error");
  ASSERT(resp->status_code == 500, "500 status code");

  fl_http_response_destroy(resp);
}

/**
 * Test 12: Add response header
 */
void test_http_response_add_header(void) {
  fl_http_response_t *resp = fl_http_response_create();

  int ret = fl_http_response_add_header(resp, "Content-Type", "application/json");
  ASSERT(ret == 0, "Header added successfully");
  ASSERT(resp->header_count > 0, "Header count increased");

  fl_http_response_destroy(resp);
}

/**
 * Test 13: Set response body
 */
void test_http_response_body(void) {
  fl_http_response_t *resp = fl_http_response_create();

  const char *body = "{\"status\": \"success\"}";
  int ret = fl_http_response_set_body(resp, body, strlen(body));

  ASSERT(ret == 0, "Body set successfully");
  ASSERT(resp->body_len > 0, "Body length set");
  ASSERT_EQUAL_STR((char*)resp->body, body, "Body content matches");

  fl_http_response_destroy(resp);
}

/**
 * Test 14: Serialize response
 */
void test_http_response_serialize(void) {
  fl_http_response_t *resp = fl_http_response_create();

  fl_http_response_set_status(resp, 200, "OK");
  fl_http_response_add_header(resp, "Content-Type", "text/html");
  fl_http_response_set_body(resp, "<h1>Hello</h1>", 14);

  char *serialized = fl_http_response_serialize(resp);

  ASSERT(serialized != NULL, "Response serialized");
  ASSERT(strstr(serialized, "200") != NULL, "Contains status code");
  ASSERT(strstr(serialized, "Content-Type") != NULL, "Contains header");

  free(serialized);
  fl_http_response_destroy(resp);
}

/**
 * Test 15: Parse HTTP request
 */
void test_http_request_parse(void) {
  const char *raw_req = "GET /api/test HTTP/1.1\r\nHost: example.com\r\n\r\n";

  fl_http_request_t *req = fl_http_request_parse(raw_req);

  ASSERT(req != NULL, "Request parsed");
  if (req) {
    ASSERT_EQUAL_STR(req->method, "GET", "Parsed method is GET");
    ASSERT_EQUAL_STR(req->path, "/api/test", "Parsed path is /api/test");
    fl_http_request_destroy(req);
  }
}

/**
 * Test 16: Parse HTTP response
 */
void test_http_response_parse(void) {
  const char *raw_resp = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<h1>Hello</h1>";

  fl_http_response_t *resp = fl_http_response_parse(raw_resp);

  ASSERT(resp != NULL, "Response parsed");
  if (resp) {
    ASSERT_EQUAL_INT(resp->status_code, 200, "Parsed status is 200");
    fl_http_response_destroy(resp);
  }
}

/**
 * Test 17: Request with query string
 */
void test_http_request_query_string(void) {
  fl_http_request_t *req = fl_http_request_create();

  fl_http_request_set_method(req, "GET");
  fl_http_request_set_path(req, "/search?q=test&limit=10");

  ASSERT_EQUAL_STR(req->path, "/search?q=test&limit=10", "Query string preserved");

  fl_http_request_destroy(req);
}

/**
 * Test 18: Response with content length
 */
void test_http_response_content_length(void) {
  fl_http_response_t *resp = fl_http_response_create();

  const char *body = "Hello World";
  fl_http_response_set_body(resp, body, strlen(body));
  fl_http_response_add_header(resp, "Content-Length", "11");

  ASSERT(resp->body_len == strlen(body), "Content length matches body");

  fl_http_response_destroy(resp);
}

/**
 * Test 19: Request with authentication
 */
void test_http_request_auth(void) {
  fl_http_request_t *req = fl_http_request_create();

  fl_http_request_set_method(req, "GET");
  fl_http_request_add_header(req, "Authorization", "Bearer eyJhbGc...");

  ASSERT(req->header_count > 0, "Authorization header added");

  fl_http_request_destroy(req);
}

/**
 * Test 20: Response redirect handling
 */
void test_http_response_redirect(void) {
  fl_http_response_t *resp = fl_http_response_create();

  fl_http_response_set_status(resp, 302, "Found");
  fl_http_response_add_header(resp, "Location", "https://example.com/new-path");

  ASSERT(resp->status_code == 302, "302 redirect status");

  fl_http_response_destroy(resp);
}

/* ===== MAIN TEST RUNNER ===== */

int main(void) {
  printf("🧪 Running HTTP Module Tests\n");
  printf("════════════════════════════════════════\n\n");

  printf("📤 Request Tests (10):\n");
  test_http_request_create();
  test_http_request_get();
  test_http_request_post();
  test_http_request_path();
  test_http_request_add_header();
  test_http_request_multiple_headers();
  test_http_request_body();
  test_http_request_serialize_get();
  test_http_request_query_string();
  test_http_request_auth();

  printf("\n📥 Response Tests (10):\n");
  test_http_response_create();
  test_http_response_status();
  test_http_response_various_status();
  test_http_response_add_header();
  test_http_response_body();
  test_http_response_serialize();
  test_http_response_parse();
  test_http_response_content_length();
  test_http_response_redirect();
  test_http_request_parse();

  // Results
  printf("\n════════════════════════════════════════\n");
  printf("📊 Test Results:\n");
  printf("  Total:  %d\n", test_count);
  printf("  Passed: %d ✅\n", pass_count);
  printf("  Failed: %d ❌\n", fail_count);
  printf("\n");

  if (fail_count == 0) {
    printf("🎉 All tests passed!\n");
    return 0;
  } else {
    printf("⚠️  %d test(s) failed\n", fail_count);
    return 1;
  }
}
