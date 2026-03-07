// Test async functions
const { ProgramRunner } = require('./dist/cli/runner');

const runner = new ProgramRunner();

// Test 1: Async function without type annotation
const code1 = `
async fn getAsyncValue() {
  return 42;
}

fn main() {
  var result = getAsyncValue();
  println(result);
}
`;

console.log("=== Test 1: Async function (no types) ===");
try {
  const result = runner.runString(code1);
  console.log("Success:", result.success);
  console.log("Output:", result.output);
  if (!result.success) {
    console.log("Error:", result.error);
  }
} catch (err) {
  console.error("Exception:", err.message);
}

console.log("");

// Test 2: Regular function
const code2 = `
fn getNumber() {
  return 99;
}

fn main() {
  var result = getNumber();
  println(result);
}
`;

console.log("=== Test 2: Regular function ===");
try {
  const result = runner.runString(code2);
  console.log("Success:", result.success);
  console.log("Output:", result.output);
  if (!result.success) {
    console.log("Error:", result.error);
  }
} catch (err) {
  console.error("Exception:", err.message);
}
