/**
 * ════════════════════════════════════════════════════════════════════
 * Union Type Narrowing Engine
 *
 * Union Type 생성, Type Guard 감지, Control Flow Narrowing
 * ════════════════════════════════════════════════════════════════════
 */

import { TypeInferenceEngine } from './type-inference';

/**
 * Type Guard 정보
 */
export interface TypeGuard {
  type: 'typeof' | 'instanceof' | 'null_check' | 'comparison' | 'custom';
  expression: string;
  narrowsTo: string;
  confidence: number;
  location: 'if' | 'else' | 'match' | 'guard';
}

/**
 * Union Type 추론 정보
 */
export interface UnionTypeInfo {
  name: string;
  unionType: string;                      // "number | string | null"
  possibleTypes: string[];                // ["number", "string", "null"]
  narrowedType?: string;                  // Type guard 후: "number"
  confidence: number;                     // 0.0-1.0
  source: 'declaration' | 'control_flow' | 'type_guard' | 'assignment';
  guards: TypeGuard[];
  reasoning: string[];
}

/**
 * Control Flow 경로
 */
export interface ControlFlowPath {
  pathId: string;
  condition: string;
  variableTypes: Map<string, string>;     // 이 경로에서 각 변수의 타입
  reachable: boolean;
}

/**
 * Union Narrowing 결과
 */
export interface UnionNarrowingResult {
  variables: Map<string, UnionTypeInfo>;
  controlFlowPaths: ControlFlowPath[];
  narrowingSuccess: number;               // 0.0-1.0
  reasoning: string[];
}

/**
 * Union Narrowing Engine
 */
export class UnionNarrowingEngine {
  private typeInference: TypeInferenceEngine;

  constructor() {
    this.typeInference = new TypeInferenceEngine();
  }

  /**
   * 메인 빌드 메서드
   */
  build(code: string): UnionNarrowingResult {
    const result: UnionNarrowingResult = {
      variables: new Map(),
      controlFlowPaths: [],
      narrowingSuccess: 0,
      reasoning: []
    };

    // Step 1: Union Type 생성 (복수 할당 추적)
    this.detectUnionTypes(code, result);

    // Step 2: Type Guard 감지
    this.detectTypeGuards(code, result);

    // Step 3: Control Flow Narrowing
    this.analyzeControlFlow(code, result);

    // Step 4: 신뢰도 계산
    result.narrowingSuccess = this.calculateNarrowingSuccess(result);

    return result;
  }

  /**
   * Union Type 생성
   * 예: x = 10; if (...) x = "hello" → x: number | string
   */
  private detectUnionTypes(code: string, result: UnionNarrowingResult): void {
    const assignments = new Map<string, Set<string>>();

    // 변수별 할당 추적 (더 견고한 패턴)
    // let x = value 또는 x = value 형태 모두 매칭
    const assignPattern = /(?:let\s+)?(\w+)\s*=\s*([^;\n{}]+)/g;
    let match;
    while ((match = assignPattern.exec(code)) !== null) {
      const varName = match[1];
      let value = match[2].trim();

      // 함수 호출이나 복잡한 표현은 skip
      if (value.includes('(') && !value.includes(')')) {
        continue;
      }

      const type = this.typeInference.inferExpressionType(value);

      if (!assignments.has(varName)) {
        assignments.set(varName, new Set());
      }

      // 모든 타입 추가 (any 포함)
      assignments.get(varName)!.add(type);
    }

    // Union Type 생성 (2개 이상 타입 → Union)
    for (const [varName, types] of assignments) {
      // 'any'는 제거
      const filteredTypes = Array.from(types).filter(t => t !== 'any');

      if (filteredTypes.length > 1) {
        const possibleTypes = filteredTypes.sort();
        result.variables.set(varName, {
          name: varName,
          unionType: possibleTypes.join(' | '),
          possibleTypes,
          confidence: 0.85,
          source: 'declaration',
          guards: [],
          reasoning: [`Variable assigned multiple types: ${possibleTypes.join(', ')}`]
        });
        result.reasoning.push(`Union type detected: ${varName}: ${possibleTypes.join(' | ')}`);
      } else if (filteredTypes.length === 1 && types.has('any')) {
        // 'any'와 다른 타입의 혼합 → union
        const concreteType = filteredTypes[0];
        result.variables.set(varName, {
          name: varName,
          unionType: `${concreteType} | any`,
          possibleTypes: [concreteType, 'any'],
          confidence: 0.70,
          source: 'declaration',
          guards: [],
          reasoning: [`Variable assigned mixed types: ${concreteType} and unknown`]
        });
      }
    }
  }

