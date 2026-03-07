# FreeLang v2 Phase B - 진행 중

**날짜**: 2026-03-04
**상태**: 🔄 **진행 중 (병렬 진행)**

## 1️⃣ 파서 버그 분석 (진행 중)

### 문제
```freelang
❌ for v in arr { let x = (v); }  // IR length: 2 (불완전)
✅ for v in arr { let x = v; }   // IR length: 23 (정상)
```

### 원인 분석 진행
- 괄호가 있는 표현식이 파싱을 중단시킴
- 토큰화는 정상 (13개 토큰 생성)
- AST 생성 또는 IR 생성 단계에서 문제 발생
- **다음**: parseExpression() 함수 깊이 분석 필요

---

## 2️⃣ Phase B 함수 추가 (진행 중)

### ✅ 추가된 함수 (24개)

**Map 함수 (8개)**
- map_new, map_set, map_get, map_has
- map_delete, map_keys, map_values, map_size

**파일 I/O (6개)**
- file_read, file_write, file_exists
- file_delete, file_size, file_append

**OS 함수 (6개)**
- os_platform, os_arch, os_time
- os_env, os_exit, os_cwd

**배열 함수 (4개)**
- arr_some, arr_every
- arr_index_of, arr_last_index_of

### 📊 테스트 결과: 6/8 통과

```
✅ map_new() → Map 객체
✅ file_exists("/tmp") → true
✅ os_platform() → "linux"
✅ os_arch() → "x64"
✅ os_time() → 1772555373289
✅ os_cwd() → "/home/.../v2-freelang-ai"
❌ arr_some() → undef_var:x (fn 정의 문법 미지원)
❌ arr_index_of() → 타입 에러
```

### 🔧 다음 작업

**파서 버그 (우선순위: 높음)**
- [ ] parseExpression() 함수 상세 분석
- [ ] For 루프 본문 파싱 로직 개선
- [ ] 괄호 표현식 정규 파싱 지원

**함수 완성 (우선순위: 중간)**
- [ ] 람다 함수 문법 지원 (arr_some, arr_every용)
- [ ] 타입 에러 수정
- [ ] 추가 함수 통합 테스트

---

## 📊 누적 현황

| 항목 | Phase A | Phase B | 합계 |
|------|---------|---------|------|
| 함수 수 | 111개 | 24개 | **135개+** |
| 테스트 | 9/9 ✓ | 6/8 | **15/17** |
| 완성도 | 99.5% | 75% | **87%** |

---

## 🎯 전체 로드맵

- ✅ Phase A: 111개 함수 등록 완료
- 🔄 Phase B: 파서 버그 + 함수 추가 (진행 중)
- ⏳ Phase C: 직렬화/암호화 함수 (예정)
- ⏳ Phase D: 리플렉션/테스트 함수 (예정)

