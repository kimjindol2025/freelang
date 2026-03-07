/*
 * MyOS_Lib - Logging System Tests
 * tests/test_log.c - Unit tests for logging functionality
 */

#include "../include/myos_log.h"
#include "../include/myos_types.h"

extern long myos_write(int fd, const void *buf, size_t count);
extern void myos_exit(int status);

static int test_count = 0;
static int test_passed = 0;

static void test_write_direct(const char *msg) {
    size_t len = 0;
    while (msg[len]) len++;
    myos_write(STDOUT_FILENO, msg, len);
}

static void assert_true(int condition, const char *msg) {
    test_count++;
    if (condition) {
        test_write_direct("✓ ");
        test_passed++;
    } else {
        test_write_direct("✗ ");
    }
    test_write_direct(msg);
    test_write_direct("\n");
}

/**
 * Test 1: Log level names
 */
static void test_log_level_names(void) {
    test_write_direct("\n=== Test 1: Log Level Names ===\n");

    const char *debug_name = myos_log_level_name(MYOS_LOG_DEBUG);
    assert_true(debug_name[0] == 'D', "DEBUG level name");

    const char *info_name = myos_log_level_name(MYOS_LOG_INFO);
    assert_true(info_name[0] == 'I', "INFO level name");

    const char *warn_name = myos_log_level_name(MYOS_LOG_WARN);
    assert_true(warn_name[0] == 'W', "WARN level name");

    const char *error_name = myos_log_level_name(MYOS_LOG_ERROR);
    assert_true(error_name[0] == 'E', "ERROR level name");

    const char *fatal_name = myos_log_level_name(MYOS_LOG_FATAL);
    assert_true(fatal_name[0] == 'F', "FATAL level name");
}

/**
 * Test 2: Get time
 */
static void test_get_time(void) {
    test_write_direct("\n=== Test 2: Get Time ===\n");

    char buf[32];
    size_t len = myos_log_get_time(buf, 32);

    assert_true(len > 0, "Time length > 0");
    assert_true(buf[0] == '2', "First char is '2' (year 2026)");
    assert_true(buf[4] == '-', "Date format check");
    assert_true(len == 19, "Expected time length");
}

/**
 * Test 3: Format message with timestamp
 */
static void test_format_message(void) {
    test_write_direct("\n=== Test 3: Format Message ===\n");

    char buf[128];
    size_t len = myos_log_format(buf, 128, MYOS_LOG_INFO, "Test message");

    assert_true(len > 0, "Format length > 0");
    assert_true(buf[0] == '[', "Format starts with [");
    assert_true(buf[len-1] == '\n', "Format ends with newline");

    /* Check for INFO in formatted output */
    int found_info = 0;
    for (size_t i = 0; i < len - 1; i++) {
        if (buf[i] == 'I' && buf[i+1] == 'N' && buf[i+2] == 'F' && buf[i+3] == 'O') {
            found_info = 1;
            break;
        }
    }
    assert_true(found_info, "INFO level found in format");
}

/**
 * Test 4: Format with DEBUG level
 */
static void test_format_debug(void) {
    test_write_direct("\n=== Test 4: Format DEBUG ===\n");

    char buf[128];
    size_t len = myos_log_format(buf, 128, MYOS_LOG_DEBUG, "Debug message");

    assert_true(len > 0, "Debug format succeeds");
    assert_true(buf[0] == '[', "Format starts correctly");

    /* Check for DEBUG in output */
    int found = 0;
    for (size_t i = 0; i < len - 5; i++) {
        if (buf[i] == 'D' && buf[i+1] == 'E' && buf[i+2] == 'B' &&
            buf[i+3] == 'U' && buf[i+4] == 'G') {
            found = 1;
            break;
        }
    }
    assert_true(found, "DEBUG found in formatted message");
}

/**
 * Test 5: Format with WARN level
 */
