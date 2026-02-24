# SRE 메모리 패턴 자동 판정 로직
**실무급 자동 판정 엔진 (감정 배제)**

---

## 🧮 입력 형식

```json
{
  "test_name": "string",
  "rss_start_mb": number,
  "rss_end_mb": number,
  "heap_fragmentation": number,
  "arena_count": number,
  "fd_delta": number,
  "timer_count": number,
  "gc_collections": number,
  "test_duration_sec": number
}
```

---

## 📋 Step 1: 기본 누수 검사

### Rule 1.1: FD 누수
```
IF fd_delta > 0:
  FAIL "File descriptor leak detected"
```

### Rule 1.2: 타이머 누수
```
IF timer_count > 100:
  FAIL "Timer handle leak (>100)"
```

### Rule 1.3: 메모리 급증
```
delta_mb = rss_end_mb - rss_start_mb
IF delta_mb > rss_start_mb * 0.5:  # 50% 이상 증가
  WARN "Excessive memory growth"
```

---

## 🔍 Step 2: 메모리 변화 분류

### Pattern A: 정상 범위
```
-50MB ≤ delta_mb ≤ +150MB
→ Category: NORMAL
```

### Pattern B: 경계 범위 (재테스트 필요)
```
(-200MB ≤ delta_mb < -50MB) OR (+150MB < delta_mb ≤ +300MB)
→ Category: BOUNDARY
→ Action: Retest
```

### Pattern C: 위험 범위
```
delta_mb < -200MB OR delta_mb > +300MB
→ Category: CRITICAL
→ Action: Investigate
```

---

## 🎯 Step 3: 반복성 검사 (3회 테스트)

### 통계 계산
```python
test_results = [test1_delta, test2_delta, test3_delta]
mean = avg(test_results)
std_dev = stdev(test_results)
variance = std_dev / abs(mean) if mean != 0 else 999
```

### 안정성 판정
```
IF variance < 0.15:  # CV < 15%
  VERDICT: STABLE ✅

IF 0.15 ≤ variance < 0.4:  # CV 15-40%
  VERDICT: ACCEPTABLE ⚠️

IF variance ≥ 0.4:  # CV ≥ 40%
  VERDICT: UNSTABLE ❌
```

---

## 🧠 Step 4: GC 분석

### GC 정상성
```
gc_per_minute = (gc_collections / test_duration_sec) * 60

IF gc_per_minute < 1:
  gc_health = "NORMAL"

IF 1 ≤ gc_per_minute < 5:
  gc_health = "ACCEPTABLE"

IF gc_per_minute ≥ 5:
  gc_health = "AGGRESSIVE"
  → Consider as partial explanation for delta
```

---

## 🎯 Step 5: 최종 판정 테이블

| 조건 | FD | Timer | Memory | Stability | GC | Verdict |
|------|-----|--------|---------|-----------|-----|---------|
| A | ✅ | ✅ | ✅ | STABLE | Normal | 🟢 GO |
| B | ✅ | ✅ | ✅ | ACCEPTABLE | Normal | 🟢 GO |
| C | ✅ | ✅ | ⚠️ | ACCEPTABLE | Aggr. | 🟡 HOLD |
| D | ✅ | ✅ | ⚠️ | UNSTABLE | - | 🟡 HOLD |
| E | ✅ | ✅ | ❌ | - | - | 🔴 FAIL |
| F | ❌ | - | - | - | - | 🔴 FAIL |
| G | - | ❌ | - | - | - | 🔴 FAIL |

---

## 💾 현재 데이터 적용

### 입력 데이터 (현재)
```
Test 1:
  rss_start: 112MB
  rss_end: 254MB
  delta: +142MB
  fd_delta: 0

Test 2:
  rss_start: 397MB
  rss_end: 45MB
  delta: -352MB
  fd_delta: 0
```

### 패턴 분석
```
Test1 delta: +142MB → Category: BOUNDARY (+150MB 근처)
Test2 delta: -352MB → Category: CRITICAL (급락)

Variance: UNSTABLE (패턴 불일치)
```

### 현재 판정
```
🟡 HOLD - Retest required

이유:
  1. Test1과 Test2 패턴 불일치
  2. Test2 급락 원인 미확인
  3. 통계량 부족 (2회 < 3회)
```

---

## 🔬 재테스트 계획 (Test 3)

### 수집해야 할 메트릭

