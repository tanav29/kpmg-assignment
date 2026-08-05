import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; const { status, teacherAnswer } = await req.json();
    if (!["APPROVED", "REJECTED"].includes(status)) return NextResponse.json({ error: "A doubt can only be approved or rejected from the review queue." }, { status: 400 });
    if (status === "APPROVED" && (typeof teacherAnswer !== "string" || !teacherAnswer.trim())) return NextResponse.json({ error: "An approved doubt needs an answer." }, { status: 400 });
    const updated = await db.doubt.updateMany({ where: { id, status: "PENDING" }, data: { status, teacherAnswer: typeof teacherAnswer === "string" ? teacherAnswer.trim() : null } });
    if (updated.count === 0) return NextResponse.json({ error: "This doubt was already reviewed or does not exist." }, { status: 409 });
    return NextResponse.json(await db.doubt.findUnique({ where: { id } }));
  } catch { return NextResponse.json({ error: "Doubt could not be updated." }, { status: 500 }); }
}
