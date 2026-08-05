import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

const fallback = { title: "Palindrome checker", description: "Read a line of text and print true when it reads the same forwards and backwards, ignoring spaces and case.", language: "python", testCases: [{ input: "Never odd or even", expected: "true", visible: true }, { input: "hello", expected: "false", visible: true }] };

export async function GET(req: Request) {
  try {
    const teacher = new URL(req.url).searchParams.get("role") === "teacher";
    let challenges = await db.challenge.findMany({ include: { testCases: true }, orderBy: { createdAt: "asc" } });
    if (challenges.length === 0) challenges = [await db.challenge.create({ data: { ...fallback, testCases: { create: fallback.testCases } }, include: { testCases: true } })];
    return NextResponse.json(challenges.map(challenge => ({ ...challenge, testCases: teacher ? challenge.testCases : challenge.testCases.filter(test => test.visible) })));
  } catch { return NextResponse.json({ error: "Challenges could not be loaded." }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.title?.trim() || !body.description?.trim() || !["python", "javascript"].includes(body.language)) return NextResponse.json({ error: "A title, description, and supported language are required." }, { status: 400 });
    if (body.title.length > 160 || body.description.length > 4_000) return NextResponse.json({ error: "Challenge text is too long." }, { status: 400 });
    const testCases = Array.isArray(body.testCases) ? body.testCases.filter((test: { input?: string; expected?: string }) => typeof test.input === "string" && typeof test.expected === "string") : [];
    if (testCases.length === 0 || testCases.length > 50) return NextResponse.json({ error: "Add between 1 and 50 valid test cases." }, { status: 400 });
    const challenge = await db.challenge.create({ data: { title: body.title.trim(), description: body.description.trim(), language: body.language, testCases: { create: testCases.map((test: { input: string; expected: string; visible?: boolean }) => ({ input: test.input.slice(0, 2_000), expected: test.expected.slice(0, 2_000), visible: Boolean(test.visible) })) } }, include: { testCases: true } });
    return NextResponse.json(challenge, { status: 201 });
  } catch { return NextResponse.json({ error: "Challenge could not be created." }, { status: 500 }); }
}
