import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import {
  InvalidRequestError,
  readJson,
  trimmedText,
  text,
} from "@/lib/request";

const SUPPORTED_LANGUAGES = ["python", "javascript"] as const;
const MAX_TEST_CASES = 50;
const MAX_TEST_VALUE_LENGTH = 2_000;

type RouteContext = { params: Promise<{ id: string }> };
type TestCaseInput = { input: string; expected: string; visible?: boolean };

function testCases(value: unknown): TestCaseInput[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter(
    (test): test is TestCaseInput =>
      Boolean(test) &&
      typeof test === "object" &&
      text((test as TestCaseInput).input) &&
      text((test as TestCaseInput).expected),
  );
}

function errorResponse(error: unknown, fallback: string, status = 500) {
  if (error instanceof InvalidRequestError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status });
}

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const challenge = await db.challenge.findUnique({
      where: { id },
      include: { testCases: true },
    });
    if (!challenge)
      return NextResponse.json(
        { error: "Challenge not found." },
        { status: 404 },
      );

    const teacher = new URL(req.url).searchParams.get("role") === "teacher";
    return NextResponse.json({
      ...challenge,
      testCases: teacher
        ? challenge.testCases
        : challenge.testCases.filter((test) => test.visible),
    });
  } catch (error) {
    return errorResponse(error, "Challenge could not be loaded.");
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await readJson(req);
    const title = trimmedText(body.title);
    const description = trimmedText(body.description);
    const language = body.language;
    const providedTests = testCases(body.testCases);

    if (
      !title ||
      !description ||
      !SUPPORTED_LANGUAGES.includes(
        language as (typeof SUPPORTED_LANGUAGES)[number],
      )
    ) {
      throw new InvalidRequestError(
        "A title, description, and supported language are required.",
      );
    }
    if (title.length > 160 || description.length > 4_000) {
      throw new InvalidRequestError("Challenge text is too long.");
    }
    if (
      providedTests &&
      (providedTests.length === 0 || providedTests.length > MAX_TEST_CASES)
    ) {
      throw new InvalidRequestError("Add between 1 and 50 valid test cases.");
    }

    const challenge = await db.challenge.update({
      where: { id },
      data: {
        title,
        description,
        language: language as string,
        ...(providedTests
          ? {
              testCases: {
                deleteMany: {},
                create: providedTests.map((test) => ({
                  input: test.input.slice(0, MAX_TEST_VALUE_LENGTH),
                  expected: test.expected.slice(0, MAX_TEST_VALUE_LENGTH),
                  visible: Boolean(test.visible),
                })),
              },
            }
          : {}),
      },
      include: { testCases: true },
    });
    return NextResponse.json(challenge);
  } catch (error) {
    return errorResponse(error, "Challenge could not be updated.");
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    await db.challenge.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Challenge could not be deleted.");
  }
}
