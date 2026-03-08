/*
 * MyOS_Lib - Zero-Dependency Operating System Library
 * myos_types.h - Basic type definitions
 *
 * This file defines fundamental types used throughout MyOS_Lib
 * without depending on any standard library headers.
 */

#ifndef MYOS_TYPES_H
#define MYOS_TYPES_H

/* Integer types - platform independent */
typedef unsigned char uint8_t;
typedef signed char int8_t;
typedef unsigned short uint16_t;
typedef signed short int16_t;
typedef unsigned int uint32_t;
typedef signed int int32_t;
typedef unsigned long uint64_t;
typedef signed long int64_t;

/* Size and pointer types */
typedef unsigned long size_t;
typedef signed long ssize_t;
typedef unsigned long uintptr_t;
typedef signed long intptr_t;

/* Boolean type */
typedef int bool;
#define true 1
#define false 0

/* Null pointer */
#define NULL ((void *)0)

/* Standard file descriptors */
#define STDIN_FILENO 0
#define STDOUT_FILENO 1
#define STDERR_FILENO 2

/* Architecture-specific syscall numbers (x86-64 Linux) */
#define SYS_read 0
#define SYS_write 1
#define SYS_open 2
#define SYS_close 3
#define SYS_lseek 8
#define SYS_mmap 9
#define SYS_munmap 11
#define SYS_mprotect 10
#define SYS_exit 60
#define SYS_exit_group 231

/* Memory protection flags */
#define PROT_NONE 0x0
#define PROT_READ 0x1
#define PROT_WRITE 0x2
#define PROT_EXEC 0x4

/* Memory mapping flags */
#define MAP_SHARED 0x01
#define MAP_PRIVATE 0x02
#define MAP_ANONYMOUS 0x20
#define MAP_FAILED ((void *)-1)

/* File open flags */
#define O_RDONLY 0
#define O_WRONLY 1
#define O_RDWR 2
#define O_CREAT 0x40
#define O_APPEND 0x400
#define O_TRUNC 0x200

/* File permission modes */
#define S_IRUSR 0400
#define S_IWUSR 0200
#define S_IXUSR 0100

/* Seek flags */
#define SEEK_SET 0
#define SEEK_CUR 1
#define SEEK_END 2

#endif /* MYOS_TYPES_H */
