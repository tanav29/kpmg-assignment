import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import {
  InvalidRequestError,
  readJson,
  trimmedText,
  text,
} from "@/lib/request";

const REVIEW_STATUSES = ["APPROVED", "REJECTED"] as const;
const MAX_ANSWER_LENGTH = 4_000;

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await readJson(req);
    const status = body.status;
    const teacherAnswer = body.teacherAnswer;

    if (!id) throw new InvalidRequestError("Doubt id is required.");
    if (!REVIEW_STATUSES.includes(status as (typeof REVIEW_STATUSES)[number])) {
      throw new InvalidRequestError(
        "A doubt can only be approved or rejected from the review queue.",
      );
    }
    if (status === "APPROVED" && !trimmedText(teacherAnswer)) {
      throw new InvalidRequestError("An approved doubt needs an answer.");
    }
    if (
      text(teacherAnswer) &&
      teacherAnswer.trim().length > MAX_ANSWER_LENGTH
    ) {
      throw new InvalidRequestError("The answer is too long.");
    }

    const updated = await db.doubt.updateMany({
      where: { id, status: "PENDING" },
      data: {
        status: status as (typeof REVIEW_STATUSES)[number],
        teacherAnswer: text(teacherAnswer) ? teacherAnswer.trim() : null,
      },
    });
    if (updated.count === 0) {
      return NextResponse.json(
        { error: "This doubt was already reviewed or does not exist." },
        { status: 409 },
      );
    }

    return NextResponse.json(await db.doubt.findUnique({ where: { id } }));
  } catch (error) {
    if (error instanceof InvalidRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Doubt could not be updated.", error);
    return NextResponse.json(
      { error: "Doubt could not be updated." },
      { status: 500 },
    );
  }
}
