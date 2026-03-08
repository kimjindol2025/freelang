/*
 * MyOS_Lib - IO System Tests
 * tests/test_io.c - Unit tests for IO operations
 */

#include "../include/myos_io.h"
#include "../include/myos_memory.h"
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
 * Test 1: Put char
 */
static void test_put_char(void) {
    test_write_direct("\n=== Test 1: Put Char ===\n");

    int result = myos_put_char('H');
    assert_true(result == 0, "Put 'H' successful");

    result = myos_put_char('i');
    assert_true(result == 0, "Put 'i' successful");

    myos_put_char('\n');
}

/**
 * Test 2: Put string
 */
static void test_put_string(void) {
    test_write_direct("\n=== Test 2: Put String ===\n");

    int result = myos_put_string("Hello from IO system");
    assert_true(result == 0, "Put string successful");

    result = myos_put_string("\n");
    assert_true(result == 0, "Put newline");
}

/**
 * Test 3: Put line
 */
static void test_put_line(void) {
    test_write_direct("\n=== Test 3: Put Line ===\n");

    int result = myos_put_line("This is a complete line");
    assert_true(result == 0, "Put line successful");
}

/**
 * Test 4: Format integer (decimal)
 */
static void test_format_int(void) {
    test_write_direct("\n=== Test 4: Format Integer ===\n");

    char buf[32];

    /* Test positive number */
    size_t len = myos_format_int(buf, 12345, 10);
    assert_true(len == 5, "Format 12345 produces 5 chars");
    assert_true(buf[0] == '1' && buf[4] == '5', "First and last char correct");

    /* Test negative number */
    len = myos_format_int(buf, -42, 10);
    assert_true(len == 3, "Format -42 produces 3 chars (including -)");
    assert_true(buf[0] == '-', "Negative sign present");

    /* Test zero */
    len = myos_format_int(buf, 0, 10);
    assert_true(len == 1 && buf[0] == '0', "Format 0 produces '0'");
}

/**
 * Test 5: Format unsigned integer
 */
static void test_format_uint(void) {
    test_write_direct("\n=== Test 5: Format Unsigned Integer ===\n");

    char buf[32];

    /* Test decimal */
    size_t len = myos_format_uint(buf, 999, 10);
    assert_true(len == 3, "Format 999 produces 3 chars");
    assert_true(buf[0] == '9', "First char is 9");

    /* Test hex */
    len = myos_format_uint(buf, 255, 16);
    assert_true(len == 2, "Format 255 (hex) produces 2 chars");
    assert_true(buf[0] == 'f' && buf[1] == 'f', "Hex representation correct");

    /* Test zero */
    len = myos_format_uint(buf, 0, 10);
    assert_true(buf[0] == '0', "Format 0 produces '0'");
}

/**
 * Test 6: Put integer
 */
static void test_put_int(void) {
    test_write_direct("\n=== Test 6: Put Integer ===\n");

    int result = myos_put_int(42);
    assert_true(result == 0, "Put integer 42");

    myos_put_char(' ');

    result = myos_put_int(-99);
    assert_true(result == 0, "Put integer -99");

    myos_put_char('\n');
}

/**
 * Test 7: Put unsigned integer
 */
static void test_put_uint(void) {
    test_write_direct("\n=== Test 7: Put Unsigned Integer ===\n");

    int result = myos_put_uint(1234567);
    assert_true(result == 0, "Put unsigned integer");

    myos_put_char('\n');
}

/**
 * Test 8: Put hex
 */
static void test_put_hex(void) {
    test_write_direct("\n=== Test 8: Put Hex ===\n");

    int result = myos_put_hex(0xDEADBEEF);
    assert_true(result == 0, "Put hex value");

    myos_put_char('\n');
}

/**
 * Test 9: Write string to file descriptor
 */
static void test_write_string(void) {
    test_write_direct("\n=== Test 9: Write String to FD ===\n");

    long bytes = myos_write_string(MYOS_STDOUT, "Direct write to stdout");
    assert_true(bytes > 0, "Write string returns bytes written");
    assert_true(bytes == 21, "Correct byte count");

    myos_put_char('\n');
}

/**
 * Test 10: Write raw bytes
 */
static void test_write_raw(void) {
    test_write_direct("\n=== Test 10: Write Raw Bytes ===\n");

    const char *data = "Raw";
    long bytes = myos_write(MYOS_STDOUT, data, 3);
    assert_true(bytes == 3, "Write 3 bytes");

    myos_put_char('\n');
}

/**
 * Main test runner
 */
int main(void) {
    test_write_direct("\n╔════════════════════════════════════════╗\n");
    test_write_direct("║  MyOS_Lib Phase 8.5 - IO Tests       ║\n");
    test_write_direct("╚════════════════════════════════════════╝\n");

    test_put_char();
    test_put_string();
    test_put_line();
    test_format_int();
    test_format_uint();
    test_put_int();
    test_put_uint();
    test_put_hex();
    test_write_string();
    test_write_raw();

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
