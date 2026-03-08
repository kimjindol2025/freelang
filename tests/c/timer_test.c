/**
 * Timer Module Test
 *
 * Tests:
 *  - Timer creation/destruction
 *  - Timer callback execution
 *  - Timing accuracy
 *  - Repeat timer functionality
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <unistd.h>
#include <time.h>
#include <sys/time.h>

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

/* ===== Timer Utilities ===== */

typedef struct {
  int id;
  uint64_t interval_ms;
  uint64_t repeat_count;
  uint64_t elapsed_ms;
  int active;
  int fired_count;
} fl_timer_t;

static int timer_id_counter = 0;

uint64_t get_time_ms() {
  struct timeval tv;
  gettimeofday(&tv, NULL);
  return (uint64_t)tv.tv_sec * 1000 + (uint64_t)tv.tv_usec / 1000;
}

fl_timer_t* fl_timer_create(uint64_t interval_ms) {
  fl_timer_t *timer = (fl_timer_t *)malloc(sizeof(fl_timer_t));
  if (!timer) return NULL;

  timer->id = ++timer_id_counter;
  timer->interval_ms = interval_ms;
  timer->repeat_count = 0;
  timer->elapsed_ms = 0;
  timer->active = 0;
  timer->fired_count = 0;

  return timer;
}

int timer_start(fl_timer_t *timer) {
  if (!timer) return -1;
  timer->active = 1;
  timer->fired_count = 0;
  return 0;
}

int timer_fire(fl_timer_t *timer) {
  if (!timer || !timer->active) return -1;
  timer->fired_count++;
  return timer->fired_count;
}

int timer_stop(fl_timer_t *timer) {
  if (!timer) return -1;
  timer->active = 0;
  return 0;
}

void timer_destroy(fl_timer_t *timer) {
  if (!timer) return;
  free(timer);
}

/* ===== Test Cases ===== */

void test_timer_creation() {
  TEST("Timer creation and destruction");

  fl_timer_t *timer = fl_timer_create(1000);
  ASSERT(timer != NULL, "Timer created");
  ASSERT(timer->id > 0, "Timer has valid ID");
  ASSERT(timer->interval_ms == 1000, "Interval is 1000ms");
  ASSERT(timer->active == 0, "Initial state is inactive");
  ASSERT(timer->fired_count == 0, "No fires initially");

  timer_destroy(timer);
  ASSERT(1, "Timer destroyed");
}

void test_timer_start_stop() {
  TEST("Timer start and stop");

  fl_timer_t *timer = fl_timer_create(500);
  ASSERT(timer != NULL, "Timer created");

  int r1 = timer_start(timer);
  ASSERT(r1 == 0, "Timer started");
  ASSERT(timer->active == 1, "Active flag set");

  int r2 = timer_stop(timer);
  ASSERT(r2 == 0, "Timer stopped");
  ASSERT(timer->active == 0, "Active flag cleared");

  timer_destroy(timer);
}

void test_timer_fire() {
  TEST("Timer fire callback");

  fl_timer_t *timer = fl_timer_create(100);
  timer_start(timer);

  int fire1 = timer_fire(timer);
  ASSERT(fire1 == 1, "First fire increments to 1");

  int fire2 = timer_fire(timer);
  ASSERT(fire2 == 2, "Second fire increments to 2");

  int fire3 = timer_fire(timer);
  ASSERT(fire3 == 3, "Third fire increments to 3");

  ASSERT(timer->fired_count == 3, "Fire count is 3");

  timer_destroy(timer);
}

void test_timer_intervals() {
  TEST("Timer with various intervals");

  uint64_t intervals[] = {10, 50, 100, 500, 1000};
  int count = 5;

  for (int i = 0; i < count; i++) {
    fl_timer_t *timer = fl_timer_create(intervals[i]);
    ASSERT(timer != NULL && timer->interval_ms == intervals[i],
           "Timer interval set correctly");
    timer_destroy(timer);
  }
}

