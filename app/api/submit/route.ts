import { NextResponse } from "next/server";
import { codeFeedback } from "@/lib/ai";
import { executeAgainstTests } from "@/lib/execute";
import { db } from "@/lib/prisma";
import { InvalidRequestError, readJson, text } from "@/lib/request";

const OWNER_ID = "demo-student"; // Replace with the authenticated user's id in production.
const SUPPORTED_LANGUAGES = ["python", "javascript"];
const MAX_CODE_LENGTH = 12_000;

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const challengeId = body.challengeId;
    const language = body.language;
    const code = body.code;

    if (!text(challengeId) || !text(language) || !text(code) || !code.trim()) {
      throw new InvalidRequestError(
        "Challenge, language, and code are required.",
      );
    }
    if (code.length > MAX_CODE_LENGTH) {
      throw new InvalidRequestError(
        `Code must be ${MAX_CODE_LENGTH.toLocaleString()} characters or fewer.`,
      );
    }

    const challenge = await db.challenge.findUnique({
      where: { id: challengeId },
      include: { testCases: true },
    });
    if (!challenge)
      return NextResponse.json(
        { error: "Challenge not found." },
        { status: 404 },
      );
    if (
      challenge.language !== language ||
      !SUPPORTED_LANGUAGES.includes(language)
    ) {
      throw new InvalidRequestError("Unsupported challenge language.");
    }

    const run = await executeAgainstTests(code, language, challenge.testCases);
    // Never expose hidden inputs/expected values to students or the AI model.
    const tests = run.tests.map((test) =>
      test.visible
        ? test
        : { visible: false, actual: test.actual, passed: test.passed },
    );
    const output = run.tests
      .map((test, index) =>
        test.visible
          ? `Test ${index + 1}: ${test.passed ? "passed" : "failed"}\nExpected: ${test.expected}\nActual: ${test.actual}`
          : `Test ${index + 1}: ${test.passed ? "passed" : "failed"}\nHidden test case\nActual: ${test.actual}`,
      )
      .join("\n\n");
    const aiFeedback = await codeFeedback(
      code,
      language,
      `${challenge.title}: ${challenge.description}`,
      output,
    );
    const submission = await db.submission.create({
      data: {
        challengeId,
        ownerId: OWNER_ID,
        language,
        code,
        output,
        passed: run.passed,
        aiFeedback,
      },
    });
    return NextResponse.json({ ...submission, tests });
  } catch (error) {
    if (error instanceof InvalidRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Submission could not be run.", error);
    return NextResponse.json(
      { error: "Submission could not be run." },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const role = url.searchParams.get("role") ?? "student";
    const ownerId = url.searchParams.get("ownerId") ?? OWNER_ID;
    const submissions = await db.submission.findMany({
      where: role === "teacher" ? undefined : { ownerId },
      include: { challenge: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json(submissions);
  } catch (error) {
    console.error("Attempts could not be loaded.", error);
    return NextResponse.json(
      { error: "Attempts could not be loaded." },
      { status: 500 },
    );
  }
}
