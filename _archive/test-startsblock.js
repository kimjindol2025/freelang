const { IndentationAnalyzer } = require('./dist/src/parser/indentation-analyzer');

const code = `if x > 5
  print(x)
  if y > 10
    print(y)`;

const analyzer = new IndentationAnalyzer(code);
console.log('Code:');
console.log(code);
console.log('\nLine analysis:');
const lines = code.split('\n');
lines.forEach((line, i) => {
  const indent = analyzer.getLineIndent(i);
  console.log(`Line ${i}: "${line}" (indent=${indent})`);
});

console.log('\nstartBlock results:');
console.log('startsBlock(0):', analyzer.startsBlock(0));
console.log('startsBlock(1):', analyzer.startsBlock(1));
console.log('startsBlock(2):', analyzer.startsBlock(2));
console.log('startsBlock(3):', analyzer.startsBlock(3));
