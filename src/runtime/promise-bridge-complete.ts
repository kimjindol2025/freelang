/**
 * Phase 16: PromiseBridge with Complete Cleanup
 *
 * 비동기 콜백을 추적하고 정리하는 메커니즘
 * - 타이머 콜백 등록/실행
 * - 완전한 리소스 정리 (cleanup)
 * - pending callbacks 추적
 */

export interface PendingCallback {
  id: number;
  handler: (...args: any[]) => void;
  timestamp: number;
  timeout?: NodeJS.Timeout;
}

export class PromiseBridge {
  private pendingCallbacks = new Map<number, PendingCallback>();
  private nextCallbackId = 1;
  private allTimeouts = new Set<NodeJS.Timeout>();

  /**
   * 콜백 등록
   */
  registerCallback(handler: (...args: any[]) => void): number {
    const id = this.nextCallbackId++;
    this.pendingCallbacks.set(id, {
      id,
      handler,
      timestamp: Date.now()
    });
    return id;
  }

  /**
   * 타이머 등록 (정리 가능하도록)
   */
  setTimeout(handler: () => void, ms: number): number {
    const callbackId = this.registerCallback(handler);
    const timeout = global.setTimeout(() => {
      this.executeCallback(callbackId);
    }, ms);

    this.allTimeouts.add(timeout);

    // 콜백 객체에 timeout 저장 (나중에 정리용)
    const callback = this.pendingCallbacks.get(callbackId);
    if (callback) {
      callback.timeout = timeout;
    }

    return callbackId;
  }

  /**
   * 콜백 실행
   */
  executeCallback(callbackId: number): void {
    const callback = this.pendingCallbacks.get(callbackId);
    if (!callback) {
      console.warn(`[PromiseBridge] Unknown callback ID: ${callbackId}`);
      return;
    }

    try {
      callback.handler();
    } finally {
      this.pendingCallbacks.delete(callbackId);
    }
  }

  /**
   * 모든 pending callbacks 정리 (CRITICAL)
   */
  cleanup(): void {
    // 모든 타이머 취소
    for (const timeout of this.allTimeouts) {
      clearTimeout(timeout);
    }
    this.allTimeouts.clear();

    // 모든 pending callbacks 정리
    this.pendingCallbacks.clear();
  }

  /**
   * Pending callbacks 수
   */
  getPendingCount(): number {
    return this.pendingCallbacks.size;
  }

  /**
   * 상태 확인
   */
  getStats(): any {
    return {
      pendingCallbacks: this.pendingCallbacks.size,
      pendingTimeouts: this.allTimeouts.size,
      nextCallbackId: this.nextCallbackId
    };
  }
}

// 싱글톤 인스턴스
export const promiseBridge = new PromiseBridge();
