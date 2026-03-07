/*
 * MyOS_Lib - Timer System Tests
 * tests/test_timer.c - Unit tests for timer functionality
 */

#include "../include/myos_timer.h"
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
 * Test 1: Get current time
 */
static void test_get_time(void) {
    test_write_direct("\n=== Test 1: Get Current Time ===\n");

    uint64_t now = myos_timer_now();
    assert_true(now > 0, "Current time is positive");

    /* Get time again - should be later */
    uint64_t now2 = myos_timer_now();
    assert_true(now2 >= now, "Time is monotonic");
    assert_true(now2 > 0, "Second time measurement valid");
}

/**
 * Test 2: Get time as MyTime
 */
static void test_get_time_struct(void) {
    test_write_direct("\n=== Test 2: Get Time as Structure ===\n");

    MyTime time;
    int ret = myos_timer_get_time(&time);
    assert_true(ret == 0, "Get time succeeds");
    assert_true(time.seconds > 0, "Seconds field positive");
    assert_true(time.nanoseconds >= 0, "Nanoseconds non-negative");
    assert_true(time.nanoseconds < 1000000000L, "Nanoseconds within bounds");
}

/**
 * Test 3: Timer elapsed time measurement
 */
static void test_timer_elapsed(void) {
    test_write_direct("\n=== Test 3: Timer Elapsed Time ===\n");

    /* Create and start a timer (simulated) */
    MyTimer timer;
    timer.id = 1;
    timer.type = MYOS_TIMER_ONESHOT;
    timer.state = MYOS_TIMER_RUNNING;
    timer.magic = MYOS_TIMER_MAGIC;

    int ret = myos_timer_start(&timer, 100);
    assert_true(ret == 0, "Timer start succeeds");

    /* Wait a bit */
    myos_timer_sleep(10);

    long elapsed_ms = myos_timer_elapsed_ms(&timer);
    assert_true(elapsed_ms >= 5, "Elapsed time reasonable");
    assert_true(elapsed_ms < 200, "Elapsed time not excessive");
}

/**
 * Test 4: Timer expiration check
 */
static void test_timer_expiration(void) {
    test_write_direct("\n=== Test 4: Timer Expiration ===\n");

    MyTimer timer;
    timer.id = 2;
    timer.type = MYOS_TIMER_ONESHOT;
    timer.state = MYOS_TIMER_RUNNING;
    timer.magic = MYOS_TIMER_MAGIC;

    int ret = myos_timer_start(&timer, 50);
    assert_true(ret == 0, "Timer start succeeds");

    /* Check not expired immediately */
    int expired = myos_timer_is_expired(&timer);
    assert_true(expired == 0, "Timer not expired initially");

    /* Sleep longer than timer duration */
    myos_timer_sleep(100);

    /* Now should be expired */
    expired = myos_timer_is_expired(&timer);
    assert_true(expired == 1, "Timer expired after duration");
}

/**
 * Test 5: Timer pause and resume
 */
static void test_timer_pause_resume(void) {
    test_write_direct("\n=== Test 5: Timer Pause and Resume ===\n");

    MyTimer timer;
    timer.id = 3;
    timer.type = MYOS_TIMER_ONESHOT;
    timer.state = MYOS_TIMER_RUNNING;
    timer.magic = MYOS_TIMER_MAGIC;

    int ret = myos_timer_start(&timer, 1000);
    assert_true(ret == 0, "Timer start succeeds");

    /* Sleep a bit then pause */
    myos_timer_sleep(20);
    ret = myos_timer_pause(&timer);
    assert_true(ret == 0, "Pause succeeds");

    long elapsed_after_pause = myos_timer_elapsed_ms(&timer);

    /* Resume and verify time doesn't jump */
    ret = myos_timer_resume(&timer);
    assert_true(ret == 0, "Resume succeeds");

    long elapsed_after_resume = myos_timer_elapsed_ms(&timer);
    assert_true(elapsed_after_resume >= elapsed_after_pause, "Elapsed time preserved");
}

/**
 * Test 6: Timer reset
 */
