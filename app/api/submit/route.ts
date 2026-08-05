import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { codeFeedback } from "@/lib/ai";
import { executeAgainstTests } from "@/lib/execute";

export async function POST(req: Request) {
  try {
    const { challengeId, language, code, ownerId = "demo-student" } = await req.json();
    if (!challengeId || !language || !code?.trim()) return NextResponse.json({ error: "Challenge, language, and code are required." }, { status: 400 });
    const challenge = await db.challenge.findUnique({ where: { id: challengeId }, include: { testCases: true } });
    if (!challenge) return NextResponse.json({ error: "Challenge not found." }, { status: 404 });
    const run = await executeAgainstTests(code, language, challenge.testCases);
    const feedback = await codeFeedback(code, language, `${challenge.title}: ${challenge.description}`, run.output);
    const submission = await db.submission.create({ data: { challengeId, ownerId, language, code, output: run.output, passed: run.passed, aiFeedback: feedback } });
    return NextResponse.json({ ...submission, tests: run.tests });
  } catch { return NextResponse.json({ error: "Submission could not be run." }, { status: 500 }); }
}

export async function GET(req: Request) {
  try { const url = new URL(req.url); const role = url.searchParams.get("role") ?? "student"; const ownerId = url.searchParams.get("ownerId") ?? "demo-student"; const submissions = await db.submission.findMany({ where: role === "teacher" ? undefined : { ownerId }, include: { challenge: { select: { title: true } } }, orderBy: { createdAt: "desc" }, take: 20 }); return NextResponse.json(submissions); }
  catch { return NextResponse.json({ error: "Attempts could not be loaded." }, { status: 500 }); }
}
