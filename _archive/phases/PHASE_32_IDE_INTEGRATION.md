# Phase 32: IDE Integration (LSP + VS Code)

**Status**: Starting
**Goal**: Implement Language Server Protocol (LSP) for real-time IDE support
**Target**: VS Code extension + WebStorm plugin foundation
**Timeline**: 10 days (7 days LSP + 3 days IDE plugins)

---

## 🎯 Phase Overview

### Objectives

1. ✅ **LSP Server Implementation** (5 days, 1,200 LOC)
   - Full LSP 3.16 protocol support
   - Text document synchronization
   - Hover information
   - Code completion
   - Go to definition
   - Find references
   - Diagnostics (type errors, warnings)

2. ✅ **VS Code Extension** (2 days, 400 LOC)
   - LSP client for VS Code
   - Syntax highlighting
   - Hover tooltips
   - Real-time error squiggles
   - Code completion popup

3. ✅ **WebStorm Plugin Foundation** (1 day, 200 LOC)
   - LSP client integration
   - JetBrains SDK setup
   - Plugin configuration

---

## 📋 Implementation Plan

### Phase 32A: LSP Server Foundation (Days 1-2)

**File**: `src/lsp/language-server.ts` (400 LOC)

```typescript
import { createConnection, TextDocuments } from 'vscode-languageserver';
import { FreeLangAnalyzer } from '../analyzer';

export class FreeLangLanguageServer {
  private connection = createConnection();
  private documents = new TextDocuments(TextDocument);
  private analyzer = new FreeLangAnalyzer();

  start(): void {
    // Initialize protocol
    this.connection.onInitialize((params) => {
      return {
        capabilities: {
          textDocumentSync: TextDocumentSyncKind.Full,
          hoverProvider: true,
          completionProvider: { triggerCharacters: ['.', ':'] },
          definitionProvider: true,
          referencesProvider: true,
          publishDiagnostics: true
        }
      };
    });

    // Hover information
    this.connection.onHover((params) => {
      const type = this.analyzer.inferType(params);
      return { contents: `Type: ${type}` };
    });

    // Completions
    this.connection.onCompletion((params) => {
      return this.analyzer.getCompletions(params);
    });

    // Diagnostics
    this.documents.onDidChangeContent((event) => {
      const diagnostics = this.analyzer.validateFile(event.document);
      this.connection.sendDiagnostics({ uri: event.document.uri, diagnostics });
    });

    this.connection.listen();
  }
}
```

### Phase 32B: Advanced LSP Features (Days 3-4)

**Files**:
- `src/lsp/hover-provider.ts` (200 LOC)
- `src/lsp/completion-provider.ts` (250 LOC)
- `src/lsp/definition-provider.ts` (200 LOC)
- `src/lsp/diagnostics-engine.ts` (300 LOC)

**Features**:
```typescript
// Hover: Show type + doc + inferred info
onHover(params) {
  return {
    contents: {
      kind: 'markdown',
      value: `## ${variable.name}\n\`\`\`\n${variable.type}\n\`\`\`\n\n${variable.doc}`
    }
  };
}

// Completion: Smart suggestions
onCompletion(params) {
  const context = this.getContext(params);
  return [
    { label: 'array<T>', kind: 10 },  // Snippet
    { label: 'map', kind: 5 },         // Keyword
    { label: 'compareFunc', kind: 6 }  // Variable
  ];
}

// Go to definition
onDefinition(params) {
  const definition = this.analyzer.findDefinition(params);
  return { uri: definition.file, range: definition.range };
}