static void test_timer_reset(void) {
    test_write_direct("\n=== Test 6: Timer Reset ===\n");

    MyTimer timer;
    timer.id = 4;
    timer.type = MYOS_TIMER_ONESHOT;
    timer.state = MYOS_TIMER_RUNNING;
    timer.magic = MYOS_TIMER_MAGIC;

    myos_timer_start(&timer, 100);
    myos_timer_sleep(20);

    long before_reset = myos_timer_elapsed_ms(&timer);
    assert_true(before_reset > 0, "Time elapsed before reset");

    int ret = myos_timer_reset(&timer);
    assert_true(ret == 0, "Reset succeeds");
    assert_true(timer.state == MYOS_TIMER_STOPPED, "State is stopped");
}

/**
 * Test 7: Timer remaining time
 */
static void test_timer_remaining(void) {
    test_write_direct("\n=== Test 7: Timer Remaining Time ===\n");

    MyTimer timer;
    timer.id = 5;
    timer.type = MYOS_TIMER_ONESHOT;
    timer.state = MYOS_TIMER_RUNNING;
    timer.magic = MYOS_TIMER_MAGIC;

    myos_timer_start(&timer, 100);
    myos_timer_sleep(20);

    long remaining = myos_timer_remaining(&timer);
    assert_true(remaining > 0, "Remaining time positive");
    assert_true(remaining < 100, "Remaining time less than duration");
    assert_true(remaining <= 80, "Remaining time is approximate");
}

/**
 * Test 8: Timer ID retrieval
 */
static void test_timer_id(void) {
    test_write_direct("\n=== Test 8: Timer ID ===\n");

    MyTimer timer;
    timer.id = 42;
    timer.type = MYOS_TIMER_ONESHOT;
    timer.state = MYOS_TIMER_RUNNING;
    timer.magic = MYOS_TIMER_MAGIC;

    uint32_t id = myos_timer_id(&timer);
    assert_true(id == 42, "Timer ID retrieved correctly");

    MyTimer bad_timer;
    bad_timer.id = 10;
    bad_timer.magic = 0xDEADBEEF;
    uint32_t bad_id = myos_timer_id(&bad_timer);
    assert_true(bad_id == 0xFFFFFFFF, "Invalid timer returns error ID");
}

/**
 * Test 9: Timer state check
 */
static void test_timer_state(void) {
    test_write_direct("\n=== Test 9: Timer State ===\n");

    MyTimer timer;
    timer.id = 6;
    timer.type = MYOS_TIMER_ONESHOT;
    timer.state = MYOS_TIMER_STOPPED;
    timer.magic = MYOS_TIMER_MAGIC;

    int state = myos_timer_state(&timer);
    assert_true(state == MYOS_TIMER_STOPPED, "Stopped state correct");

    timer.state = MYOS_TIMER_RUNNING;
    state = myos_timer_state(&timer);
    assert_true(state == MYOS_TIMER_RUNNING, "Running state correct");

    timer.state = MYOS_TIMER_PAUSED;
    state = myos_timer_state(&timer);
    assert_true(state == MYOS_TIMER_PAUSED, "Paused state correct");
}

/**
 * Test 10: Timer statistics
 */
static void test_timer_stats(void) {
    test_write_direct("\n=== Test 10: Timer Statistics ===\n");

    MyTimer timer;
    timer.id = 7;
    timer.type = MYOS_TIMER_ONESHOT;
    timer.state = MYOS_TIMER_RUNNING;
    timer.magic = MYOS_TIMER_MAGIC;

    myos_timer_start(&timer, 100);
    myos_timer_sleep(30);

    long elapsed_ms, remaining_ms;
    int ret = myos_timer_stats(&timer, &elapsed_ms, &remaining_ms);

    assert_true(ret == 0, "Stats call succeeds");
    assert_true(elapsed_ms > 0, "Elapsed time measured");
    assert_true(remaining_ms >= 0, "Remaining time valid");
    assert_true(elapsed_ms + remaining_ms <= 120, "Times sum correctly");
}

/**
 * Main test runner
 */
int main(void) {
    test_write_direct("\n╔════════════════════════════════════════╗\n");
    test_write_direct("║  MyOS_Lib Phase 8.7 - Timer Tests     ║\n");
    test_write_direct("╚════════════════════════════════════════╝\n");

    test_get_time();
    test_get_time_struct();
    test_timer_elapsed();
    test_timer_expiration();
    test_timer_pause_resume();
    test_timer_reset();
    test_timer_remaining();
    test_timer_id();
    test_timer_state();
    test_timer_stats();

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
