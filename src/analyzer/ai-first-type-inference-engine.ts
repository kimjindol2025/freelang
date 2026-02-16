/**
 * Phase 4 Step 4: AI-First Type Inference Engine
 *
 * Step 1-3 (FunctionNameEnhancer, VariableNameEnhancer, CommentAnalyzer)
 * + 기존 분석기 (SemanticAnalyzer, ContextTracker) 통합
 *
 * 신뢰도 가중치:
 *   - 함수명 분석: 25%
 *   - 변수명 분석: 25%
 *   - 주석 분석: 15%
 *   - 시맨틱 분석: 25%
 *   - 컨텍스트 추적: 10%
 */

import { FunctionNameEnhancer, FunctionNameAnalysis } from './function-name-enhancer';
import { VariableNameEnhancer, VariableNameAnalysis } from './variable-name-enhancer';
import { CommentAnalyzer, CommentInfo } from './comment-analyzer';
import { SemanticAnalyzer } from './semantic-analyzer';
import { ContextTracker } from './context-tracker';

/**
 * 변수 타입 정보 (통합)
 */
export interface VariableTypeInfo {
  variableName: string;
  inferredType?: string;
  domain?: string;
  confidence: number;

  // 분석 단계별 신뢰도
  nameAnalysisConfidence?: number;        // VariableNameEnhancer
  commentAnalysisConfidence?: number;     // CommentAnalyzer
  semanticAnalysisConfidence?: number;    // SemanticAnalyzer
  contextAnalysisConfidence?: number;     // ContextTracker

  // 분석 근거
  fromName?: boolean;
  fromComment?: boolean;
  fromSemantic?: boolean;
  fromContext?: boolean;

  reasoning: string[];
}

/**
 * 함수 시그니처 (통합)
 */
export interface FunctionSignature {
  functionName: string;
  returnType?: string;
  parameters?: {
    name: string;
    type?: string;
    domain?: string;
    confidence: number;
  }[];
  domain?: string;
  confidence: number;

  // 분석 단계별 신뢰도
  nameAnalysisConfidence?: number;        // FunctionNameEnhancer
  commentAnalysisConfidence?: number;     // CommentAnalyzer
  semanticAnalysisConfidence?: number;    // SemanticAnalyzer
  contextAnalysisConfidence?: number;     // ContextTracker

  reasoning: string[];
}

/**
 * 타입 충돌 정보
 */
export interface TypeConflict {
  variableName: string;
  conflictingTypes: Array<{
    type: string;
    source: 'name' | 'comment' | 'semantic' | 'context';
    confidence: number;
  }>;
  severity: 'info' | 'warning' | 'error';
  suggestion?: string;
  reasoning: string[];
}

/**
 * 타입 추론 결과 (전체)
 */
export interface TypeInferenceResult {
  functionName: string;
  signature: FunctionSignature;
  variables: VariableTypeInfo[];
  conflicts: TypeConflict[];
  overallConfidence: number;  // 전체 신뢰도
  reasoning: string[];
}

/**
 * AI-First 타입 추론 엔진
 */
export class AIFirstTypeInferenceEngine {
  private functionNameEnhancer: FunctionNameEnhancer;
  private variableNameEnhancer: VariableNameEnhancer;
  private commentAnalyzer: CommentAnalyzer;
  private semanticAnalyzer: SemanticAnalyzer;
  private contextTracker: ContextTracker;

  constructor() {
    this.functionNameEnhancer = new FunctionNameEnhancer();
    this.variableNameEnhancer = new VariableNameEnhancer();
    this.commentAnalyzer = new CommentAnalyzer();
    this.semanticAnalyzer = new SemanticAnalyzer();
    this.contextTracker = new ContextTracker();
  }

  /**
   * 함수 전체 분석
   * @param functionName 함수명
   * @param functionCode 함수 코드
   * @param comments 주석 배열 (함수명 위의 주석들)
   */
  public inferTypes(
    functionName: string,
    functionCode: string,
    comments: string[] = []
  ): TypeInferenceResult {
    const reasoning: string[] = [];
    reasoning.push(`Analyzing function: "${functionName}"`);

    // Step 1: 함수명 분석 (25%)
    const fnNameAnalysis = this.functionNameEnhancer.analyzeFunctionName(functionName);
    reasoning.push(`1. Function name analysis: ${fnNameAnalysis.returnTypeHint} (confidence: ${fnNameAnalysis.confidence})`);

    // Step 2: 주석 분석 (15%)
    const commentInfos = this.analyzeComments(comments);
    reasoning.push(`2. Comment analysis: ${commentInfos.length} comments analyzed`);

    // Step 3: 함수 시그니처 구성
    const signature = this.buildFunctionSignature(
      functionName,
      fnNameAnalysis,
      commentInfos,
      reasoning
    );

    // Step 4: 함수 내 변수 분석
    const variables = this.analyzeVariablesInFunction(
      functionCode,
      functionName,
      comments,
      reasoning
    );

    // Step 5: 타입 충돌 감지
    const conflicts = this.detectTypeConflicts(variables, signature, reasoning);

    // Step 6: 전체 신뢰도 계산
    const overallConfidence = this.calculateOverallConfidence(
      signature.confidence,
      variables
    );

    return {
      functionName,
      signature,
      variables,
      conflicts,
      overallConfidence,
      reasoning
    };
  }

