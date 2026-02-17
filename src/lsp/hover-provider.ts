/**
 * ════════════════════════════════════════════════════════════════════
 * Hover Provider
 *
 * 마우스 호버 시 표시되는 타입 정보:
 * - 변수/함수 타입
 * - 추론 근거
 * - 사용 가능한 메서드
 * - 문서/주석
 * ════════════════════════════════════════════════════════════════════
 */

import { Hover, MarkupKind, MarkedString } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

/**
 * 호버 정보 제공자
 */
export class HoverProvider {
  constructor() {
    // Hover provider initialization
  }

  /**
   * 호버 정보 생성
   */
  provideHover(document: TextDocument, line: number, column: number): Hover | null {
    try {
      // 1. 위치의 단어 추출
      const word = this.getWordAt(document, line, column);
      if (!word) return null;

      // 2. 컨텍스트 분석 (주변 코드)
      const context = this.getContext(document, line, column);

      // 3. 타입 정보 (기본값)
      const type = { type: 'unknown', confidence: 0.5, sources: [] };
      if (!type || !type.type) return null;

      // 4. 호버 콘텐츠 생성
      return this.buildHoverContent(word, type, context);
    } catch (e) {
      console.error(`Hover error: ${e}`);
      return null;
    }
  }

  /**
   * 호버 콘텐츠 빌드
   */
  private buildHoverContent(name: string, type: any, context: string): Hover {
    const sections: string[] = [];

    // 1. 타입 서명
    sections.push(`## ${name}`);
    sections.push('```typescript');
    sections.push(this.formatType(type.type));
    sections.push('```');

    // 2. 신뢰도
    const confidence = ((type.confidence || 0) * 100).toFixed(0);
    sections.push(`\n**Confidence**: ${confidence}%`);

    // 3. 추론 근거
    if (type.sources && type.sources.length > 0) {
      sections.push(`\n**Inferred from**: ${type.sources.join(', ')}`);
    }

    // 4. 추가 정보 (Generic, Union 등)
    if (type.generic) {
      sections.push(`\n**Generic**: \`${type.generic}\``);
    }

    if (type.union) {
      sections.push(`\n**Union type**: ${type.union.join(' | ')}`);
    }

    // 5. 메서드 시그니처 (함수인 경우)
    if (type.callSignatures && type.callSignatures.length > 0) {
      sections.push('\n**Available signatures**:');
      for (const sig of type.callSignatures.slice(0, 3)) {
        sections.push(`- \`${sig}\``);
      }
    }

    // 6. 예시
    if (context && context.length > 0) {
      sections.push(`\n**Example**: \`${context.slice(0, 50)}\``);
    }

    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: sections.join('\n')
      }
    };
  }

  /**
   * 타입 포매팅
   */
  private formatType(type: string): string {
    if (!type) return 'unknown';

    // 긴 타입은 줄 바꿈
    if (type.length > 60) {
      return type
        .replace(/</g, '<\n  ')
        .replace(/>/g, '\n>')
        .replace(/,/g, ',\n  ');
    }

    return type;
  }

  /**
   * 위치의 단어 추출
   */
  private getWordAt(document: TextDocument, line: number, column: number): string | null {
    try {
      const text = document.getText();
      const offset = document.offsetAt({ line, character: column });

      // 단어 경계 찾기
      let start = offset;
      let end = offset;

      while (start > 0 && /\w/.test(text[start - 1])) start--;
      while (end < text.length && /\w/.test(text[end])) end++;

      if (start === end) return null;

      return text.substring(start, end);
    } catch (e) {
      return null;
    }
  }

  /**
   * 컨텍스트 추출
   */
  private getContext(document: TextDocument, line: number, column: number): string {
    try {
      const textLine = document.getText({
        start: { line, character: 0 },
        end: { line, character: column + 20 }
      });

      return textLine.trim();
    } catch (e) {
      return '';
    }
  }
}

/**
 * 고급 호버 정보 (doc 주석)
 */
export interface AdvancedHoverInfo {
  type: string;
  doc?: string;
  examples?: string[];
  relatedTypes?: string[];
  performance?: {
    timeComplexity?: string;
    spaceComplexity?: string;
  };
}

/**
 * 호버 정보 캐시 (성능)
 */
export class CachedHoverProvider extends HoverProvider {
  private cache = new Map<string, Hover | null>();
  private cacheSize = 500;

  provideHover(document: TextDocument, line: number, column: number): Hover | null {
    const key = `${document.uri}:${line}:${column}`;

    // 캐시 확인
    if (this.cache.has(key)) {
      return this.cache.get(key) || null;
    }

    // 호버 정보 생성
    const hover = super.provideHover(document, line, column);

    // 캐시 저장
    if (this.cache.size >= this.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, hover);

    return hover;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
