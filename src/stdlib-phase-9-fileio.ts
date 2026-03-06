/**
 * Phase 9: File I/O & Path Operations (Tier 1)
 * 비동기 파일 I/O, 버퍼 처리, 경로 유틸, glob 패턴
 */

import { registerBuiltinFunction } from './cli/function-registry';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// fs-async: 비동기 파일 I/O
// ============================================

class AsyncFileSystem {
  static async readFile(filepath: string, encoding: string = 'utf-8'): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(filepath, encoding, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  static async writeFile(filepath: string, content: string, encoding: string = 'utf-8'): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.writeFile(filepath, content, encoding, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  static async appendFile(filepath: string, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.appendFile(filepath, content, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  static async deleteFile(filepath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.unlink(filepath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  static async exists(filepath: string): Promise<boolean> {
    return new Promise((resolve) => {
      fs.exists(filepath, (exists) => {
        resolve(exists);
      });
    });
  }

  static async stat(filepath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      fs.stat(filepath, (err, stats) => {
        if (err) reject(err);
        else
          resolve({
            size: stats.size,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            modified: stats.mtime.toISOString(),
            created: stats.birthtime.toISOString(),
          });
      });
    });
  }

  static watchFile(filepath: string, callback: (event: string) => void): () => void {
    const watcher = fs.watch(filepath, (eventType) => {
      callback(eventType);
    });

    return () => watcher.close();
  }
}

// ============================================
// fs-buffer: 바이너리 버퍼 처리
// ============================================

class BufferUtils {
  static readBuffer(filepath: string): Buffer {
    return fs.readFileSync(filepath);
  }

  static writeBuffer(filepath: string, buffer: Buffer): void {
    fs.writeFileSync(filepath, buffer);
  }

  static concat(buffers: Buffer[]): Buffer {
    return Buffer.concat(buffers);
  }

  static toString(buffer: Buffer, encoding: string = 'utf-8'): string {
    return buffer.toString(encoding);
  }

  static toBuffer(str: string, encoding: string = 'utf-8'): Buffer {
    return Buffer.from(str, encoding);
  }

  static slice(buffer: Buffer, start: number, end: number): Buffer {
    return buffer.slice(start, end);
  }

  static indexOf(buffer: Buffer, value: string | Buffer): number {
    const searchBuf = typeof value === 'string' ? Buffer.from(value) : value;
    return buffer.indexOf(searchBuf);
  }
}

// ============================================
// path-posix: POSIX 경로 유틸
// ============================================

class PosixPath {
  static normalize(filepath: string): string {
    return path.posix.normalize(filepath);
  }

  static resolve(...segments: string[]): string {
    return path.posix.resolve(...segments);
  }

  static relative(from: string, to: string): string {
    return path.posix.relative(from, to);
  }

  static join(...segments: string[]): string {
    return path.posix.join(...segments);
  }

  static dirname(filepath: string): string {
    return path.posix.dirname(filepath);
  }

  static basename(filepath: string, ext?: string): string {
    return path.posix.basename(filepath, ext);
  }

  static extname(filepath: string): string {
    return path.posix.extname(filepath);
  }

  static parse(filepath: string): any {
    const parsed = path.posix.parse(filepath);
    return {
      root: parsed.root,
      dir: parsed.dir,
      base: parsed.base,
      ext: parsed.ext,
      name: parsed.name,
    };
  }

  static isAbsolute(filepath: string): boolean {
    return path.posix.isAbsolute(filepath);
  }
}

// ============================================
// path-glob: Glob 패턴 매칭
// ============================================

class GlobMatcher {
  private pattern: string;

  constructor(pattern: string) {
    this.pattern = this.globToRegex(pattern);
  }

  match(text: string): boolean {
    const regex = new RegExp(`^${this.pattern}$`);
    return regex.test(text);
  }

  private globToRegex(glob: string): string {
    let regex = '';
    let i = 0;

    while (i < glob.length) {
      const char = glob[i];

      if (char === '*') {
        if (glob[i + 1] === '*') {
          // ** matches any number of directories
          regex += '.*';
          i += 2;
          if (glob[i] === '/') i++; // Skip following /
        } else {
          // * matches anything except /
          regex += '[^/]*';
          i++;
        }
      } else if (char === '?') {
        // ? matches any single character except /
        regex += '[^/]';
        i++;
      } else if (char === '[') {
        // Character class
        let j = i + 1;
        let classContent = '';
        while (j < glob.length && glob[j] !== ']') {
          classContent += glob[j];
          j++;
        }
        regex += `[${classContent}]`;
        i = j + 1;
      } else if ('().+^$|'.includes(char)) {
        // Escape regex special chars
        regex += '\\' + char;
        i++;
      } else {
        regex += char;
        i++;
      }
    }

    return regex;
  }

  static glob(pattern: string, texts: string[]): string[] {
    const matcher = new GlobMatcher(pattern);
    return texts.filter((text) => matcher.match(text));
  }

  static parse(pattern: string): any {
    return {
      pattern,
      isGlob: /[*?[\]{}]/.test(pattern),
    };
  }
}

// ============================================
// tempfile: 임시 파일 관리
// ============================================

class TempFile {
  private filepath: string;

  constructor(prefix: string = 'temp') {
    const tempDir = '/tmp';
    const unique = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.filepath = `${tempDir}/${prefix}_${unique}`;
  }

  write(content: string): void {
    fs.writeFileSync(this.filepath, content);
  }

  read(): string {
    return fs.readFileSync(this.filepath, 'utf-8');
  }

  delete(): void {
    try {
      fs.unlinkSync(this.filepath);
    } catch (e) {
      // Ignore
    }
  }

  getPath(): string {
    return this.filepath;
  }

  static getTempDir(): string {
    return '/tmp';
  }

  static cleanup(prefix: string): void {
    const tempDir = '/tmp';
    try {
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        if (file.startsWith(prefix)) {
          fs.unlinkSync(`${tempDir}/${file}`);
        }
      }
    } catch (e) {
      // Ignore
    }
  }
}

// ============================================
// Register builtin functions
// ============================================

registerBuiltinFunction('fs_async_read', async (filepath: string) => {
  return await AsyncFileSystem.readFile(filepath);
});

registerBuiltinFunction('fs_async_write', async (filepath: string, content: string) => {
  return await AsyncFileSystem.writeFile(filepath, content);
});

registerBuiltinFunction('fs_async_append', async (filepath: string, content: string) => {
  return await AsyncFileSystem.appendFile(filepath, content);
});

registerBuiltinFunction('fs_async_delete', async (filepath: string) => {
  return await AsyncFileSystem.deleteFile(filepath);
});

registerBuiltinFunction('fs_async_exists', async (filepath: string) => {
  return await AsyncFileSystem.exists(filepath);
});

registerBuiltinFunction('fs_async_stat', async (filepath: string) => {
  return await AsyncFileSystem.stat(filepath);
});

registerBuiltinFunction('fs_buffer_read', (filepath: string) => {
  return BufferUtils.readBuffer(filepath);
});

registerBuiltinFunction('fs_buffer_write', (filepath: string, buffer: any) => {
  if (buffer instanceof Buffer) {
    BufferUtils.writeBuffer(filepath, buffer);
  }
});

registerBuiltinFunction('fs_buffer_concat', (buffers: any[]) => {
  return BufferUtils.concat(buffers.filter((b) => b instanceof Buffer));
});

registerBuiltinFunction('path_normalize', (filepath: string) => {
  return PosixPath.normalize(filepath);
});

registerBuiltinFunction('path_resolve', (...segments: any[]) => {
  return PosixPath.resolve(...segments.map(String));
});

registerBuiltinFunction('path_relative', (from: string, to: string) => {
  return PosixPath.relative(from, to);
});

registerBuiltinFunction('path_dirname', (filepath: string) => {
  return PosixPath.dirname(filepath);
});

registerBuiltinFunction('path_basename', (filepath: string, ext?: string) => {
  return PosixPath.basename(filepath, ext);
});

registerBuiltinFunction('glob_match', (pattern: string, text: string) => {
  const matcher = new GlobMatcher(pattern);
  return matcher.match(text);
});

registerBuiltinFunction('glob_glob', (pattern: string, texts: any[]) => {
  return GlobMatcher.glob(pattern, texts.map(String));
});

registerBuiltinFunction('tempfile_create', (prefix?: string) => {
  return new TempFile(prefix).getPath();
});

registerBuiltinFunction('tempfile_cleanup', (prefix: string) => {
  TempFile.cleanup(prefix);
});

export { AsyncFileSystem, BufferUtils, PosixPath, GlobMatcher, TempFile };
