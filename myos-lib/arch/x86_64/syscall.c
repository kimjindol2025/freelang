/*
 * MyOS_Lib - x86-64 Syscall Interface
 * arch/x86_64/syscall.c - Low-level syscall assembly wrappers
 *
 * These are the raw syscall interfaces for x86-64 Linux
 */

#include "../../include/myos_types.h"

/**
 * Generic syscall interface (inline assembly)
 * This uses the x86-64 System V ABI calling convention
 *
 * Arguments are passed in: rdi, rsi, rdx, rcx/r10, r8, r9
 * Return value is in: rax
 * Note: rcx is clobbered by syscall, use r10 for 4th arg
 */

long myos_syscall0(long syscall_number) {
    long ret;
    asm volatile(
        "syscall"
        : "=a" (ret)
        : "a" (syscall_number)
        : "rcx", "r11", "memory"
    );
    return ret;
}

long myos_syscall1(long syscall_number, long arg1) {
    long ret;
    asm volatile(
        "syscall"
        : "=a" (ret)
        : "a" (syscall_number), "D" (arg1)
        : "rcx", "r11", "memory"
    );
    return ret;
}

long myos_syscall2(long syscall_number, long arg1, long arg2) {
    long ret;
    asm volatile(
        "syscall"
        : "=a" (ret)
        : "a" (syscall_number), "D" (arg1), "S" (arg2)
        : "rcx", "r11", "memory"
    );
    return ret;
}

long myos_syscall3(long syscall_number, long arg1, long arg2, long arg3) {
    long ret;
    asm volatile(
        "syscall"
        : "=a" (ret)
        : "a" (syscall_number), "D" (arg1), "S" (arg2), "d" (arg3)
        : "rcx", "r11", "memory"
    );
    return ret;
}

long myos_syscall4(long syscall_number, long arg1, long arg2, long arg3, long arg4) {
    long ret;
    register long r10 asm("r10") = arg4;
    asm volatile(
        "syscall"
        : "=a" (ret)
        : "a" (syscall_number), "D" (arg1), "S" (arg2), "d" (arg3), "r" (r10)
        : "rcx", "r11", "memory"
    );
    return ret;
}

long myos_syscall5(long syscall_number, long arg1, long arg2, long arg3, long arg4, long arg5) {
    long ret;
    register long r10 asm("r10") = arg4;
    asm volatile(
        "syscall"
        : "=a" (ret)
        : "a" (syscall_number), "D" (arg1), "S" (arg2), "d" (arg3), "r" (r10), "r" (arg5)
        : "rcx", "r11", "memory"
    );
    return ret;
}

long myos_syscall6(long syscall_number, long arg1, long arg2, long arg3, long arg4, long arg5, long arg6) {
    long ret;
    register long r10 asm("r10") = arg4;
    register long r8_reg asm("r8") = arg5;
    register long r9_reg asm("r9") = arg6;
    asm volatile(
        "syscall"
        : "=a" (ret)
        : "a" (syscall_number), "D" (arg1), "S" (arg2), "d" (arg3), "r" (r10), "r" (r8_reg), "r" (r9_reg)
        : "rcx", "r11", "memory"
    );
    return ret;
}

/* Convenience wrappers for common syscalls */

long myos_write(int fd, const void *buf, size_t count) {
    return myos_syscall3(SYS_write, (long)fd, (long)buf, (long)count);
}

long myos_read(int fd, void *buf, size_t count) {
    return myos_syscall3(SYS_read, (long)fd, (long)buf, (long)count);
}

int myos_open(const char *path, int flags, int mode) {
    return (int)myos_syscall3(SYS_open, (long)path, (long)flags, (long)mode);
}

int myos_close(int fd) {
    return (int)myos_syscall1(SYS_close, (long)fd);
}

long myos_seek(int fd, long offset, int whence) {
    return myos_syscall3(SYS_lseek, (long)fd, offset, (long)whence);
}

void* myos_mmap(void *addr, size_t length, int prot, int flags, int fd, long offset) {
    return (void *)myos_syscall6(SYS_mmap, (long)addr, (long)length, (long)prot, (long)flags, (long)fd, offset);
}

int myos_munmap(void *addr, size_t length) {
    return (int)myos_syscall2(SYS_munmap, (long)addr, (long)length);
}

int myos_mprotect(void *addr, size_t length, int prot) {
    return (int)myos_syscall3(SYS_mprotect, (long)addr, (long)length, (long)prot);
}

void myos_exit(int status) {
    myos_syscall1(SYS_exit_group, (long)status);
    /* Never returns */
    while(1);
}
