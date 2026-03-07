# FreeLang v2.6.0

**Zero-Dependency Programming Language + Compiler Toolchain**

---

## Architecture

```
Source (.fl) --> Lexer --> Parser --> AST
                                      |
                          +-----------+-----------+
                          |                       |
                     IR Generator            Module Resolver
                          |                       |
                    Instructions[]          DependencyGraph
                          |                       |
                   +------+------+          KPM-Linker
                   |             |               |
              VM (Runtime)   IR-to-C        Single Binary
                   |             |          (Static Link)
                Output      GCC Compile
                                |
                           ELF Binary
```

## Compiler Pipeline

| Stage | File | Input | Output |
|-------|------|-------|--------|
| Lexer | `src/lexer/lexer.ts` | Source code | Tokens |
| Parser | `src/parser/parser.ts` | Tokens | AST / Module |
| IR Gen | `src/codegen/ir-generator.ts` | AST | Instructions[] |
| VM | `src/runtime/instruction-dispatcher.ts` | Instructions | Runtime result |
| C Gen | `src/codegen/ir-to-c.ts` | Instructions | C code |
| GCC | `src/compiler.ts` | C code | ELF binary |
| **Linker** | `src/linker/module-linker.ts` | Multi-module | **Single binary** |

## KPM-Linker (v1.0 - 2026-03-08)

Webpack/Rollup 없이 FreeLang 컴파일러가 직접 수행하는 통합 빌드 시스템.

### What It Does

- **Dependency Graph**: 모듈 간 의존성 자동 분석 + 순환 참조 컴파일 타임 차단
- **DCE (Dead Code Elimination)**: 사용하지 않는 심볼 자동 제거 (검증: 25% 감소)
- **LTO (Link Time Optimization)**: 소형 함수 인라이닝, GCC `-flto` 연동
- **Static Linking**: 외부 의존성 0, 단일 ELF 바이너리 출력
- **Cross-target**: default / termux-aarch64 / termux-armv7 / x86_64 / small

### Usage

```bash
# Basic build
freelang build app.fl

# Output path
freelang build app.fl -o dist/app

# Termux (ARM64) target
freelang build app.fl --target termux-aarch64

# Size-optimized
freelang build app.fl --target small

# Emit C code only (no binary)
freelang build app.fl --emit-c

# Disable optimizations
freelang build app.fl --no-dce --no-lto

# Verbose
freelang build app.fl --verbose
```

### Build Result Example

```
[build] main.fl
  Dependency Graph: math -> [] / main [ENTRY] -> [math]
  DCE: 1/4 symbols eliminated (25%)
  Binary: ELF 64-bit, statically linked, 800KB
  Time: 367ms
```

### Module System

```
// math.fl
export fn add(a: number, b: number) -> number {
  return a + b;
}

// main.fl
import { add } from "./math";

fn main() {
  let result = add(10, 20);
  print(result);
}
```

Package imports via KPM:
```
import { connect } from "pikadb";
import { serve } from "moss-http";
```

Resolved through `fl_modules/` + `freelang.json` manifest.

## CLI

```bash
freelang                          # Interactive REPL
freelang <file.fl>                # Run file
freelang build <file.fl> [opts]   # KPM-Linker build
freelang --aot <file> -o <out>    # AOT compile (single file)
freelang test [path]              # Run @test annotations
freelang --serve <file> [port]    # HTTP server mode
freelang --batch <file>           # Batch processing
```

## Performance

| Metric | Value |
|--------|-------|
| Throughput | 50k RPS |
| Latency | 2.5ms |
| Concurrent | 10,000 connections |
| Build (2-module) | 367ms |
| IR Generation | 30ms |
| Dependencies | ZERO |

## Project Structure

```
src/
  lexer/          # Tokenizer
  parser/         # One-pass parser (63KB)
  codegen/        # IR generator + C generator + SIMD
  linker/         # KPM-Linker (DCE + LTO + static link)
  module/         # Module resolver
  package/        # Package resolver (fl_modules)
  runtime/        # VM instruction dispatcher
  engine/         # Built-in functions (1,470+)
  cli/            # CLI entry point
  stdlib/         # Standard library
  compiler.ts     # GCC bridge
  types.ts        # Op enum, Inst, type definitions
```

## Key Files

| File | Size | Purpose |
|------|------|---------|
| `src/parser/parser.ts` | 63KB | One-pass parser |
| `src/engine/builtins.ts` | 74KB | 1,470+ built-in functions |
| `src/codegen/ir-generator.ts` | 48KB | IR instruction generation |
| `src/runtime/instruction-dispatcher.ts` | 26KB | VM opcode execution |
| `src/linker/module-linker.ts` | 10KB | Multi-module linker |
| `src/linker/dependency-graph.ts` | 8KB | DCE + graph analysis |

---

**Version**: 2.6.0
**Date**: 2026-03-08
**Status**: Production
**KPM-Linker**: v1.0
**Gogs**: gogs.dclub.kr/kim/v2-freelang-ai
