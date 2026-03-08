/*
 * MyOS_Lib - Timer System Implementation
 * src/timer.c - High-precision timing implementation
 */

#include "../include/myos_timer.h"
#include "../include/myos_types.h"

/* External syscall wrapper */
extern long myos_syscall2(long syscall_number, long arg1, long arg2);
extern long myos_syscall3(long syscall_number, long arg1, long arg2, long arg3);

/* clock_gettime syscall number for x86-64 Linux */
#define SYS_clock_gettime 228

/* Clock IDs */
#define CLOCK_MONOTONIC 1
#define CLOCK_REALTIME 0

/* Timespec structure (for clock_gettime) */
struct timespec {
    long tv_sec;
    long tv_nsec;
};

/**
 * Get current time in nanoseconds using clock_gettime
 */
uint64_t myos_timer_now(void) {
    struct timespec ts;

    /* Call clock_gettime(CLOCK_MONOTONIC, &ts) */
    long ret = myos_syscall2(SYS_clock_gettime, (long)CLOCK_MONOTONIC, (long)&ts);

    if (ret < 0) return 0;

    /* Convert to nanoseconds: seconds * 1e9 + nanoseconds */
    uint64_t result = (uint64_t)ts.tv_sec * 1000000000UL + (uint64_t)ts.tv_nsec;
    return result;
}

/**
 * Get current time as MyTime structure
 */
int myos_timer_get_time(MyTime *time) {
    if (!time) return -1;

    struct timespec ts;
    long ret = myos_syscall2(SYS_clock_gettime, (long)CLOCK_MONOTONIC, (long)&ts);

    if (ret < 0) return -1;

    time->seconds = ts.tv_sec;
    time->nanoseconds = ts.tv_nsec;

    return 0;
}

/**
 * Create a timer
 */
MyTimer* myos_timer_create(uint32_t id, MyTimerType type) {
    if (id == 0xFFFFFFFF) return NULL;

    /* Stack allocation (in real code would use allocator) */
    /* For now, return NULL as we don't have heap here */
    return NULL;
}

/**
 * Free timer resources
 */
void myos_timer_free(MyTimer *timer) {
    if (!timer) return;
    /* No-op for stack-allocated timer */
}

/**
 * Start timer with duration
 */
int myos_timer_start(MyTimer *timer, uint64_t duration_ms) {
    if (!timer) return -1;

    /* Validate timer magic */
    if (timer->magic != MYOS_TIMER_MAGIC) return -1;

    /* Convert milliseconds to nanoseconds */
    timer->duration = duration_ms * 1000000UL;

    /* Set start time */
    timer->start_time = myos_timer_now();

    /* Set state to running */
    timer->state = MYOS_TIMER_RUNNING;
    timer->elapsed = 0;

    return 0;
}

/**
 * Stop timer
 */
int myos_timer_stop(MyTimer *timer) {
    if (!timer) return -1;

    if (timer->magic != MYOS_TIMER_MAGIC) return -1;

    timer->state = MYOS_TIMER_STOPPED;
    timer->elapsed = 0;

    return 0;
}

/**
 * Pause timer
 */
int myos_timer_pause(MyTimer *timer) {
    if (!timer) return -1;

    if (timer->magic != MYOS_TIMER_MAGIC) return -1;

    if (timer->state != MYOS_TIMER_RUNNING) return -1;

    /* Calculate elapsed time */
    uint64_t now = myos_timer_now();
    timer->elapsed = now - timer->start_time;

    timer->state = MYOS_TIMER_PAUSED;

    return 0;
}

/**
 * Resume timer
 */
int myos_timer_resume(MyTimer *timer) {
    if (!timer) return -1;

    if (timer->magic != MYOS_TIMER_MAGIC) return -1;

    if (timer->state != MYOS_TIMER_PAUSED) return -1;

    /* Adjust start time to account for paused time */
    uint64_t now = myos_timer_now();
    timer->start_time = now - timer->elapsed;

    timer->state = MYOS_TIMER_RUNNING;

    return 0;
}

