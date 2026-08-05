import { NextResponse } from "next/server";
import { doubtDraft } from "@/lib/ai";
import { db } from "@/lib/prisma";
import { InvalidRequestError, readJson, trimmedText } from "@/lib/request";

const OWNER_ID = "demo-student"; // Replace with the authenticated user's id in production.
const MAX_QUESTION_LENGTH = 2_000;

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof InvalidRequestError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET() {
  try {
    // The board is shared, but only teacher-approved answers are public.
    const doubts = await db.doubt.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(doubts);
  } catch (error) {
    return errorResponse(error, "Doubts could not be loaded.");
  }
}

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const question = trimmedText(body.question);
    if (!question) throw new InvalidRequestError("Question is required.");
    if (question.length > MAX_QUESTION_LENGTH) {
      throw new InvalidRequestError(
        `Question must be ${MAX_QUESTION_LENGTH.toLocaleString()} characters or fewer.`,
      );
    }

    const doubt = await db.doubt.create({
      data: {
        ownerId: OWNER_ID,
        question,
        aiDraft: await doubtDraft(question),
      },
    });
    return NextResponse.json(doubt, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Question could not be posted.");
  }
}
