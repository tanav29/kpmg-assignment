import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { codeFeedback } from "@/lib/ai";
import { executeAgainstTests } from "@/lib/execute";

export async function POST(req: Request) {
  try {
    const { challengeId, language, code } = await req.json();
    const ownerId = "demo-student"; // Replace with the authenticated user's id in production.
    if (!challengeId || !language || typeof code !== "string" || !code.trim()) return NextResponse.json({ error: "Challenge, language, and code are required." }, { status: 400 });
    if (code.length > 12_000) return NextResponse.json({ error: "Code must be 12,000 characters or fewer." }, { status: 400 });
    const challenge = await db.challenge.findUnique({ where: { id: challengeId }, include: { testCases: true } });
    if (!challenge) return NextResponse.json({ error: "Challenge not found." }, { status: 404 });
    if (challenge.language !== language || !["python", "javascript"].includes(language)) return NextResponse.json({ error: "Unsupported challenge language." }, { status: 400 });
    const run = await executeAgainstTests(code, language, challenge.testCases);
    // Never send hidden inputs/expected outputs to the student or to the feedback model.
    const tests = run.tests.map(test => test.visible ? test : { visible: false, actual: test.actual, passed: test.passed });
    const output = run.tests.map((test, index) => test.visible
      ? `Test ${index + 1}: ${test.passed ? "passed" : "failed"}\nExpected: ${test.expected}\nActual: ${test.actual}`
      : `Test ${index + 1}: ${test.passed ? "passed" : "failed"}\nHidden test case\nActual: ${test.actual}`).join("\n\n");
    const feedback = await codeFeedback(code, language, `${challenge.title}: ${challenge.description}`, output);
    const submission = await db.submission.create({ data: { challengeId, ownerId, language, code, output, passed: run.passed, aiFeedback: feedback } });
    return NextResponse.json({ ...submission, tests });
  } catch { return NextResponse.json({ error: "Submission could not be run." }, { status: 500 }); }
}

export async function GET(req: Request) {
  try { const url = new URL(req.url); const role = url.searchParams.get("role") ?? "student"; const ownerId = url.searchParams.get("ownerId") ?? "demo-student"; const submissions = await db.submission.findMany({ where: role === "teacher" ? undefined : { ownerId }, include: { challenge: { select: { title: true } } }, orderBy: { createdAt: "desc" }, take: 20 }); return NextResponse.json(submissions); }
  catch { return NextResponse.json({ error: "Attempts could not be loaded." }, { status: 500 }); }
}
