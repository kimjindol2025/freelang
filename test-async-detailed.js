// Detailed async test with console capture
const { ProgramRunner } = require('./dist/cli/runner');

const runner = new ProgramRunner();

// Capture console output
let capturedOutput = '';
const originalLog = console.log;
const originalError = console.error;

function captureOutput(fn) {
  capturedOutput = '';
  const savedLog = console.log;
  console.log = (...args) => {
    capturedOutput += args.join(' ') + '\n';
    // Also print to original
    savedLog(...args);
  };

  try {
    fn();
  } finally {
    console.log = savedLog;
  }

  return capturedOutput;
}

// Test 1: Regular function working
const code1 = `
fn test() {
  return 42;
}

fn main() {
  var x = test();
  println(x);
}
`;

console.log("=== Test 1: Regular function ===");
const output1 = captureOutput(() => {
  const result = runner.runString(code1);
  console.log("[Result] Success:", result.success);
});

console.log("");

// Test 2: Simple async function
const code2 = `
async fn asyncTest() {
  return 77;
}

fn main() {
  var p = asyncTest();
  println("Got Promise:");
  println(typeof p);
}
`;

console.log("=== Test 2: Async function ===");
const output2 = captureOutput(() => {
  const result = runner.runString(code2);
  console.log("[Result] Success:", result.success);
});
