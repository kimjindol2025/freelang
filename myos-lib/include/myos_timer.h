/*
 * MyOS_Lib - Timer System
 * myos_timer.h - High-precision timing interface
 *
 * Features:
 * - Microsecond-precision timers
 * - Multiple timer support
 * - One-shot and repeating timers
 * - No standard library dependency
 */

#ifndef MYOS_TIMER_H
#define MYOS_TIMER_H

#include "myos_types.h"

/* Timer state enumeration */
typedef enum {
    MYOS_TIMER_STOPPED = 0,
    MYOS_TIMER_RUNNING = 1,
    MYOS_TIMER_PAUSED = 2
} MyTimerState;

/* Timer type */
typedef enum {
    MYOS_TIMER_ONESHOT = 0,
    MYOS_TIMER_REPEATING = 1
} MyTimerType;

/* Time structure (seconds and nanoseconds) */
typedef struct {
    long seconds;
    long nanoseconds;
} MyTime;

/* Timer structure */
typedef struct {
    uint32_t id;                /* Unique timer ID */
    MyTimerState state;         /* Current state */
    MyTimerType type;           /* Timer type */
    uint64_t start_time;        /* Start timestamp (nanoseconds) */
    uint64_t duration;          /* Duration in nanoseconds */
    uint64_t elapsed;           /* Elapsed time */
    uint32_t magic;             /* Magic number for validation */
} MyTimer;

/* Magic number for timer validation */
#define MYOS_TIMER_MAGIC 0x1C0C0C0C

/**
 * Get current time in nanoseconds
 * @return Current time in nanoseconds
 */
uint64_t myos_timer_now(void);

/**
 * Get current time as MyTime structure
 * @param time - Output time structure
 * @return 0 on success, -1 on error
 */
int myos_timer_get_time(MyTime *time);

/**
 * Create a timer
 * @param id - Timer ID
 * @param type - Timer type (ONESHOT or REPEATING)
 * @return MyTimer structure or NULL on error
 */
MyTimer* myos_timer_create(uint32_t id, MyTimerType type);

/**
 * Free timer resources
 * @param timer - Timer pointer
 */
void myos_timer_free(MyTimer *timer);

/**
 * Start timer with duration
 * @param timer - Timer pointer
 * @param duration_ms - Duration in milliseconds
 * @return 0 on success, -1 on error
 */
int myos_timer_start(MyTimer *timer, uint64_t duration_ms);

/**
 * Stop timer
 * @param timer - Timer pointer
 * @return 0 on success, -1 on error
 */
int myos_timer_stop(MyTimer *timer);

/**
 * Pause timer
 * @param timer - Timer pointer
 * @return 0 on success, -1 on error
 */
int myos_timer_pause(MyTimer *timer);

/**
 * Resume timer
 * @param timer - Timer pointer
 * @return 0 on success, -1 on error
 */
int myos_timer_resume(MyTimer *timer);

/**
 * Reset timer
 * @param timer - Timer pointer
 * @return 0 on success, -1 on error
 */
int myos_timer_reset(MyTimer *timer);

/**
 * Get elapsed time in nanoseconds
 * @param timer - Timer pointer
 * @return Elapsed time in nanoseconds, or -1 on error
 */
long myos_timer_elapsed(MyTimer *timer);

/**
 * Get elapsed time in milliseconds
 * @param timer - Timer pointer
 * @return Elapsed time in milliseconds, or -1 on error
 */
long myos_timer_elapsed_ms(MyTimer *timer);

/**
 * Check if timer has expired
 * @param timer - Timer pointer
 * @return 1 if expired, 0 if not expired, -1 on error
 */
int myos_timer_is_expired(MyTimer *timer);

/**
 * Get remaining time in milliseconds
 * @param timer - Timer pointer
 * @return Remaining time in milliseconds, or 0 if expired
 */
long myos_timer_remaining(MyTimer *timer);

/**
 * Get timer state
 * @param timer - Timer pointer
 * @return Timer state, or -1 on error
 */
int myos_timer_state(MyTimer *timer);

/**
 * Get timer ID
 * @param timer - Timer pointer
 * @return Timer ID, or 0xFFFFFFFF on error
 */
uint32_t myos_timer_id(MyTimer *timer);

/**
 * Sleep for specified milliseconds
 * @param ms - Milliseconds to sleep
 * @return 0 on success, -1 on error
 */
int myos_timer_sleep(uint64_t ms);

/**
 * Get timer statistics
 * @param timer - Timer pointer
 * @param elapsed_ms - Output: elapsed time in ms
 * @param remaining_ms - Output: remaining time in ms
 * @return 0 on success, -1 on error
 */
int myos_timer_stats(MyTimer *timer, long *elapsed_ms, long *remaining_ms);

#endif /* MYOS_TIMER_H */
