import { Sandbox } from "@e2b/code-interpreter";

export type TestResult = {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  visible?: boolean;
};

const MAX_CODE_LENGTH = 12_000;
const MAX_TESTS = 50;
const MAX_OUTPUT_LENGTH = 4_000;

function localResult(
  testCases: { input: string; expected: string; visible?: boolean }[],
) {
  return {
    passed: false,
    output:
      "Not graded: configure E2B_API_KEY to run code in an isolated sandbox.",
    tests: testCases.map((test) => ({
      ...test,
      actual: "Not executed",
      passed: false,
    })),
  };
}

export async function executeAgainstTests(
  code: string,
  language: string,
  testCases: { input: string; expected: string; visible?: boolean }[],
) {
  if (code.length > MAX_CODE_LENGTH || testCases.length > MAX_TESTS)
    throw new Error("Submission is too large.");
  if (!process.env.E2B_API_KEY) return localResult(testCases);
  const sandbox = await Sandbox.create({ apiKey: process.env.E2B_API_KEY });
  const tests: TestResult[] = [];
  try {
    for (const test of testCases) {
      const prepared =
        language === "python"
          ? `import builtins\n__codex_inputs = iter(${JSON.stringify(test.input.split("\\n"))})\nbuiltins.input = lambda prompt='': next(__codex_inputs)\n${code}`
          : `globalThis.prompt = (() => { const values = ${JSON.stringify(test.input.split("\\n"))}; let i = 0; return () => values[i++] ?? ""; })();\n${code}`;
      try {
        const result = await sandbox.runCode(prepared, {
          language: language === "python" ? "python" : "javascript",
          timeoutMs: 5_000,
          requestTimeoutMs: 10_000,
        });
        const actual = [...result.logs.stdout, ...result.logs.stderr]
          .join("\n")
          .trim()
          .slice(0, MAX_OUTPUT_LENGTH);
        tests.push({
          ...test,
          actual,
          passed: result.error === undefined && actual === test.expected.trim(),
        });
      } catch (error) {
        tests.push({
          ...test,
          actual: error instanceof Error ? error.message : "Execution failed",
          passed: false,
        });
      }
    }
    return {
      passed: tests.every((test) => test.passed),
      output: tests
        .map(
          (test, index) =>
            `Test ${index + 1}: ${test.passed ? "passed" : "failed"}\nExpected: ${test.expected}\nActual: ${test.actual}`,
        )
        .join("\n\n"),
      tests,
    };
  } finally {
    await sandbox.kill();
  }
}
