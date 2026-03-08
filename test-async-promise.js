// Test Promise support
const { ProgramRunner } = require('./dist/cli/runner');

const runner = new ProgramRunner();

// Test 1: Async function returns Promise
const code1 = `
async fn getValue() {
  return 42;
}

fn main() {
  var p = getValue();
  var isPromise = typeof p;
  println("Promise type:");
  println(isPromise);
}
`;

console.log("=== Test 1: Async function returns Promise ===");
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

// Test 2: Promise.resolve
const code2 = `
fn main() {
  var p = Promise.resolve(99);
  println("Created promise:");
  println(p);
}
`;

console.log("=== Test 2: Promise.resolve ===");
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

console.log("");

// Test 3: .then() on Promise
const code3 = `
fn main() {
  var p = Promise.resolve(123);
  // Call then with a simple lambda
  p.then(fn(x) -> println(x));
}
`;

console.log("=== Test 3: Promise.then() ===");
try {
  const result = runner.runString(code3);
  console.log("Success:", result.success);
  console.log("Output:", result.output);
  if (!result.success) {
    console.log("Error:", result.error);
  }
} catch (err) {
  console.error("Exception:", err.message);
}