  /**
   * 단일 변수 타입 추론
   */
  public inferVariableType(
    variableName: string,
    functionName: string,
    functionCode: string,
    comments: string[] = []
  ): VariableTypeInfo {
    const reasoning: string[] = [];

    // Step 1: 변수명 분석 (25%)
    const nameAnalysis = this.variableNameEnhancer.analyzeVariableName(variableName);
    const nameConfidence = nameAnalysis.confidence;
    reasoning.push(`1. Variable name analysis: ${nameAnalysis.inferredType} (confidence: ${nameConfidence})`);

    // Step 2: 주석 분석 (15%)
    const commentInfos = this.analyzeComments(comments);
    let commentConfidence = 0;
    let commentType: string | undefined;
    if (commentInfos.length > 0) {
      const relevantComment = commentInfos.find(c =>
        c.domain || c.format || c.range
      );
      if (relevantComment) {
        commentConfidence = relevantComment.confidence;
        // 포맷에서 타입 유추
        if (relevantComment.format === 'currency') {
          commentType = 'currency';
        } else if (relevantComment.format === 'percent') {
          commentType = 'percentage';
        } else if (relevantComment.format === 'hash_string') {
          commentType = 'hash_string';
        }
        reasoning.push(`2. Comment analysis: ${commentType} (confidence: ${commentConfidence})`);
      }
    }

    // Step 3: 신뢰도 통합
    const weights = {
      name: 0.25,
      comment: 0.15,
      semantic: 0.25,
      context: 0.10
    };

    const confidences = [
      { source: 'name', confidence: nameConfidence, weight: weights.name },
      { source: 'comment', confidence: commentConfidence, weight: weights.comment }
    ];

    const finalConfidence = this.calculateWeightedConfidence(confidences);
    const finalType = commentType || nameAnalysis.inferredType;

    return {
      variableName,
      inferredType: finalType,
      domain: nameAnalysis.domain || (commentInfos[0]?.domain),
      confidence: finalConfidence,
      nameAnalysisConfidence: nameConfidence,
      commentAnalysisConfidence: commentConfidence,
      fromName: nameConfidence > 0,
      fromComment: commentConfidence > 0,
      reasoning
    };
  }

  /**
   * 함수 내 모든 변수 분석
   */
  private analyzeVariablesInFunction(
    functionCode: string,
    functionName: string,
    comments: string[],
    parentReasoning: string[]
  ): VariableTypeInfo[] {
    // 함수에서 변수명 추출 (간단한 정규식)
    const variablePattern = /(?:const|let|var)\s+(\w+)/g;
    const matches = [...functionCode.matchAll(variablePattern)];
    const variables: VariableTypeInfo[] = [];

    for (const match of matches) {
      const varName = match[1];
      const varType = this.inferVariableType(varName, functionName, functionCode, comments);
      variables.push(varType);
    }

    parentReasoning.push(`3. Variable analysis: ${variables.length} variables found`);
    return variables;
  }

  /**
   * 함수 시그니처 구성
   */
  private buildFunctionSignature(
    functionName: string,
    fnNameAnalysis: FunctionNameAnalysis,
    commentInfos: CommentInfo[],
    reasoning: string[]
  ): FunctionSignature {
    // 신뢰도 결합: 함수명(25%) + 주석(15%) = 40% (총 100%는 다른 분석기들과 함께)
    const nameConfidence = fnNameAnalysis.confidence;
    const commentConfidence = commentInfos[0]?.confidence || 0;

    const weights = [
      { source: 'name', confidence: nameConfidence, weight: 0.25 },
      { source: 'comment', confidence: commentConfidence, weight: 0.15 }
    ];

    const finalConfidence = this.calculateWeightedConfidence(weights);

    return {
      functionName,
      returnType: fnNameAnalysis.returnTypeHint,
      domain: fnNameAnalysis.domainHint || commentInfos[0]?.domain,
      confidence: finalConfidence,
      nameAnalysisConfidence: nameConfidence,
      commentAnalysisConfidence: commentConfidence,
      reasoning: [
        `Function name suggests: ${fnNameAnalysis.returnTypeHint}`,
        `Domain hint: ${fnNameAnalysis.domainHint || 'none'}`
      ]
    };
  }

