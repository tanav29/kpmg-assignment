import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) { try { const challenge = await db.challenge.findUniqueOrThrow({ where: { id: (await params).id }, include: { testCases: true } }); const teacher = new URL(req.url).searchParams.get("role") === "teacher"; return NextResponse.json({ ...challenge, testCases: teacher ? challenge.testCases : challenge.testCases.filter(test => test.visible) }); } catch { return NextResponse.json({ error: "Challenge not found." }, { status: 404 }); } }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const id = (await params).id; const body = await req.json(); const updated = await db.challenge.update({ where: { id }, data: { title: body.title, description: body.description, language: body.language, ...(Array.isArray(body.testCases) ? { testCases: { deleteMany: {}, create: body.testCases.map((test: TestCaseInput) => ({ input: test.input, expected: test.expected, visible: Boolean(test.visible) })) } } : {}) }, include: { testCases: true } }); return NextResponse.json(updated); }
  catch { return NextResponse.json({ error: "Challenge could not be updated." }, { status: 500 }); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) { try { await db.challenge.delete({ where: { id: (await params).id } }); return NextResponse.json({ ok: true }); } catch { return NextResponse.json({ error: "Challenge could not be deleted." }, { status: 500 }); } }
type TestCaseInput = { input: string; expected: string; visible?: boolean };