// Diagnostics
validateFile(document) {
  const errors = this.analyzer.typeCheck(document.text);
  return errors.map(e => ({
    severity: DiagnosticSeverity.Error,
    range: e.range,
    message: e.message
  }));
}
```

### Phase 32C: VS Code Extension (Days 5-6)

**Files**:
- `vscode-extension/extension.ts` (150 LOC)
- `vscode-extension/package.json` (100 LOC)
- `vscode-extension/package.ts` (150 LOC)

**Features**:
- Language registration (`.fl` files)
- LSP client connection
- Syntax highlighting
- Theme integration
- Keybindings

```typescript
export async function activate(context: ExtensionContext) {
  const client = new LanguageClient(
    'freelang',
    'FreeLang Language Server',
    {
      command: 'node',
      args: ['./server/dist/index.js']
    },
    {
      documentSelector: [{ language: 'freelang', scheme: 'file' }]
    }
  );

  client.start();
  context.subscriptions.push(client);
}
```

### Phase 32D: WebStorm Plugin Foundation (Day 7)

**Files**:
- `jetbrains-plugin/src/Main.kt` (150 LOC)
- `jetbrains-plugin/plugin.xml` (50 LOC)

```kotlin
class FreeLangLanguageProvider : LSPBasedLanguageServerProvider() {
  override fun createConnection(): LSPServerDescriptor {
    return object : LSPServerDescriptor("freelang") {
      override val command = "node /path/to/lsp/server.js"
    }
  }
}
```

### Phase 32E: Testing & Documentation (Days 8-10)

**Test Files**:
- `tests/lsp-server.test.ts` (300 LOC)
- `tests/vs-code-integration.test.ts` (200 LOC)

**Documentation**:
- Installation guide
- Feature overview
- Configuration options
- Troubleshooting guide

---

## 📦 Deliverables

### Core LSP Server (1,200+ LOC)
- Full LSP 3.16 protocol implementation
- Text document synchronization
- Type inference integration
- Real-time diagnostics
- Performance: Sub-100ms latency for most operations

### VS Code Extension (400 LOC)
- .vsix package for marketplace
- Syntax highlighting
- Theme support
- Extension settings UI

### WebStorm Plugin (200 LOC)
- .jar plugin package
- JetBrains marketplace ready
- Kotlin + IntelliJ SDK

### Documentation (500+ LOC)
- User installation guide
- Developer guide
- API reference
- Performance benchmarks

---

## ✅ Success Criteria

### LSP Server
- [ ] All LSP message types handled
- [ ] <100ms latency on hover/completion
- [ ] Type inference accuracy >95%
- [ ] Handles 100K+ LOC files
- [ ] Memory usage <200MB

### VS Code Extension
- [ ] Published on marketplace
- [ ] >1000 downloads in first month
- [ ] 4.5+ star rating
- [ ] Handles all FreeLang syntax

### WebStorm Plugin
- [ ] JetBrains IDE compatibility
- [ ] Same features as VS Code
- [ ] Performance parity with LSP server

### Overall
- [ ] All 50+ tests passing
- [ ] Zero critical bugs
- [ ] Comprehensive documentation
- [ ] Community-ready

---

## 📅 Timeline

```
Days 1-2:   LSP Server Foundation (initialize, text sync, basic features)
Days 3-4:   Advanced LSP (hover, completion, diagnostics)
Days 5-6:   VS Code Extension (client, UI, marketplace)
Day 7:      WebStorm Plugin Foundation (LSP client, kotlin setup)
Days 8-10:  Testing, docs, deployment
```

---

## 🔗 Dependencies

✅ **Phase 31** (Performance Optimization)
- LSP server needs sub-100ms latency
- Type inference must be fast (now 100-200ms for typical files)
- Real-time completion requires quick response

✅ **Phase 4** (Advanced Type System)
- Type inference engines
- Trait validation
- Constraint solving

✅ **v2.2.0** (Current Release)
- All existing analyzers
- Test suite
- Documentation

---

## 📊 Expected Impact

### User Experience
- Real-time type hints while typing
- Instant error detection
- Smart code completion
- Seamless IDE integration

### Developer Productivity
- 50% faster code writing (reduced lookup time)
- Type-safe refactoring
- IDE-guided learning

### FreeLang Adoption
- Professional tooling
- Competitive with TypeScript/Rust
- Enterprise-ready setup
- Open source community engagement

---

## Next: Start LSP Server Implementation

Ready to begin Phase 32A (LSP Server Foundation)?
