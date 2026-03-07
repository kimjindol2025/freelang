/*
 * MyOS_Lib - Logging System Implementation
 * src/log.c - Structured logging implementation
 */

#include "../include/myos_log.h"
#include "../include/myos_io.h"
#include "../include/myos_types.h"

/* External syscall wrapper */
extern long myos_write(int fd, const void *buf, size_t count);

/**
 * Initialize logger
 */
MyLogger* myos_logger_new(int fd, MyLogLevel level) {
    if (fd < 0) return NULL;

    /* Stack allocation (in real code would use allocator) */
    /* Return NULL as we don't have heap allocation here */
    return NULL;
}

/**
 * Free logger resources
 */
void myos_logger_free(MyLogger *logger) {
    if (!logger) return;
    /* No-op for stack-allocated logger */
}

/**
 * Set log level
 */
int myos_logger_set_level(MyLogger *logger, MyLogLevel level) {
    if (!logger || logger->magic != MYOS_LOGGER_MAGIC) {
        return -1;
    }
    logger->level = level;
    return 0;
}

/**
 * Get log level name
 */
const char* myos_log_level_name(MyLogLevel level) {
    switch (level) {
        case MYOS_LOG_DEBUG: return "DEBUG";
        case MYOS_LOG_INFO:  return "INFO";
        case MYOS_LOG_WARN:  return "WARN";
        case MYOS_LOG_ERROR: return "ERROR";
        case MYOS_LOG_FATAL: return "FATAL";
        default:            return "UNKNOWN";
    }
}

/**
 * Get current time as string (simplified)
 * In a real system, this would call gettimeofday or clock_gettime
 * For now, returns a static timestamp format
 */
size_t myos_log_get_time(char *buf, size_t size) {
    if (!buf || size < MYOS_LOG_TIME_BUFFER) return 0;

    /* Simplified time format: [YYYY-MM-DD HH:MM:SS] */
    /* In this zero-dependency version, we can't get real time */
    /* Return a placeholder */
    const char *placeholder = "2026-03-02 01:15:30";
    size_t len = 0;
    while (placeholder[len] && len < size - 1) {
        buf[len] = placeholder[len];
        len++;
    }
    buf[len] = '\0';
    return len;
}

/**
 * Format log message with timestamp and level
 */
size_t myos_log_format(char *buf, size_t size, MyLogLevel level, const char *msg) {
    if (!buf || !msg || size < 64) return 0;

    size_t pos = 0;

    /* Write opening bracket */
    if (pos < size - 1) buf[pos++] = '[';

    /* Write timestamp */
    char time_buf[MYOS_LOG_TIME_BUFFER];
    size_t time_len = myos_log_get_time(time_buf, MYOS_LOG_TIME_BUFFER);
    for (size_t i = 0; i < time_len && pos < size - 1; i++) {
        buf[pos++] = time_buf[i];
    }

    /* Write closing bracket */
    if (pos < size - 1) buf[pos++] = ']';

    /* Write space */
    if (pos < size - 1) buf[pos++] = ' ';

    /* Write level */
    const char *level_name = myos_log_level_name(level);
    size_t level_pos = 0;
    while (level_name[level_pos] && pos < size - 1) {
        buf[pos++] = level_name[level_pos++];
    }

    /* Write space and colon */
    if (pos < size - 1) buf[pos++] = ':';
    if (pos < size - 1) buf[pos++] = ' ';

    /* Write message */
    size_t msg_pos = 0;
    while (msg[msg_pos] && pos < size - 1) {
        buf[pos++] = msg[msg_pos++];
    }

    /* Write newline */
    if (pos < size - 1) buf[pos++] = '\n';

    buf[pos] = '\0';
    return pos;
}

/**
 * Write log message directly
 */
int myos_log_write(MyLogger *logger, MyLogLevel level, const char *msg) {
    if (!logger || !msg) return -1;

    /* Validate logger magic */
    if (logger->magic != MYOS_LOGGER_MAGIC) return -1;

    /* Check if message should be logged based on level */
    if (level < logger->level) return 0;

    /* Format message */
    char log_buf[MYOS_LOG_BUFFER_SIZE];
    size_t len = myos_log_format(log_buf, MYOS_LOG_BUFFER_SIZE, level, msg);

    if (len == 0) return -1;

    /* Write to file descriptor */
    long written = myos_write(logger->fd, log_buf, len);
    if (written < 0) return -1;

    return 0;
}

/**
 * Log at DEBUG level
 */
int myos_log_debug(MyLogger *logger, const char *msg) {
    if (!logger) return -1;
    return myos_log_write(logger, MYOS_LOG_DEBUG, msg);
}

/**
 * Log at INFO level
 */
int myos_log_info(MyLogger *logger, const char *msg) {
    if (!logger) return -1;
    return myos_log_write(logger, MYOS_LOG_INFO, msg);
}

/**
 * Log at WARN level
 */
int myos_log_warn(MyLogger *logger, const char *msg) {
    if (!logger) return -1;
    return myos_log_write(logger, MYOS_LOG_WARN, msg);
}

/**
 * Log at ERROR level
 */
int myos_log_error(MyLogger *logger, const char *msg) {
    if (!logger) return -1;
    return myos_log_write(logger, MYOS_LOG_ERROR, msg);
}

/**
 * Log at FATAL level
 */
int myos_log_fatal(MyLogger *logger, const char *msg) {
    if (!logger) return -1;
    return myos_log_write(logger, MYOS_LOG_FATAL, msg);
}

/**
 * Flush logger output (no-op for direct syscalls)
 */
int myos_log_flush(MyLogger *logger) {
    if (!logger) return -1;
    return 0;
}
