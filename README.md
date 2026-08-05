# KPMG Code Lab

A small MVP for guided programming practice. Students can run a solution, see saved attempts and concise AI feedback, then post programming doubts. Teachers can review the AI draft, edit it in place, and approve or reject it.

## Stack

- Next.js App Router + TypeScript
- TailwindCSS
- Prisma + PostgreSQL
- AI SDK with OpenAI (`gpt-4o-mini`)
- E2B Code Interpreter for isolated execution

## Getting started

```bash
bun install
copy .env.example .env
bunx prisma db push
bun dev
```

Open `http://localhost:3000`.

Set `DATABASE_URL` in `.env` to your PostgreSQL connection string, then run `bun run db:push`. Add `GROQ_API_KEY` and `E2B_API_KEY` to enable live AI responses and E2B execution. Without those keys, the app uses local preview responses so the UI can still be reviewed.

## MVP workflow

- Students open `/?role=student`, choose a challenge, submit code, see per-test results, review their own attempts, and ask doubts.
- Teachers open `/?role=teacher`, create challenges with visible or hidden test cases, review submissions, and approve or reject AI-assisted doubt answers.
- Challenge CRUD lives at `GET/POST /api/challenges` and `GET/PATCH/DELETE /api/challenges/:id`.
- Student submissions run once per predefined test case and are stored with a concise output summary and persistent AI feedback.

## Security and MVP limitations

The role switch is intentionally demo-only; it is not authorization. Real deployments must add authentication and enforce the user/teacher identity server-side. Student challenge responses hide non-visible test inputs, while teacher endpoints expose the review queue. Code, challenge text, and doubts are treated as untrusted AI input, length-limited, delimited, and checked for common prompt-injection phrases.

## Architecture

The app intentionally keeps the surface area small:

- `app/ui/code-lab.tsx` is the single client-side workspace for the student and teacher views.
- `app/api/submit` runs code, requests feedback, and saves a `Submission`.
- `app/api/doubts` creates a doubt with an AI draft and lists the review queue.
- `app/api/doubts/[id]` updates status and the teacher-edited answer.
- `lib/execute.ts` is the only E2B boundary; `lib/ai.ts` is the only AI SDK boundary and uses `lib/ai-safety.ts`.
- `lib/prisma.ts` owns the shared Prisma client.

## Notes

The assignment calls for predefined test cases. The starter challenge is represented by the submitted program and E2B execution hook; adding challenge-specific assertions is intentionally isolated to `lib/execute.ts` so a second challenge does not require changes to the UI or persistence layer.
