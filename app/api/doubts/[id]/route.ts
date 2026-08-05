import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; const { status, teacherAnswer } = await req.json();
    if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    return NextResponse.json(await db.doubt.update({ where: { id }, data: { status, teacherAnswer: teacherAnswer ?? undefined } }));
  } catch { return NextResponse.json({ error: "Doubt could not be updated." }, { status: 500 }); }
}
