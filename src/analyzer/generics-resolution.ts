/**
 * ════════════════════════════════════════════════════════════════════
 * Generics Resolution Engine
 *
 * Generic Type 파싱, Type Parameter 추출, 인스턴스화
 * ════════════════════════════════════════════════════════════════════
 */

import { TypeInferenceEngine } from './type-inference';

/**
 * Type Parameter 정의
 */
export interface TypeParameter {
  name: string;                    // "T", "K", "V"
  constraint?: string;             // "T extends number"
  default?: string;                // "T = string"
  variance: 'covariant' | 'contravariant' | 'invariant';
}

/**
 * Generic Signature (타입/함수 정의)
 */
export interface GenericSignature {
  name: string;                    // 타입/함수명
  typeParams: TypeParameter[];
  signature: string;               // "Map<K, V>"
  instantiations: GenericInstantiation[];
  confidence: number;
}

/**
 * Generic 인스턴스화 (구체적 타입 할당)
 */
export interface GenericInstantiation {
  typeArgs: Map<string, string>;   // T → number, K → string
  resultType: string;              // "Map<string, number>"
  confidence: number;
  source: 'explicit' | 'inferred';
  reasoning: string[];
}

/**
 * Generics Resolution 결과
 */
export interface GenericsResolutionResult {
  generics: Map<string, GenericSignature>;
  instantiations: GenericInstantiation[];
  resolutionSuccess: number;       // 0.0-1.0
  reasoning: string[];
}

/**
 * Generics Resolution Engine
 */
export class GenericsResolutionEngine {
  private typeInference: TypeInferenceEngine;

  constructor() {
    this.typeInference = new TypeInferenceEngine();
  }

  /**
   * 메인 빌드 메서드
   */
  build(code: string): GenericsResolutionResult {
    const result: GenericsResolutionResult = {
      generics: new Map(),
      instantiations: [],
      resolutionSuccess: 0,
      reasoning: []
    };

    // Step 1: Generic 선언 추출
    this.extractGenericDeclarations(code, result);

    // Step 2: Type Parameter 제약 추출
    this.extractTypeParameters(code, result);

    // Step 3: Generic 인스턴스화 추론
    this.inferInstantiations(code, result);

    // Step 4: Variance 분석
    this.analyzeVariance(result);

    // Step 5: 성공률 계산
    result.resolutionSuccess = this.calculateResolutionSuccess(result);

    return result;
  }

  /**
   * Generic 선언 추출
   * 예: array<T>, Map<K, V>
   */
  private extractGenericDeclarations(code: string, result: GenericsResolutionResult): void {
    // Generic type 패턴: Type<T, K, ...>
    const genericPattern = /(\w+)<([\w\s,]+)>/g;
    let match;
    const seenGenerics = new Set<string>();

    while ((match = genericPattern.exec(code)) !== null) {
      const typeName = match[1];
      const typeParamsStr = match[2];

      // 중복 제거
      if (seenGenerics.has(typeName)) {
        continue;
      }
      seenGenerics.add(typeName);

      const typeParamNames = typeParamsStr.split(',').map(p => p.trim());

      const signature: GenericSignature = {
        name: typeName,
        typeParams: typeParamNames.map(name => ({
          name,
          variance: 'invariant' as const
        })),
        signature: match[0],
        instantiations: [],
        confidence: 0.80
      };

      result.generics.set(typeName, signature);
      result.reasoning.push(`Generic type detected: ${match[0]}`);
    }
  }

  /**
   * Type Parameter 제약 추출
   * 예: T extends number, K: Clone
   */
  private extractTypeParameters(code: string, result: GenericsResolutionResult): void {
    // Constraint 패턴 1: T extends SomeType
    const extendsPattern = /(\w+)\s+extends\s+(\w+(?:<[\w,\s]+>)?)/g;
    let match;

    while ((match = extendsPattern.exec(code)) !== null) {
      const paramName = match[1];
      const constraint = match[2];

      // 해당 type parameter를 가진 generic 찾기
      for (const [_, sig] of result.generics) {
        const param = sig.typeParams.find(p => p.name === paramName);
        if (param) {
          param.constraint = constraint;
          sig.confidence = Math.min(0.95, sig.confidence + 0.10);
          result.reasoning.push(`Type constraint: ${paramName} extends ${constraint}`);
        }
      }
    }

    // Constraint 패턴 2: T: Trait
    const traitPattern = /(\w+)\s*:\s*(\w+(?:<[\w,\s]+>)?)/g;
    while ((match = traitPattern.exec(code)) !== null) {
      const paramName = match[1];
      const trait = match[2];

      for (const [_, sig] of result.generics) {
        const param = sig.typeParams.find(p => p.name === paramName);
        if (param && !param.constraint) {
          param.constraint = trait;
          sig.confidence = Math.min(0.95, sig.confidence + 0.10);
        }
      }
    }

    // Default 패턴: T = string
    const defaultPattern = /(\w+)\s*=\s*(\w+(?:<[\w,\s]+>)?)/g;
    while ((match = defaultPattern.exec(code)) !== null) {
      const paramName = match[1];
      const defaultType = match[2];

      for (const [_, sig] of result.generics) {
        const param = sig.typeParams.find(p => p.name === paramName);
        if (param) {
          param.default = defaultType;
        }
      }
    }
  }

