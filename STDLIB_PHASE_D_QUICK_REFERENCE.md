# FreeLang stdlib Phase D - Quick Reference Guide

## Phase D-1: Regex Enhanced

### New Functions
```typescript
import * as regex from "std/regex"

// Execute with match details
regex.exec('test@example.com', '[a-z]+@[a-z.]+')
// → { text: 'test@example.com', index: 0, length: 16, ... }

// Find all matches
regex.findAll('hello 123 world 456', '\\d+')
// → [{ text: '123', index: 6, ... }, { text: '456', index: 18, ... }]

// Find first match
regex.findFirst('hello 123', '\\d+')
// → { text: '123', index: 6, length: 3, ... }

// Named captures (requires groupNames array)
regex.captureNamed('john@example.com', '([a-z]+)@([a-z.]+)', ['user', 'domain'])
// → { user: 'john', domain: 'example.com' }

// Test multiple patterns
regex.testMultiple('test@email.com', {
  hasEmail: '@',
  hasNumbers: '\\d+'
})
// → { hasEmail: true, hasNumbers: false }

// Group and count matches
regex.groupMatches('apple apple banana cherry apple', 'apple')
// → { apple: 3 }
```

## Phase D-2: DateTime Enhanced

### New Functions
```typescript
import * as date from "std/date"

// Time differences
const d1 = new Date(2026, 2, 1);
const d2 = new Date(2026, 2, 11);

date.millisBetween(d1, d2)   // → 864000000
date.secondsBetween(d1, d2)  // → 864000
date.minutesBetween(d1, d2)  // → 14400
date.hoursBetween(d1, d2)    // → 240
date.daysBetween(d1, d2)     // → 10
date.monthsBetween(d1, d2)   // → 0
date.yearsBetween(d1, d2)    // → 0

// Advanced formatting
const now = new Date();
date.formatAdvanced(now, '%Y-%m-%d %A %H:%M:%S')
// → "2026-03-06 Friday 15:30:45"

// Parse with custom format
date.parseWithFormat('2026-03-06', '%Y-%m-%d')
// → Date object for March 6, 2026

// Date range checks
date.isPast(new Date(2020, 0, 1))     // → true
date.isFuture(new Date(2099, 0, 1))   // → true
date.daysElapsed(new Date(2026, 2, 1)) // → 5

// Age calculation
const birthDate = new Date(2000, 0, 1);
date.getAge(birthDate)  // → 26

// Boundaries
date.startOfMonth(now)  // → Date at 00:00:00 on 1st
date.endOfMonth(now)    // → Date at 23:59:59 on last day
date.startOfYear(now)   // → Date at 00:00:00 on Jan 1
date.endOfYear(now)     // → Date at 23:59:59 on Dec 31

// Week number
date.weekOfYear(now)    // → 10 (week in year)
```

### Format Pattern Codes
| Code | Example | Output |
|------|---------|--------|
| `%Y` | `%Y-%m-%d` | 2026-03-06 |
| `%m` | `%m/%d` | 03/06 |
| `%d` | `day %d` | day 06 |
| `%H` | `%H:%M:%S` | 15:30:45 |
| `%M` | `:%M:` | :30: |
| `%S` | `:%S` | :45 |
| `%A` | `%A, %B %d` | Friday, March 06 |
| `%a` | `%a.` | Fri. |
| `%B` | `%B %d` | March 06 |
| `%b` | `%b %d` | Mar 06 |

## Phase D-3: SQLite Enhanced

### New Methods
```typescript
import { SQLiteDatabase } from "std/db"

const db = new SQLiteDatabase('test.db');
await db.open();

// Get database info
const size = await db.getDatabaseSize()           // → bytes
const count = await db.getRowCount('users')       // → 42
const info = await db.getDatabaseInfo()           // → { path, isOpen, ... }

// Index operations
await db.createIndex('idx_email', 'users', 'email', true)
const indexes = await db.getIndexes('users')      // → [{ name, ... }]

// Data exchange
const data = await db.export('SELECT * FROM users')  // → [{ id, name, ... }]
await db.import('users', [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
])

// Backup
await db.backup('backup.db')

await db.close();
```

## Phase D-4: FileSystem Advanced

### New Module & Functions
```typescript
import * as fsAdv from "std/fs-advanced"
// OR
import std from "std"
std.fsAdv.mkdir(...)

// Directory operations
fsAdv.mkdir('/home/user/newdir')              // → true
fsAdv.listDir('/home')                        // → [{ name, path, isDir, isFile }, ...]
fsAdv.walkDir('/home', (result) => {
  console.log(`Dir: ${result.path}`)
  console.log(`Entries: ${result.entries.length}`)
})
fsAdv.rmdir('/home/user/emptydir')            // → true
fsAdv.rmdirRecursive('/home/user/filled')     // → true (removes contents)

// Path inspection
fsAdv.exists('/home/file.txt')                // → true/false
fsAdv.isDir('/home')                          // → true
fsAdv.isFile('/home/file.txt')                // → true
fsAdv.stat('/home/file.txt')                  // → { path, size, created, modified, ... }

// File operations
fsAdv.copyFile('/src/file.txt', '/dst/file.txt')
fsAdv.move('/old/path', '/new/path')
fsAdv.rename('/path/file.txt', 'newname.txt')
fsAdv.chmod('/path/file.txt', '0o755')

// Size & search
fsAdv.getSize('/home')                        // → total size in bytes
fsAdv.findFiles('/home', '*.js')              // → ['/path/file.js', ...]

// Path utilities
fsAdv.getExtension('/path/file.txt')          // → '.txt'
fsAdv.getName('/path/file.txt')               // → 'file'
fsAdv.getParent('/path/to/file.txt')          // → '/path/to'
fsAdv.joinPath('/home', 'user', 'file.txt')   // → '/home/user/file.txt'
fsAdv.normalizePath('/path//to///file')       // → '/path/to/file'
fsAdv.isAbsolutePath('/home/file')            // → true
fsAdv.getRelativePath('/home', '/home/user')  // → 'user'
```

