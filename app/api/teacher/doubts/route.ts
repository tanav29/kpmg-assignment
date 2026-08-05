import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
export async function GET() {
  try {
    return NextResponse.json(
      await db.doubt.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
      }),
    );
  } catch {
    return NextResponse.json(
      { error: "Review queue could not be loaded." },
      { status: 500 },
    );
  }
}
