/*
 * MyOS_Lib - IO System Implementation
 * src/io.c - File and console I/O operations
 */

#include "../include/myos_io.h"
#include "../include/myos_types.h"

/* External syscall wrappers (from arch/x86_64/syscall.c) */
extern int myos_open(const char *path, int flags, int mode);
extern int myos_close(int fd);
extern long myos_read(int fd, void *buf, size_t count);
extern long myos_write(int fd, const void *buf, size_t count);
extern long myos_seek(int fd, long offset, int whence);

/**
 * Get current file position
 */
long myos_tell(int fd) {
    return myos_seek(fd, 0, MYOS_SEEK_CUR);
}

/**
 * Get file size
 */
long myos_file_size(int fd) {
    long current = myos_seek(fd, 0, MYOS_SEEK_CUR);
    if (current < 0) return -1;

    long size = myos_seek(fd, 0, MYOS_SEEK_END);
    if (size < 0) return -1;

    myos_seek(fd, current, MYOS_SEEK_SET);
    return size;
}

/**
 * Write string to file descriptor
 */
long myos_write_string(int fd, const char *str) {
    if (!str) return -1;

    size_t len = 0;
    while (str[len]) len++;

    return myos_write(fd, str, len);
}

/**
 * Write string to stdout
 */
int myos_put_string(const char *str) {
    if (myos_write_string(MYOS_STDOUT, str) < 0) {
        return -1;
    }
    return 0;
}

/**
 * Write string to stdout with newline
 */
int myos_put_line(const char *str) {
    if (myos_put_string(str) < 0) {
        return -1;
    }
    return myos_put_char('\n');
}

/**
 * Write single character
 */
int myos_put_char(char ch) {
    if (myos_write(MYOS_STDOUT, &ch, 1) < 0) {
        return -1;
    }
    return 0;
}

/**
 * Format integer to string (decimal or hex)
 */
size_t myos_format_int(char *buf, long value, int radix) {
    if (!buf || (radix != 10 && radix != 16)) {
        return 0;
    }

    char temp[32];
    size_t pos = 0;
    bool negative = (value < 0);

    if (negative) {
        value = -value;
    }

    /* Reverse conversion to temp buffer */
    do {
        int digit = value % radix;
        temp[pos++] = (digit < 10) ? ('0' + digit) : ('a' + digit - 10);
        value /= radix;
    } while (value > 0);

    /* Handle negative sign */
    if (negative) {
        temp[pos++] = '-';
    }

    /* Reverse and copy to output */
    size_t out_pos = 0;
    for (int i = (int)pos - 1; i >= 0; i--) {
        buf[out_pos++] = temp[i];
    }

    return out_pos;
}

/**
 * Format unsigned integer to string
 */
size_t myos_format_uint(char *buf, unsigned long value, int radix) {
    if (!buf || (radix != 10 && radix != 16)) {
        return 0;
    }

    char temp[32];
    size_t pos = 0;

    do {
        int digit = value % radix;
        temp[pos++] = (digit < 10) ? ('0' + digit) : ('a' + digit - 10);
        value /= radix;
    } while (value > 0);

    /* Reverse and copy to output */
    size_t out_pos = 0;
    for (int i = (int)pos - 1; i >= 0; i--) {
        buf[out_pos++] = temp[i];
    }

    return out_pos;
}

/**
 * Write integer to stdout (decimal)
 */
int myos_put_int(long value) {
    char buf[32];
    size_t len = myos_format_int(buf, value, 10);
    if (len == 0) return -1;

    if (myos_write(MYOS_STDOUT, buf, len) < 0) {
        return -1;
    }
    return 0;
}

/**
 * Write unsigned integer to stdout
 */
int myos_put_uint(unsigned long value) {
    char buf[32];
    size_t len = myos_format_uint(buf, value, 10);
    if (len == 0) return -1;

    if (myos_write(MYOS_STDOUT, buf, len) < 0) {
        return -1;
    }
    return 0;
}

/**
 * Write unsigned integer to stdout (hex)
 */
int myos_put_hex(unsigned long value) {
    char buf[32];
    size_t len = myos_format_uint(buf, value, 16);
    if (len == 0) return -1;

    if (myos_write(MYOS_STDOUT, buf, len) < 0) {
        return -1;
    }
    return 0;
}

/**
 * Create file handle
 */
MyFile* myos_file_new(int fd, int flags) {
    if (fd < 0) return NULL;

    /* Allocate on stack (in real code, would use allocator) */
    /* For now, return NULL as we don't have heap here */
    return NULL;
}

/**
 * Close file handle
 */
int myos_file_close(MyFile *file) {
    if (!file || file->magic != MYOS_FILE_MAGIC) {
        return -1;
    }
    return myos_close(file->fd);
}

/**
 * Read from file handle
 */
long myos_file_read(MyFile *file, void *buf, size_t count) {
    if (!file || file->magic != MYOS_FILE_MAGIC) {
        return -1;
    }
    return myos_read(file->fd, buf, count);
}

/**
 * Write to file handle
 */
long myos_file_write(MyFile *file, const void *buf, size_t count) {
    if (!file || file->magic != MYOS_FILE_MAGIC) {
        return -1;
    }
    return myos_write(file->fd, buf, count);
}

/**
 * Flush output (no-op for direct syscalls)
 */
int myos_flush(void) {
    return 0;
}

/**
 * Helper: print debug info to stderr
 */
void myos_debug_print(const char *msg) {
    myos_write(MYOS_STDERR, msg, myos_write_string(MYOS_STDERR, msg));
}
