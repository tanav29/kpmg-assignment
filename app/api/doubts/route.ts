import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { doubtDraft } from "@/lib/ai";

export async function GET() {
  try {
    // The board is shared, but only teacher-approved answers are public.
    return NextResponse.json(await db.doubt.findMany({ where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 50 }));
  } catch { return NextResponse.json({ error: "Doubts could not be loaded." }, { status: 500 }); }
}
export async function POST(req: Request) {
  try {
    const { question } = await req.json();
    const ownerId = "demo-student"; // Replace with the authenticated user's id in production.
    if (typeof question !== "string" || !question.trim()) return NextResponse.json({ error: "Question is required." }, { status: 400 });
    if (question.length > 2_000) return NextResponse.json({ error: "Question must be 2,000 characters or fewer." }, { status: 400 });
    const doubt = await db.doubt.create({ data: { ownerId, question: question.trim(), aiDraft: await doubtDraft(question.trim()) } });
    return NextResponse.json(doubt, { status: 201 });
  } catch { return NextResponse.json({ error: "Question could not be posted." }, { status: 500 }); }
}
