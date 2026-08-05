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

const fallbackChallenge = {
  title: "Palindrome checker",
  description:
    "Read a line of text and print true when it reads the same forwards and backwards, ignoring spaces and case.",
  language: "python",
  testCases: [
    { input: "Never odd or even", expected: "true", visible: true },
    { input: "hello", expected: "false", visible: true },
  ],
};

type TestCaseInput = { input: string; expected: string; visible?: boolean };

function validTestCases(value: unknown): TestCaseInput[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (test): test is TestCaseInput =>
      Boolean(test) &&
      typeof test === "object" &&
      text((test as TestCaseInput).input) &&
      text((test as TestCaseInput).expected),
  );
}

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof InvalidRequestError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(req: Request) {
  try {
    const teacher = new URL(req.url).searchParams.get("role") === "teacher";
    let challenges = await db.challenge.findMany({
      include: { testCases: true },
      orderBy: { createdAt: "asc" },
    });

    if (challenges.length === 0) {
      challenges = [
        await db.challenge.create({
          data: {
            ...fallbackChallenge,
            testCases: { create: fallbackChallenge.testCases },
          },
          include: { testCases: true },
        }),
      ];
    }

    return NextResponse.json(
      challenges.map((challenge) => ({
        ...challenge,
        testCases: teacher
          ? challenge.testCases
          : challenge.testCases.filter((test) => test.visible),
      })),
    );
  } catch (error) {
    return errorResponse(error, "Challenges could not be loaded.");
  }
}

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const title = trimmedText(body.title);
    const description = trimmedText(body.description);
    const language = body.language;
    const testCases = validTestCases(body.testCases);

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
    if (testCases.length === 0 || testCases.length > MAX_TEST_CASES) {
      throw new InvalidRequestError("Add between 1 and 50 valid test cases.");
    }

    const challenge = await db.challenge.create({
      data: {
        title,
        description,
        language: language as string,
        testCases: {
          create: testCases.map((test) => ({
            input: test.input.slice(0, MAX_TEST_VALUE_LENGTH),
            expected: test.expected.slice(0, MAX_TEST_VALUE_LENGTH),
            visible: Boolean(test.visible),
          })),
        },
      },
      include: { testCases: true },
    });
    return NextResponse.json(challenge, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Challenge could not be created.");
  }
}