### FileMetadata Interface
```typescript
interface FileMetadata {
  path: string                // Full path
  name: string                // Filename only
  extension: string           // File extension
  isDirectory: boolean        // Is it a directory
  isFile: boolean             // Is it a file
  size: number                // Size in bytes
  created: Date               // Creation time
  modified: Date              // Last modified time
  accessed: Date              // Last accessed time
  mode: number                // File permissions
  isSymlink: boolean          // Is symbolic link
}

const stats = fsAdv.stat('/home/file.txt');
console.log(`Size: ${stats.size} bytes`);
console.log(`Modified: ${stats.modified}`);
```

## Usage Examples

### Regex: Email Validation
```typescript
const emails = ['john@example.com', 'invalid-email', 'alice@domain.co.uk'];
const results = emails.map(email => ({
  email,
  valid: regex.isEmail(email),
  parts: regex.captureNamed(email, '([a-z]+)@([a-z.]+)', ['user', 'domain'])
}));
```

### DateTime: Schedule Next Day
```typescript
const tomorrow = date.addDays(date.now(), 1);
const scheduled = date.format(tomorrow, 'yyyy-MM-dd HH:mm:ss');
console.log(`Scheduled for: ${scheduled}`);

// Age check
if (date.getAge(birthDate) >= 18) {
  console.log('Adult verified');
}
```

### SQLite: Table Statistics
```typescript
const users = await db.getRowCount('users');
const orders = await db.getRowCount('orders');
console.log(`Users: ${users}, Orders: ${orders}`);

// Index table for faster queries
await db.createIndex('idx_date', 'orders', 'created_at');
```

### FileSystem: Directory Backup
```typescript
fsAdv.walkDir('/home/important', (result) => {
  const backupDir = result.path.replace('/home/important', '/backup');
  fsAdv.mkdir(backupDir);

  result.entries.forEach(entry => {
    if (entry.isFile) {
      const src = entry.path;
      const dst = src.replace('/home/important', '/backup');
      fsAdv.copyFile(src, dst);
    }
  });
});
```

## Module Exports

```typescript
// All modules available via std namespace
import std from "std"

std.regex.findAll(...)      // Phase D-1
std.date.formatAdvanced(...) // Phase D-2
std.db.createIndex(...)     // Phase D-3
std.fsAdv.mkdir(...)        // Phase D-4

// Or direct imports
import * as regex from "std/regex"
import * as date from "std/date"
import * as db from "std/db"
import * as fsAdv from "std/fs-advanced"
```

## Error Handling

All functions throw errors on failure:

```typescript
try {
  fsAdv.stat('/nonexistent/file');
} catch (error) {
  console.error(`Error: ${error.message}`);
  // → "Error: Path not found: /nonexistent/file"
}

try {
  regex.compile('(invalid');
} catch (error) {
  // → "Error: Invalid regex pattern: (invalid"
}
```

## Performance Tips

1. **Regex**: Compile patterns once if reusing
   ```typescript
   const pattern = regex.compile('\\d+');
   ```

2. **DateTime**: Use direct functions instead of creating dates
   ```typescript
   date.daysBetween(d1, d2)  // Faster than custom calc
   ```

3. **FileSystem**: Use walkDir with callback for large trees
   ```typescript
   fsAdv.walkDir('/huge/dir', (result) => {
     // Process each directory as found
   })
   ```

4. **SQLite**: Use batch import for multiple rows
   ```typescript
   await db.import('table', largeArray)  // Not one-by-one
   ```

## Compatibility

| Feature | Node.js | Browser | Deno |
|---------|---------|---------|------|
| Regex | ✅ | ✅ | ✅ |
| DateTime | ✅ | ✅ | ✅ |
| SQLite | ✅ | ⚠️ (stub) | ✅ |
| FileSystem | ✅ | ❌ | ⚠️ |

## See Also

- `STDLIB_EXTENSION_PHASE_D.md` - Full documentation
- `STDLIB_PHASE_D_COMPLETION_REPORT.md` - Implementation details
- `test-stdlib-extended.ts` - Usage examples and tests

---

**Last Updated**: March 6, 2026
**Status**: ✅ Complete
**Next Phase**: Phase E - HTTP/HTTPS utilities