/**
 * Reset timer
 */
int myos_timer_reset(MyTimer *timer) {
    if (!timer) return -1;

    if (timer->magic != MYOS_TIMER_MAGIC) return -1;

    timer->start_time = 0;
    timer->elapsed = 0;
    timer->state = MYOS_TIMER_STOPPED;

    return 0;
}

/**
 * Get elapsed time in nanoseconds
 */
long myos_timer_elapsed(MyTimer *timer) {
    if (!timer) return -1;

    if (timer->magic != MYOS_TIMER_MAGIC) return -1;

    if (timer->state == MYOS_TIMER_STOPPED) {
        return (long)timer->elapsed;
    }

    if (timer->state == MYOS_TIMER_PAUSED) {
        return (long)timer->elapsed;
    }

    if (timer->state == MYOS_TIMER_RUNNING) {
        uint64_t now = myos_timer_now();
        uint64_t elapsed = now - timer->start_time;
        return (long)elapsed;
    }

    return -1;
}

/**
 * Get elapsed time in milliseconds
 */
long myos_timer_elapsed_ms(MyTimer *timer) {
    long ns = myos_timer_elapsed(timer);
    if (ns < 0) return -1;

    /* Convert nanoseconds to milliseconds */
    return ns / 1000000;
}

/**
 * Check if timer has expired
 */
int myos_timer_is_expired(MyTimer *timer) {
    if (!timer) return -1;

    if (timer->magic != MYOS_TIMER_MAGIC) return -1;

    if (timer->state == MYOS_TIMER_STOPPED) return 0;

    if (timer->state == MYOS_TIMER_PAUSED) {
        /* Paused timers are not expired */
        return 0;
    }

    if (timer->state == MYOS_TIMER_RUNNING) {
        uint64_t now = myos_timer_now();
        uint64_t elapsed = now - timer->start_time;

        if (elapsed >= timer->duration) {
            return 1;
        }
        return 0;
    }

    return -1;
}

/**
 * Get remaining time in milliseconds
 */
long myos_timer_remaining(MyTimer *timer) {
    if (!timer) return -1;

    if (timer->magic != MYOS_TIMER_MAGIC) return -1;

    long elapsed_ms = myos_timer_elapsed_ms(timer);
    if (elapsed_ms < 0) return 0;

    long duration_ms = (long)(timer->duration / 1000000);
    long remaining = duration_ms - elapsed_ms;

    if (remaining < 0) remaining = 0;

    return remaining;
}

/**
 * Get timer state
 */
int myos_timer_state(MyTimer *timer) {
    if (!timer) return -1;

    if (timer->magic != MYOS_TIMER_MAGIC) return -1;

    return (int)timer->state;
}

/**
 * Get timer ID
 */
uint32_t myos_timer_id(MyTimer *timer) {
    if (!timer) return 0xFFFFFFFF;

    if (timer->magic != MYOS_TIMER_MAGIC) return 0xFFFFFFFF;

    return timer->id;
}

/**
 * Sleep for specified milliseconds
 */
int myos_timer_sleep(uint64_t ms) {
    if (ms == 0) return 0;

    uint64_t target_ns = ms * 1000000UL;
    uint64_t start = myos_timer_now();

    while (1) {
        uint64_t now = myos_timer_now();
        uint64_t elapsed = now - start;

        if (elapsed >= target_ns) {
            break;
        }
    }

    return 0;
}

/**
 * Get timer statistics
 */
int myos_timer_stats(MyTimer *timer, long *elapsed_ms, long *remaining_ms) {
    if (!timer || !elapsed_ms || !remaining_ms) return -1;

    if (timer->magic != MYOS_TIMER_MAGIC) return -1;

    *elapsed_ms = myos_timer_elapsed_ms(timer);
    if (*elapsed_ms < 0) return -1;

    *remaining_ms = myos_timer_remaining(timer);
    if (*remaining_ms < 0) return -1;

    return 0;
}
