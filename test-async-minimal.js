// Minimal async test
const { ProgramRunner } = require('./dist/cli/runner');

const runner = new ProgramRunner();

// Test without type annotations
const code = `
fn main() {
  println("Hello from main");
}
`;

console.log("=== Test: Basic function ===");
const result = runner.runString(code);
console.log("Result:", result);
