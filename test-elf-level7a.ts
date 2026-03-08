import { Interpreter } from './src/engine/interpreter';
import { Parser } from './src/parser/parser';
import { Lexer } from './src/lexer/lexer';
import * as fs from 'fs';

const flCode = fs.readFileSync('./src/stdlib/self-elf-header.fl', 'utf-8');

console.log('=== Level 7A ELF Header Test ===\n');
console.log('Code to execute:');
console.log(flCode.slice(0, 300) + '...\n');

try {
  const lexer = new Lexer(flCode);
  const tokens = lexer.tokenize();
  console.log(`✓ Lexer: ${tokens.length} tokens generated\n`);

  const parser = new Parser(tokens);
  const ast = parser.parse();
  console.log(`✓ Parser: AST generated (${Object.keys(ast).length} root nodes)\n`);

  const interpreter = new Interpreter();
  const result = interpreter.execute(ast);
  console.log(`✓ Interpreter: Execution completed\n`);
  console.log(`Result: ${result}\n`);

  // Check if file was created
  if (fs.existsSync('/tmp/test_elf')) {
    const stats = fs.statSync('/tmp/test_elf');
    console.log(`✅ ELF file created: /tmp/test_elf (${stats.size} bytes)`);
    
    // Check ELF magic number
    const buf = fs.readFileSync('/tmp/test_elf');
    const magic = buf.slice(0, 4).toString('hex');
    console.log(`✅ ELF magic number: 0x${magic}`);
    
    if (magic === '7f454c46') {
      console.log('✅ Valid ELF header detected (0x7f454c46 = ".ELF")\n');
    }
  } else {
    console.log('❌ ELF file was not created\n');
  }

} catch (e: any) {
  console.error('❌ Error:', e.message);
  console.error(e.stack);
}
