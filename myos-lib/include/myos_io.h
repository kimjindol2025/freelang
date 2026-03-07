/*
 * MyOS_Lib - IO System
 * myos_io.h - File and console I/O interface
 *
 * Features:
 * - Low-level syscall wrappers
 * - High-level convenience functions
 * - File operations (open, close, read, write, seek)
 * - Console output (puts, println)
 * - No printf (use string formatting instead)
 */

#ifndef MYOS_IO_H
#define MYOS_IO_H

#include "myos_types.h"

/* File descriptor constants */
#define MYOS_STDIN 0
#define MYOS_STDOUT 1
#define MYOS_STDERR 2

/* Open flags (from fcntl.h) */
#define MYOS_O_RDONLY 0        /* Open for reading only */
#define MYOS_O_WRONLY 1        /* Open for writing only */
#define MYOS_O_RDWR 2           /* Open for reading and writing */
#define MYOS_O_CREAT 0x40       /* Create if it doesn't exist */
#define MYOS_O_EXCL 0x80        /* Fail if file exists (with O_CREAT) */
#define MYOS_O_TRUNC 0x200      /* Truncate to zero length */
#define MYOS_O_APPEND 0x400     /* Append to end of file */

/* File permission modes (from stat.h) */
#define MYOS_S_IRUSR 0400       /* Owner read */
#define MYOS_S_IWUSR 0200       /* Owner write */
#define MYOS_S_IXUSR 0100       /* Owner execute */
#define MYOS_S_IRGRP 0040       /* Group read */
#define MYOS_S_IWGRP 0020       /* Group write */
#define MYOS_S_IROTH 0004       /* Others read */

/* Default file permissions */
#define MYOS_S_IDEFAULT (MYOS_S_IRUSR | MYOS_S_IWUSR | MYOS_S_IRGRP | MYOS_S_IROTH)

/* Seek flags (from stdio.h) */
#define MYOS_SEEK_SET 0         /* Beginning of file */
#define MYOS_SEEK_CUR 1         /* Current position */
#define MYOS_SEEK_END 2         /* End of file */

/* File handle structure (optional wrapper) */
typedef struct {
    int fd;                     /* File descriptor */
    int flags;                  /* Open flags */
    uint32_t magic;             /* Magic number */
} MyFile;

/* Magic number for file validation */
#define MYOS_FILE_MAGIC 0xF1F1F1F1

/**
 * Open file
 * @param path - File path
 * @param flags - Open flags (MYOS_O_*)
 * @param mode - Permission mode
 * @return File descriptor (>=0) or -1 on error
 */
int myos_open(const char *path, int flags, int mode);

/**
 * Close file descriptor
 * @param fd - File descriptor
 * @return 0 on success, -1 on error
 */
int myos_close(int fd);

/**
 * Read from file descriptor
 * @param fd - File descriptor
 * @param buf - Buffer to read into
 * @param count - Number of bytes to read
 * @return Number of bytes read, or -1 on error
 */
long myos_read(int fd, void *buf, size_t count);

/**
 * Write to file descriptor
 * @param fd - File descriptor
 * @param buf - Buffer to write
 * @param count - Number of bytes to write
 * @return Number of bytes written, or -1 on error
 */
long myos_write(int fd, const void *buf, size_t count);

/**
 * Seek in file
 * @param fd - File descriptor
 * @param offset - Offset in bytes
 * @param whence - MYOS_SEEK_* flags
 * @return New file position, or -1 on error
 */
long myos_seek(int fd, long offset, int whence);

/**
 * Get current file position
 * @param fd - File descriptor
 * @return Current position, or -1 on error
 */
long myos_tell(int fd);

/**
 * Write string to file descriptor (no newline)
 * @param fd - File descriptor
 * @param str - String to write
 * @return Number of bytes written, or -1 on error
 */
long myos_write_string(int fd, const char *str);

/**
 * Write string to stdout (no newline)
 * @param str - String to write
 * @return 0 on success, -1 on error
 */
int myos_put_string(const char *str);

/**
 * Write string to stdout with newline
 * @param str - String to write
 * @return 0 on success, -1 on error
 */
int myos_put_line(const char *str);

/**
 * Write single character to stdout
 * @param ch - Character to write
 * @return 0 on success, -1 on error
 */
int myos_put_char(char ch);

/**
 * Write formatted integer to buffer
 * @param buf - Output buffer
 * @param value - Integer value
 * @param radix - Base (10 or 16)
 * @return Number of characters written
 */
size_t myos_format_int(char *buf, long value, int radix);

/**
 * Write formatted unsigned integer to buffer
 * @param buf - Output buffer
 * @param value - Unsigned integer value
 * @param radix - Base (10 or 16)
 * @return Number of characters written
 */
size_t myos_format_uint(char *buf, unsigned long value, int radix);

/**
 * Write integer to stdout
 * @param value - Integer to write
 * @return 0 on success, -1 on error
 */
int myos_put_int(long value);

/**
 * Write unsigned integer to stdout (decimal)
 * @param value - Unsigned integer to write
 * @return 0 on success, -1 on error
 */
int myos_put_uint(unsigned long value);

/**
 * Write unsigned integer to stdout (hex)
 * @param value - Unsigned integer to write
 * @return 0 on success, -1 on error
 */
int myos_put_hex(unsigned long value);

/**
 * Create file handle wrapper
 * @param fd - File descriptor
 * @param flags - Open flags
 * @return MyFile structure or NULL on error
 */
MyFile* myos_file_new(int fd, int flags);

/**
 * Close file handle and free memory
 * @param file - File handle
 * @return 0 on success, -1 on error
 */
int myos_file_close(MyFile *file);

/**
 * Read from file handle
 * @param file - File handle
 * @param buf - Buffer to read into
 * @param count - Number of bytes to read
 * @return Number of bytes read, or -1 on error
 */
long myos_file_read(MyFile *file, void *buf, size_t count);

/**
 * Write to file handle
 * @param file - File handle
 * @param buf - Buffer to write
 * @param count - Number of bytes to write
 * @return Number of bytes written, or -1 on error
 */
long myos_file_write(MyFile *file, const void *buf, size_t count);

/**
 * Get file size
 * @param fd - File descriptor
 * @return File size in bytes, or -1 on error
 */
long myos_file_size(int fd);

/**
 * Flush output (no-op for syscall-based IO)
 * @return 0 always
 */
int myos_flush(void);

#endif /* MYOS_IO_H */
