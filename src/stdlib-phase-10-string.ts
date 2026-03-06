/**
 * Phase 10: String & Text Processing (Tier 1)
 * 텍스트 처리 라이브러리: diff, markdown, html-parser, csv-parser
 */

import { registerBuiltinFunction } from './cli/function-registry';

// ============================================
// text-diff: 텍스트 비교
// ============================================

class DiffResult {
  added: string[] = [];
  removed: string[] = [];
  unchanged: string[] = [];
}

class TextDiff {
  static diff(before: string, after: string): DiffResult {
    const result = new DiffResult();
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');

    const beforeSet = new Set(beforeLines);
    const afterSet = new Set(afterLines);

    for (const line of beforeLines) {
      if (!afterSet.has(line)) {
        result.removed.push(line);
      } else {
        result.unchanged.push(line);
      }
    }

    for (const line of afterLines) {
      if (!beforeSet.has(line)) {
        result.added.push(line);
      }
    }

    return result;
  }

  static patch(original: string, diff: DiffResult): string {
    const lines = original.split('\n');
    const result: string[] = [];

    for (const line of lines) {
      if (!diff.removed.includes(line)) {
        result.push(line);
      }
    }

    result.push(...diff.added);
    return result.join('\n');
  }
}

// ============================================
// markdown: Markdown 파서
// ============================================

class MarkdownParser {
  static parse(text: string): string {
    let html = text;

    // Headers
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

    // Code
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');

    // Lists
    html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = `<p>${html}</p>`;

    return html;
  }

  static validate(text: string): boolean {
    // Basic validation - check for balanced brackets
    let brackets = 0;
    let parentheses = 0;

    for (const char of text) {
      if (char === '[') brackets++;
      else if (char === ']') brackets--;
      else if (char === '(') parentheses++;
      else if (char === ')') parentheses--;
    }

    return brackets === 0 && parentheses === 0;
  }
}

// ============================================
// html-parser: HTML 파싱
// ============================================

interface HtmlNode {
  type: 'element' | 'text';
  tag?: string;
  content: string;
  attributes?: Record<string, string>;
  children?: HtmlNode[];
}

class HtmlParser {
  static parse(html: string): HtmlNode {
    const root: HtmlNode = {
      type: 'element',
      tag: 'root',
      content: '',
      children: [],
    };

    let current = root;
    let buffer = '';
    let i = 0;

    while (i < html.length) {
      if (html[i] === '<') {
        // Save buffer as text node
        if (buffer.trim()) {
          current.children?.push({
            type: 'text',
            content: buffer,
          });
          buffer = '';
        }

        // Find closing >
        const endIdx = html.indexOf('>', i);
        if (endIdx === -1) break;

        const tag = html.substring(i + 1, endIdx);
        i = endIdx + 1;

        if (tag.startsWith('/')) {
          // Closing tag
          current = root; // Simplification
        } else {
          // Opening tag
          const [tagName, ...attrs] = tag.split(/\s+/);
          const node: HtmlNode = {
            type: 'element',
            tag: tagName,
            content: '',
            attributes: {},
            children: [],
          };

          for (const attr of attrs) {
            const [key, value] = attr.split('=');
            if (key && value) {
              node.attributes![key] = value.replace(/"/g, '');
            }
          }

          current.children?.push(node);
          current = node;
        }
      } else {
        buffer += html[i];
        i++;
      }
    }

    if (buffer.trim()) {
      current.children?.push({
        type: 'text',
        content: buffer,
      });
    }

    return root;
  }

  static select(node: HtmlNode, selector: string): HtmlNode[] {
    const results: HtmlNode[] = [];

    function traverse(n: HtmlNode) {
      if (n.type === 'element' && n.tag === selector) {
        results.push(n);
      }
      if (n.children) {
        for (const child of n.children) {
          traverse(child);
        }
      }
    }

    traverse(node);
    return results;
  }
}

// ============================================
// csv-parser: CSV 파싱
// ============================================

class CsvParser {
  static parse(csv: string, headers: boolean = true): any[] {
    const lines = csv.split('\n').filter((line) => line.trim());
    const result: any[] = [];

    if (lines.length === 0) return result;

    let headerRow: string[] = [];
    let startIdx = 0;

    if (headers) {
      headerRow = this.parseLine(lines[0]);
      startIdx = 1;
    }

    for (let i = startIdx; i < lines.length; i++) {
      const values = this.parseLine(lines[i]);

      if (headers) {
        const obj: Record<string, string> = {};
        for (let j = 0; j < headerRow.length; j++) {
          obj[headerRow[j]] = values[j] || '';
        }
        result.push(obj);
      } else {
        result.push(values);
      }
    }

    return result;
  }

  private static parseLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  static stringify(data: any[], headers: boolean = true): string {
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }

    const lines: string[] = [];

    if (headers && typeof data[0] === 'object') {
      const headerKeys = Object.keys(data[0]);
      lines.push(headerKeys.map((key) => `"${key}"`).join(','));
    }

    for (const row of data) {
      if (typeof row === 'object') {
        const values = Object.values(row).map((v) =>
          typeof v === 'string' ? `"${v}"` : String(v)
        );
        lines.push(values.join(','));
      } else {
        lines.push(String(row));
      }
    }

    return lines.join('\n');
  }
}

// ============================================
// slug: URL slug 생성
// ============================================

class Slug {
  static slugify(text: string, separator: string = '-'): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, separator)
      .replace(new RegExp(`${separator}+`, 'g'), separator)
      .replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), '');
  }

  static unslugify(slug: string, separator: string = '-'): string {
    return slug.split(separator).join(' ');
  }

  static validate(slug: string, separator: string = '-'): boolean {
    const pattern = new RegExp(`^[a-z0-9]+(?:${separator}[a-z0-9]+)*$`);
    return pattern.test(slug);
  }
}

// ============================================
// Register builtin functions
// ============================================

registerBuiltinFunction('text_diff', (before: string, after: string) => {
  return TextDiff.diff(before, after);
});

registerBuiltinFunction('text_patch', (original: string, diff: any) => {
  if (diff && diff.added && diff.removed) {
    return TextDiff.patch(original, diff);
  }
  return original;
});

registerBuiltinFunction('markdown_parse', (text: string) => {
  return MarkdownParser.parse(text);
});

registerBuiltinFunction('markdown_validate', (text: string) => {
  return MarkdownParser.validate(text);
});

registerBuiltinFunction('html_parse', (html: string) => {
  return HtmlParser.parse(html);
});

registerBuiltinFunction('html_select', (node: any, selector: string) => {
  if (node && typeof node === 'object') {
    return HtmlParser.select(node, selector);
  }
  return [];
});

registerBuiltinFunction('csv_parse', (csv: string, headers?: boolean) => {
  return CsvParser.parse(csv, headers ?? true);
});

registerBuiltinFunction('csv_stringify', (data: any, headers?: boolean) => {
  if (Array.isArray(data)) {
    return CsvParser.stringify(data, headers ?? true);
  }
  return '';
});

registerBuiltinFunction('slug_slugify', (text: string, sep?: string) => {
  return Slug.slugify(text, sep ?? '-');
});

registerBuiltinFunction('slug_unslugify', (slug: string, sep?: string) => {
  return Slug.unslugify(slug, sep ?? '-');
});

registerBuiltinFunction('slug_validate', (slug: string, sep?: string) => {
  return Slug.validate(slug, sep ?? '-');
});

export { TextDiff, MarkdownParser, HtmlParser, CsvParser, Slug };
