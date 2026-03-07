/*
 * MyOS_Lib - Logging System
 * myos_log.h - Structured logging interface
 *
 * Features:
 * - Log levels: DEBUG, INFO, WARN, ERROR, FATAL
 * - Timestamped output
 * - Console and file logging
 * - Color-coded output (optional)
 * - No printf dependency
 */

#ifndef MYOS_LOG_H
#define MYOS_LOG_H

#include "myos_types.h"

/* Log levels */
typedef enum {
    MYOS_LOG_DEBUG = 0,
    MYOS_LOG_INFO = 1,
    MYOS_LOG_WARN = 2,
    MYOS_LOG_ERROR = 3,
    MYOS_LOG_FATAL = 4
} MyLogLevel;

/* Log formatter output buffer size */
#define MYOS_LOG_BUFFER_SIZE 512
#define MYOS_LOG_TIME_BUFFER 32

/* Logger structure */
typedef struct {
    int fd;                     /* Output file descriptor (1=stdout, 2=stderr) */
    MyLogLevel level;           /* Minimum log level to output */
    uint32_t magic;             /* Magic number for validation */
} MyLogger;

/* Magic number for logger validation */
#define MYOS_LOGGER_MAGIC 0x10AAAA00

/**
 * Initialize logger
 * @param fd - File descriptor (1=stdout, 2=stderr)
 * @param level - Minimum log level to display
 * @return MyLogger structure
 */
MyLogger* myos_logger_new(int fd, MyLogLevel level);

/**
 * Free logger resources
 * @param logger - Logger pointer
 */
void myos_logger_free(MyLogger *logger);

/**
 * Set log level
 * @param logger - Logger pointer
 * @param level - New log level
 * @return 0 on success, -1 on error
 */
int myos_logger_set_level(MyLogger *logger, MyLogLevel level);

/**
 * Get log level name
 * @param level - Log level
 * @return Level name string (DEBUG, INFO, WARN, ERROR, FATAL)
 */
const char* myos_log_level_name(MyLogLevel level);

/**
 * Get current time as string
 * @param buf - Output buffer
 * @param size - Buffer size
 * @return Number of characters written
 */
size_t myos_log_get_time(char *buf, size_t size);

/**
 * Format log message with timestamp and level
 * @param buf - Output buffer
 * @param size - Buffer size
 * @param level - Log level
 * @param msg - Log message
 * @return Number of characters written
 */
size_t myos_log_format(char *buf, size_t size, MyLogLevel level, const char *msg);

/**
 * Write log message
 * @param logger - Logger pointer
 * @param level - Log level
 * @param msg - Message to log
 * @return 0 on success, -1 on error
 */
int myos_log_write(MyLogger *logger, MyLogLevel level, const char *msg);

/**
 * Log at DEBUG level
 * @param logger - Logger pointer
 * @param msg - Message to log
 * @return 0 on success, -1 on error
 */
int myos_log_debug(MyLogger *logger, const char *msg);

/**
 * Log at INFO level
 * @param logger - Logger pointer
 * @param msg - Message to log
 * @return 0 on success, -1 on error
 */
int myos_log_info(MyLogger *logger, const char *msg);

/**
 * Log at WARN level
 * @param logger - Logger pointer
 * @param msg - Message to log
 * @return 0 on success, -1 on error
 */
int myos_log_warn(MyLogger *logger, const char *msg);

/**
 * Log at ERROR level
 * @param logger - Logger pointer
 * @param msg - Message to log
 * @return 0 on success, -1 on error
 */
int myos_log_error(MyLogger *logger, const char *msg);

/**
 * Log at FATAL level (does not exit)
 * @param logger - Logger pointer
 * @param msg - Message to log
 * @return 0 on success, -1 on error
 */
int myos_log_fatal(MyLogger *logger, const char *msg);

/**
 * Flush logger output
 * @param logger - Logger pointer
 * @return 0 always
 */
int myos_log_flush(MyLogger *logger);

#endif /* MYOS_LOG_H */