```bash
#!/bin/bash

# 1. 기본 메모리
RSS_START=$(ps aux | grep freelang | awk '{sum+=$6} END {print sum/1024}')

# 2. Heap 정보
HEAP_INFO=$(cat /proc/$(pgrep freelang)/status | grep -E "VmPeak|VmHWM")

# 3. Arena 정보
ARENA_COUNT=$(cat /proc/$(pgrep freelang)/maps | grep heap | wc -l)

# 4. FD 상태
FD_COUNT=$(lsof -p $(pgrep freelang) | wc -l)

# 5. 타이머
TIMER_COUNT=$(cat /proc/$(pgrep freelang)/fd | wc -l)

# 6. GC 통계 (if available)
GC_COLLECTIONS=$(cat /proc/$(pgrep freelang)/status | grep -i gc)

# 7. 메모리 테스트 실행 (4시간)
# ... 테스트 ...

# 8. 최종 메모리
RSS_END=$(ps aux | grep freelang | awk '{sum+=$6} END {print sum/1024}')

echo "$RSS_START,$RSS_END,$ARENA_COUNT,$FD_COUNT,$TIMER_COUNT" >> test3_metrics.csv
```

---

## 📊 재테스트 후 판정 예시

### Scenario 1: Test3 = Test2 유사 (정상)
```
Test1: +142MB
Test2: -352MB
Test3: -350MB

Variance: LOW (Test2, Test3 일치)
→ Verdict: 🟢 GO
이유: 메모리 축소 패턴이 일관됨 (정상 GC)
```

### Scenario 2: Test3 = Test1 유사 (불안정)
```
Test1: +142MB
Test2: -352MB
Test3: +140MB

Variance: HIGH (패턴 불일치)
→ Verdict: 🟡 HOLD
이유: 매번 다른 패턴 (원인 미확인)
```

### Scenario 3: Test3 = 또 다른 패턴 (위험)
```
Test1: +142MB
Test2: -352MB
Test3: +500MB (계속 증가)

Variance: CRITICAL
→ Verdict: 🔴 FAIL
이유: 메모리 누수 가능성
```

---

## 🚀 자동 판정 실행 (Python)

```python
#!/usr/bin/env python3

import statistics
import json

def sre_memory_verdict(tests):
    """
    tests = [
        {"name": "test1", "start": 112, "end": 254},
        {"name": "test2", "start": 397, "end": 45},
        {"name": "test3", "start": ?, "end": ?}
    ]
    """

    # 기본 검사
    if any(t.get('fd_delta', 0) > 0 for t in tests):
        return "🔴 FAIL", "File descriptor leak"

    # 메모리 변화 계산
    deltas = [t['end'] - t['start'] for t in tests]

    # 통계
    mean_delta = statistics.mean(deltas)
    std_dev = statistics.stdev(deltas) if len(deltas) > 1 else 0
    cv = abs(std_dev / mean_delta) if mean_delta != 0 else 999

    # 패턴 분류
    if cv < 0.15 and -50 <= mean_delta <= 150:
        return "🟢 GO", f"Stable pattern (CV={cv:.2f})"
    elif cv < 0.4 and -200 <= mean_delta <= 300:
        return "🟡 HOLD", f"Acceptable but needs monitoring (CV={cv:.2f})"
    else:
        return "🔴 FAIL", f"Unstable pattern (CV={cv:.2f})"

# 사용
result, reason = sre_memory_verdict([
    {"name": "test1", "start": 112, "end": 254, "fd_delta": 0},
    {"name": "test2", "start": 397, "end": 45, "fd_delta": 0},
])

print(f"{result} - {reason}")
```

---

## 🎯 의사결정 플로우차트

```
┌─────────────────────────┐
│   메모리 테스트 3회      │
└────────────┬────────────┘
             │
             ↓
┌─────────────────────────┐
│  FD/Timer 누수 검사      │
└─┬───────────────────┬───┘
  │ NO               │ YES
  ↓                  ↓
┌──────────┐    🔴 FAIL
│패턴 분석  │
└─┬────┬───┘
  │    │
  ├────┼─────────────┐
  │    │             │
  ↓    ↓             ↓
안정  경계          위험
 │    │             │
 ↓    ↓             ↓
🟢GO  🟡HOLD  🔴FAIL
```

---

## 📝 현재 상태 (Test 1 + Test 2)

```
현재 판정: 🟡 HOLD

필요: Test 3 실행

조건:
  Test3 delta ≈ Test2 delta → GO
  Test3 delta ≈ Test1 delta → HOLD (재검토)
  Test3 delta = 새로운 값 → FAIL (원인 불명)
```

---

## 🔧 다음 액션

1. **재테스트 스크립트 생성** (추가 로그 포함)
2. **Test 3 실행** (4시간)
3. **결과 자동 판정** (이 로직 사용)
4. **GO/HOLD/FAIL 결정**

---

**최종 규칙 (1줄)**

> 패턴이 일관되면 배포, 아니면 보류

---

**생성**: 2026-02-18
**버전**: SRE Auto Verdict v1.0
**신뢰도**: 실무 표준