  /**
   * Type Guard 감지
   * typeof, instanceof, null check 등
   */
  private detectTypeGuards(code: string, result: UnionNarrowingResult): void {
    // typeof guard: typeof x === 'number'
    const typeofPattern = /if\s*\(\s*typeof\s+(\w+)\s*===\s*["'](\w+)["']\s*\)/g;
    let match;
    while ((match = typeofPattern.exec(code)) !== null) {
      const varName = match[1];
      const targetType = match[2];

      if (result.variables.has(varName)) {
        const info = result.variables.get(varName)!;
        info.guards.push({
          type: 'typeof',
          expression: match[0],
          narrowsTo: targetType,
          confidence: 0.95,
          location: 'if'
        });
        info.reasoning.push(`Type guard: typeof ${varName} === '${targetType}'`);
      }
    }

    // null check: x !== null
    const nullCheckPattern = /if\s*\(\s*(\w+)\s*(!==|===)\s*null\s*\)/g;
    while ((match = nullCheckPattern.exec(code)) !== null) {
      const varName = match[1];
      const operator = match[2];

      if (result.variables.has(varName)) {
        const info = result.variables.get(varName)!;
        info.guards.push({
          type: 'null_check',
          expression: match[0],
          narrowsTo: operator === '!==' ? 'non-null' : 'null',
          confidence: 0.90,
          location: 'if'
        });
      }
    }

    // instanceof check
    const instanceofPattern = /if\s*\(\s*(\w+)\s+instanceof\s+(\w+)\s*\)/g;
    while ((match = instanceofPattern.exec(code)) !== null) {
      const varName = match[1];
      const className = match[2];

      if (result.variables.has(varName)) {
        const info = result.variables.get(varName)!;
        info.guards.push({
          type: 'instanceof',
          expression: match[0],
          narrowsTo: className.toLowerCase(),
          confidence: 0.90,
          location: 'if'
        });
      }
    }

    // 비교 연산자 (number와 다른 타입 구분)
    const comparisonPattern = /if\s*\(\s*(\w+)\s*(>|<|>=|<=)\s*(\d+)\s*\)/g;
    while ((match = comparisonPattern.exec(code)) !== null) {
      const varName = match[1];
      if (result.variables.has(varName)) {
        const info = result.variables.get(varName)!;
        // 숫자와 비교 → number 타입으로 좁혀짐
        info.guards.push({
          type: 'comparison',
          expression: match[0],
          narrowsTo: 'number',
          confidence: 0.85,
          location: 'if'
        });
      }
    }
  }

  /**
   * Control Flow 분석
   */
  private analyzeControlFlow(code: string, result: UnionNarrowingResult): void {
    const ifElsePattern = /if\s*\((.*?)\)\s*\{([\s\S]*?)\}(?:\s*else\s*\{([\s\S]*?)\})?/g;
    let match;
    let pathId = 0;

    while ((match = ifElsePattern.exec(code)) !== null) {
      const condition = match[1];
      const thenBlock = match[2];
      const elseBlock = match[3];

      // Then path
      const thenPath: ControlFlowPath = {
        pathId: `path_${pathId++}`,
        condition: condition,
        variableTypes: new Map(),
        reachable: true
      };

      // 조건에서 narrowing 적용
      for (const [varName, info] of result.variables) {
        // typeof guard 매칭
        const typeofMatch = condition.match(new RegExp(`typeof\\s+${varName}\\s*===\\s*['"](\\w+)['"]`));
        if (typeofMatch) {
          thenPath.variableTypes.set(varName, typeofMatch[1]);
          info.narrowedType = typeofMatch[1];
          info.confidence = Math.min(0.95, info.confidence + 0.10);
          continue;
        }

        // instanceof guard 매칭
        const instanceofMatch = condition.match(new RegExp(`${varName}\\s+instanceof\\s+(\\w+)`));
        if (instanceofMatch) {
          const className = instanceofMatch[1].toLowerCase();
          thenPath.variableTypes.set(varName, className);
          info.narrowedType = className;
          info.confidence = Math.min(0.95, info.confidence + 0.10);
          continue;
        }

        // null check 매칭
        if (condition.includes(`${varName} !== null`) || condition.includes(`${varName}!==null`)) {
          // non-null type (union에서 null 제거)
          const nonNullTypes = info.possibleTypes.filter(t => t !== 'null');
          if (nonNullTypes.length === 1) {
            thenPath.variableTypes.set(varName, nonNullTypes[0]);
            info.narrowedType = nonNullTypes[0];
          } else if (nonNullTypes.length > 1) {
            thenPath.variableTypes.set(varName, nonNullTypes.join(' | '));
            info.narrowedType = nonNullTypes.join(' | ');
          }
          info.confidence = Math.min(0.95, info.confidence + 0.10);
          continue;
        }

        // Guard 배열에서 매칭
        for (const guard of info.guards) {
          // 간단한 문자열 포함 검사 (더 견고한 방법보다 빠름)
          if (condition.includes(varName) && condition.includes(guard.narrowsTo)) {
            thenPath.variableTypes.set(varName, guard.narrowsTo);
            if (!info.narrowedType) {
              info.narrowedType = guard.narrowsTo;
              info.confidence = Math.min(0.95, info.confidence + 0.10);
            }
          }
        }
      }

      result.controlFlowPaths.push(thenPath);

      // Else path
      if (elseBlock) {
        const elsePath: ControlFlowPath = {
          pathId: `path_${pathId++}`,
          condition: `!(${condition})`,
          variableTypes: new Map(),
          reachable: true
        };
        result.controlFlowPaths.push(elsePath);
      }
    }
  }

  /**
   * Narrowing 성공률 계산
   */
  private calculateNarrowingSuccess(result: UnionNarrowingResult): number {
    const totalVars = result.variables.size;
    if (totalVars === 0) return 0;

    let narrowedVars = 0;
    for (const info of result.variables.values()) {
      if (info.narrowedType) narrowedVars++;
    }

    return narrowedVars / totalVars;
  }

  /**
   * 특정 변수의 narrowed type 조회
   */
  getNarrowedType(result: UnionNarrowingResult, varName: string): string | null {
    const info = result.variables.get(varName);
    return info?.narrowedType || info?.unionType || null;
  }

  /**
   * 특정 변수의 모든 타입 조회
   */
  getUnionType(result: UnionNarrowingResult, varName: string): string | null {
    const info = result.variables.get(varName);
    return info?.unionType || null;
  }

  /**
   * 변수의 모든 타입 guards 조회
   */
  getGuards(result: UnionNarrowingResult, varName: string): TypeGuard[] {
    const info = result.variables.get(varName);
    return info?.guards || [];
  }
}
