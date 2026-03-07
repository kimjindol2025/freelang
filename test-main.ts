import * as path from 'path';
import { Lexer } from './src/lexer/lexer';
import { TokenBuffer } from './src/lexer/lexer';
import { Parser } from './src/parser/parser';
import { ModuleResolver } from './src/module/module-resolver';

const file = path.join(__dirname, 'main-module-test.fl');
const resolver = new ModuleResolver();
const mod = resolver.loadModule(file);

console.log(`Module path: ${mod.path}`);
console.log(`Imports: ${mod.imports.length}`);
for (let i = 0; i < mod.imports.length; i++) {
  const imp = mod.imports[i];
  console.log(`  [${i}] from: "${imp.from}", names: ${imp.imports.map(s => s.name).join(', ')}`);
}

// Also parse directly without caching
console.log('\n--- Direct parsing (no cache) ---');
const fs = require('fs');
const code = fs.readFileSync(file, 'utf-8');
const lexer = new Lexer(code);
const tokens = new TokenBuffer(lexer);
const parser = new Parser(tokens);
const modDirect = parser.parseModule();

console.log(`Direct imports: ${modDirect.imports.length}`);
for (let i = 0; i < modDirect.imports.length; i++) {
  const imp = modDirect.imports[i];
  console.log(`  [${i}] from: "${imp.from}", names: ${imp.imports.map(s => s.name).join(', ')}`);
}