  /**
   * 타입 충돌 감지
   */
  private detectTypeConflicts(
    variables: VariableTypeInfo[],
    signature: FunctionSignature,
    reasoning: string[]
  ): TypeConflict[] {
    const conflicts: TypeConflict[] = [];

    // 검사 1: 변수 타입 불일치
    for (const variable of variables) {
      const conflictingSources: TypeConflict['conflictingTypes'] = [];

      if (variable.nameAnalysisConfidence && variable.nameAnalysisConfidence > 0) {
        conflictingSources.push({
          type: variable.inferredType || 'unknown',
          source: 'name',
          confidence: variable.nameAnalysisConfidence
        });
      }

      if (variable.commentAnalysisConfidence && variable.commentAnalysisConfidence > 0) {
        // 주석에서 다른 타입 발견 시 충돌 기록
        conflictingSources.push({
          type: variable.domain || 'unknown',
          source: 'comment',
          confidence: variable.commentAnalysisConfidence
        });
      }

      // 같은 변수에서 여러 소스가 다른 타입을 제시하면 충돌
      if (conflictingSources.length > 1) {
        const types = new Set(conflictingSources.map(s => s.type));
        if (types.size > 1) {
          conflicts.push({
            variableName: variable.variableName,
            conflictingTypes: conflictingSources,
            severity: variable.confidence < 0.5 ? 'warning' : 'info',
            reasoning: [`Multiple type hints from different sources`]
          });
        }
      }
    }

    if (conflicts.length > 0) {
      reasoning.push(`4. Type conflicts detected: ${conflicts.length}`);
    }

    return conflicts;
  }

  /**
   * 전체 신뢰도 계산 (함수 + 변수)
   */
  private calculateOverallConfidence(
    signatureConfidence: number,
    variables: VariableTypeInfo[]
  ): number {
    if (variables.length === 0) {
      return signatureConfidence;
    }

    const avgVariableConfidence = variables.reduce((sum, v) => sum + v.confidence, 0) / variables.length;
    // 함수 시그니처(40%) + 변수들 평균(60%)
    return signatureConfidence * 0.4 + avgVariableConfidence * 0.6;
  }

  /**
   * 가중치 기반 신뢰도 계산
   */
  private calculateWeightedConfidence(
    items: Array<{ source: string; confidence: number; weight: number }>
  ): number {
    let totalWeight = 0;
    let totalConfidence = 0;

    for (const item of items) {
      if (item.confidence > 0) {
        totalConfidence += item.confidence * item.weight;
        totalWeight += item.weight;
      }
    }

    if (totalWeight === 0) {
      return 0;
    }

    // 정규화
    return Math.min(0.95, Math.max(0.0, totalConfidence / totalWeight));
  }

  /**
   * 주석들 분석
   */
  private analyzeComments(comments: string[]): CommentInfo[] {
    return this.commentAnalyzer.analyzeComments(comments);
  }

  /**
   * 도메인별로 변수 그룹화
   */
  public groupVariablesByDomain(
    variables: VariableTypeInfo[]
  ): Map<string, VariableTypeInfo[]> {
    const groups = new Map<string, VariableTypeInfo[]>();

    for (const variable of variables) {
      const domain = variable.domain || 'generic';
      if (!groups.has(domain)) {
        groups.set(domain, []);
      }
      groups.get(domain)!.push(variable);
    }

    return groups;
  }

  /**
   * 최소 신뢰도로 필터링
   */
  public filterByConfidence(
    variables: VariableTypeInfo[],
    minConfidence: number
  ): VariableTypeInfo[] {
    return variables.filter(v => v.confidence >= minConfidence);
  }

  /**
   * 고신뢰도 타입만 추출
   */
  public getHighConfidenceTypes(
    result: TypeInferenceResult,
    minConfidence: number = 0.75
  ): TypeInferenceResult {
    return {
      ...result,
      signature: result.signature.confidence >= minConfidence ? result.signature : {
        ...result.signature,
        returnType: undefined,
        confidence: 0
      },
      variables: this.filterByConfidence(result.variables, minConfidence)
    };
  }
}