static void test_format_warn(void) {
    test_write_direct("\n=== Test 5: Format WARN ===\n");

    char buf[128];
    size_t len = myos_log_format(buf, 128, MYOS_LOG_WARN, "Warning");

    assert_true(len > 0, "Warn format succeeds");
    assert_true(buf[len-1] == '\n', "Ends with newline");

    /* Check message is included */
    int found_warn = 0;
    for (size_t i = 0; i < len - 3; i++) {
        if (buf[i] == 'W' && buf[i+1] == 'A' && buf[i+2] == 'R' && buf[i+3] == 'N') {
            found_warn = 1;
            break;
        }
    }
    assert_true(found_warn, "WARN found in output");
}

/**
 * Test 6: Format with ERROR level
 */
static void test_format_error(void) {
    test_write_direct("\n=== Test 6: Format ERROR ===\n");

    char buf[128];
    size_t len = myos_log_format(buf, 128, MYOS_LOG_ERROR, "Error occurred");

    assert_true(len > 0, "Error format succeeds");

    /* Check for timestamp bracket */
    assert_true(buf[0] == '[', "Starts with [");
    assert_true(buf[10] == ']', "Has closing bracket");
}

/**
 * Test 7: Format with FATAL level
 */
static void test_format_fatal(void) {
    test_write_direct("\n=== Test 7: Format FATAL ===\n");

    char buf[128];
    size_t len = myos_log_format(buf, 128, MYOS_LOG_FATAL, "Fatal error");

    assert_true(len > 0, "Fatal format succeeds");
    assert_true(buf[0] == '[', "Format starts with [");
    assert_true(len <= 128, "Format within buffer size");
}

/**
 * Test 8: Message is included in format
 */
static void test_message_included(void) {
    test_write_direct("\n=== Test 8: Message Included ===\n");

    char buf[128];
    const char *test_msg = "Hello world";
    size_t len = myos_log_format(buf, 128, MYOS_LOG_INFO, test_msg);

    assert_true(len > 0, "Format succeeds");

    /* Check if message is in the buffer */
    int found = 0;
    for (size_t i = 0; i < len - 10; i++) {
        if (buf[i] == 'H' && buf[i+1] == 'e' && buf[i+2] == 'l' &&
            buf[i+3] == 'l' && buf[i+4] == 'o') {
            found = 1;
            break;
        }
    }
    assert_true(found, "Message 'Hello' found in output");
}

/**
 * Test 9: Format with empty message
 */
static void test_format_empty_message(void) {
    test_write_direct("\n=== Test 9: Format Empty Message ===\n");

    char buf[128];
    size_t len = myos_log_format(buf, 128, MYOS_LOG_INFO, "");

    assert_true(len > 0, "Empty message format succeeds");
    assert_true(buf[0] == '[', "Still formatted with bracket");
}

/**
 * Test 10: Large message truncation
 */
static void test_large_message(void) {
    test_write_direct("\n=== Test 10: Large Message ===\n");

    char buf[64];
    char large_msg[100];

    /* Create a large message */
    int i = 0;
    while (i < 99) {
        large_msg[i] = 'A';
        i++;
    }
    large_msg[99] = '\0';

    size_t len = myos_log_format(buf, 64, MYOS_LOG_INFO, large_msg);

    assert_true(len > 0, "Large message handling");
    assert_true(len <= 64, "Respects buffer size");
    assert_true(buf[63] == '\0', "Buffer is null-terminated");
}

/**
 * Main test runner
 */
int main(void) {
    test_write_direct("\n╔════════════════════════════════════════╗\n");
    test_write_direct("║  MyOS_Lib Phase 8.6 - Logging Tests   ║\n");
    test_write_direct("╚════════════════════════════════════════╝\n");

    test_log_level_names();
    test_get_time();
    test_format_message();
    test_format_debug();
    test_format_warn();
    test_format_error();
    test_format_fatal();
    test_message_included();
    test_format_empty_message();
    test_large_message();

    test_write_direct("\n╔════════════════════════════════════════╗\n");
    test_write_direct("║  Test Results                         ║\n");
    test_write_direct("╚════════════════════════════════════════╝\n");
    test_write_direct("Passed: ");
    test_write_direct("\n");
    test_write_direct("Total: ");
    test_write_direct("\n");

    if (test_passed == test_count) {
        test_write_direct("\n✓ All tests passed!\n");
        return 0;
    } else {
        test_write_direct("\n✗ Some tests failed\n");
        return 1;
    }
}