  /**
   * Generic 인스턴스화 추론
   * 예: array<number>, Map<string, User>
   */
  private inferInstantiations(code: string, result: GenericsResolutionResult): void {
    // 구체적인 타입 인자: Type<ConcreteType1, ConcreteType2>
    const instantiationPattern = /(\w+)<([\w\s|,<>.]+?)>/g;
    let match;

    while ((match = instantiationPattern.exec(code)) !== null) {
      const typeName = match[1];
      const typeArgsStr = match[2];

      // 해당 generic이 정의되어 있는지 확인
      if (!result.generics.has(typeName)) {
        continue;
      }

      const signature = result.generics.get(typeName)!;
      const typeArgs = this.parseTypeArgs(typeArgsStr);

      // Type parameters와 구체적 타입 매칭
      const typeArgMap = new Map<string, string>();
      signature.typeParams.forEach((param, index) => {
        if (index < typeArgs.length) {
          typeArgMap.set(param.name, typeArgs[index]);
        } else if (param.default) {
          typeArgMap.set(param.name, param.default);
        }
      });

      // 재귀적으로 중첩된 generics 해결
      const resolvedArgs = this.resolveNestedGenerics(typeArgMap, result);

      const instantiation: GenericInstantiation = {
        typeArgs: resolvedArgs,
        resultType: match[0],
        confidence: 0.90,
        source: 'explicit',
        reasoning: [`Explicit instantiation: ${match[0]}`]
      };

      signature.instantiations.push(instantiation);
      result.instantiations.push(instantiation);
    }
  }

  /**
   * Type arguments 파싱 (중첩 지원)
   * 예: "K, V" → ["K", "V"]
   * 예: "string, array<number>" → ["string", "array<number>"]
   */
  private parseTypeArgs(typeArgsStr: string): string[] {
    const args: string[] = [];
    let current = '';
    let depth = 0;

    for (const char of typeArgsStr) {
      if (char === '<') {
        depth++;
        current += char;
      } else if (char === '>') {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0) {
        const trimmed = current.trim();
        if (trimmed) {
          args.push(trimmed);
        }
        current = '';
      } else {
        current += char;
      }
    }

    const trimmed = current.trim();
    if (trimmed) {
      args.push(trimmed);
    }

    return args;
  }

  /**
   * 중첩된 generics 해결
   * 예: T = array<number>일 때, U = T의 경우 U = array<number>로 해결
   */
  private resolveNestedGenerics(
    typeArgMap: Map<string, string>,
    result: GenericsResolutionResult
  ): Map<string, string> {
    const resolved = new Map(typeArgMap);

    // 최대 3회 반복 (깊이 제한)
    for (let i = 0; i < 3; i++) {
      let changed = false;

      for (const [param, type] of resolved) {
        // 타입이 다른 타입 파라미터 참조하는지 확인
        if (resolved.has(type)) {
          const resolvedType = resolved.get(type)!;
          resolved.set(param, resolvedType);
          changed = true;
        }
      }

      if (!changed) break;
    }

    return resolved;
  }

  /**
   * Variance 분석 (공변성/반공변성)
   */
  private analyzeVariance(result: GenericsResolutionResult): void {
    // 간단한 휴리스틱:
    // - 배열/컬렉션: covariant
    // - 함수 파라미터: contravariant
    // - 나머지: invariant

    for (const [typeName, sig] of result.generics) {
      if (['array', 'list', 'vector', 'collection', 'iterable'].includes(typeName.toLowerCase())) {
        sig.typeParams.forEach(p => (p.variance = 'covariant'));
      } else if (['function', 'fn', 'callback'].includes(typeName.toLowerCase())) {
        sig.typeParams.forEach(p => (p.variance = 'contravariant'));
      }
    }
  }

  /**
   * Resolution 성공률 계산
   */
  private calculateResolutionSuccess(result: GenericsResolutionResult): number {
    const totalGenerics = result.generics.size;
    if (totalGenerics === 0) return 0;

    let resolvedGenerics = 0;
    for (const sig of result.generics.values()) {
      if (sig.instantiations.length > 0) {
        resolvedGenerics++;
      }
    }

    return resolvedGenerics / totalGenerics;
  }

  /**
   * 특정 타입의 인스턴스 조회
   */
  getInstantiations(result: GenericsResolutionResult, typeName: string): GenericInstantiation[] {
    const sig = result.generics.get(typeName);
    return sig?.instantiations || [];
  }

  /**
   * 특정 타입의 generic signature 조회
   */
  getSignature(result: GenericsResolutionResult, typeName: string): GenericSignature | null {
    return result.generics.get(typeName) || null;
  }

  /**
   * 모든 generic 타입 조회
   */
  getAllGenerics(result: GenericsResolutionResult): GenericSignature[] {
    return Array.from(result.generics.values());
  }
}