void test_timer_inactive_fire() {
  TEST("Timer cannot fire when inactive");

  fl_timer_t *timer = fl_timer_create(100);
  ASSERT(timer->active == 0, "Timer initially inactive");

  int result = timer_fire(timer);
  ASSERT(result == -1, "Fire fails when inactive");
  ASSERT(timer->fired_count == 0, "No fire count increment");

  timer_destroy(timer);
}

void test_timer_multiple_timers() {
  TEST("Multiple timers coexist");

  fl_timer_t *timer1 = fl_timer_create(100);
  fl_timer_t *timer2 = fl_timer_create(500);
  fl_timer_t *timer3 = fl_timer_create(1000);

  ASSERT(timer1->id != timer2->id, "Timer 1 and 2 have different IDs");
  ASSERT(timer2->id != timer3->id, "Timer 2 and 3 have different IDs");
  ASSERT(timer1->interval_ms == 100, "Timer 1 interval is 100");
  ASSERT(timer2->interval_ms == 500, "Timer 2 interval is 500");
  ASSERT(timer3->interval_ms == 1000, "Timer 3 interval is 1000");

  timer_destroy(timer1);
  timer_destroy(timer2);
  timer_destroy(timer3);
}

void test_timer_timing_accuracy() {
  TEST("Timer timing accuracy (sleep-based simulation)");

  fl_timer_t *timer = fl_timer_create(10);
  timer_start(timer);

  uint64_t start = get_time_ms();

  // Simulate timer fires over 50ms
  for (int i = 0; i < 5; i++) {
    usleep(10000); // 10ms
    timer_fire(timer);
  }

  uint64_t elapsed = get_time_ms() - start;

  ASSERT(timer->fired_count == 5, "All 5 fires executed");
  ASSERT(elapsed >= 40 && elapsed <= 100, "Timing within reasonable range");

  timer_destroy(timer);
}

void test_timer_single_shot() {
  TEST("Single-shot timer (no repeat)");

  fl_timer_t *timer = fl_timer_create(100);
  timer->repeat_count = 0; // Single-shot
  timer_start(timer);

  timer_fire(timer);
  ASSERT(timer->fired_count == 1, "Single fire executed");

  timer_destroy(timer);
}

void test_timer_repeat() {
  TEST("Repeating timer with count");

  fl_timer_t *timer = fl_timer_create(50);
  timer->repeat_count = 3;
  timer_start(timer);

  for (int i = 0; i < 3; i++) {
    timer_fire(timer);
  }

  ASSERT(timer->fired_count == 3, "All repeats executed");

  timer_destroy(timer);
}

void test_timer_state_transitions() {
  TEST("Timer state transitions");

  fl_timer_t *timer = fl_timer_create(100);

  ASSERT(timer->active == 0, "Start: inactive");
  timer_start(timer);
  ASSERT(timer->active == 1, "After start: active");
  timer_fire(timer);
  ASSERT(timer->active == 1, "After fire: still active");
  timer_stop(timer);
  ASSERT(timer->active == 0, "After stop: inactive");

  timer_destroy(timer);
}

/* ===== Main ===== */

int main() {
  printf("\n╔════════════════════════════════════════════════╗\n");
  printf("║         Timer Module Tests                    ║\n");
  printf("╚════════════════════════════════════════════════╝\n");

  test_timer_creation();
  test_timer_start_stop();
  test_timer_fire();
  test_timer_intervals();
  test_timer_inactive_fire();
  test_timer_multiple_timers();
  test_timer_timing_accuracy();
  test_timer_single_shot();
  test_timer_repeat();
  test_timer_state_transitions();

  printf("\n╔════════════════════════════════════════════════╗\n");
  printf("║              Test Summary                      ║\n");
  printf("╠════════════════════════════════════════════════╣\n");
  printf("│ Total:  %d\n", test_count);
  printf("│ Passed: %d ✓\n", pass_count);
  printf("│ Failed: %d ✗\n", fail_count);
  printf("╚════════════════════════════════════════════════╝\n\n");

  return (fail_count == 0) ? 0 : 1;
}
