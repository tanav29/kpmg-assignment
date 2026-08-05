import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { doubtDraft } from "@/lib/ai";

export async function GET(req: Request) {
  try { const ownerId = new URL(req.url).searchParams.get("ownerId") ?? "demo-student"; return NextResponse.json(await db.doubt.findMany({ where: { ownerId, status: "APPROVED" }, orderBy: { createdAt: "desc" } })); }
  catch { return NextResponse.json({ error: "Doubts could not be loaded." }, { status: 500 }); }
}
export async function POST(req: Request) {
  try { const { question, ownerId = "demo-student" } = await req.json(); if (!question?.trim()) return NextResponse.json({ error: "Question is required." }, { status: 400 }); const doubt = await db.doubt.create({ data: { ownerId, question: question.trim(), aiDraft: await doubtDraft(question) } }); return NextResponse.json(doubt); }
  catch { return NextResponse.json({ error: "Question could not be posted." }, { status: 500 }); }
}
