// Direct test of async/await support
const fs = require('fs');
const { ProgramRunner } = require('./dist/cli/runner');
const { Lexer } = require('./dist/lexer/lexer');
const { Parser } = require('./dist/parser/parser');
const { FunctionRegistry } = require('./dist/parser/function-registry');

const runner = new ProgramRunner();

// Test 1: Simple async function
const code1 = `
async fn getValue() -> number {
  return 42
}

fn main() -> void {
  let p = getValue();
  println("Got promise");
}
`;

console.log("=== Test 1: Simple async function ===");
const result1 = runner.runString(code1);
console.log("Result:", result1);
console.log("");

// Test 2: Promise.resolve
const code2 = `
fn main() -> void {
  var p = Promise.resolve(99);
  println("Created promise");
}
`;

console.log("=== Test 2: Promise.resolve ===");
try {
  const result2 = runner.runString(code2);
  console.log("Result:", result2);
} catch (err) {
  console.error("Error:", err.message);
}
