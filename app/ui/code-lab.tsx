"use client";
import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  CircleHelp,
  Code2,
  Copy,
  FlaskConical,
  Loader2,
  MessageSquareText,
  Play,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

type TestCase = {
  id?: string;
  input: string;
  expected: string;
  visible?: boolean;
};
type Challenge = {
  id: string;
  title: string;
  description: string;
  language: string;
  testCases: TestCase[];
};
type Submission = {
  id: string;
  challengeId: string;
  challenge?: { title: string };
  output: string;
  passed: boolean;
  aiFeedback: string;
  createdAt: string;
  tests?: {
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
  }[];
};
type Doubt = {
  id: string;
  question: string;
  aiDraft: string;
  teacherAnswer?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
};
const starter = `text = input()\nclean = text.lower().replace(" ", "")\nprint(str(clean == clean[::-1]).lower())`;

export default function CodeLab() {
  const [role, setRole] = useState<"student" | "teacher">("student");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("role") === "teacher")
      setRole("teacher");
  }, []);
  function switchRole(next: "student" | "teacher") {
    setRole(next);
    window.history.replaceState({}, "", `?role=${next}`);
  }
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-[1380px] items-center justify-between px-6 py-5 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center bg-[#1d2825] text-[#efad4b]">
            <FlaskConical size={18} />
          </div>
          <div>
            <div className="text-sm font-extrabold tracking-tight">
              KPMG <span className="font-normal text-[#78817c]">/</span> Code
              Lab
            </div>
            <div className="mono text-[10px] uppercase tracking-[.18em] text-[#78817c]">
              Practice with purpose
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-[#dfe3dc] bg-white/60 p-1 text-xs">
          <button
            onClick={() => switchRole("student")}
            className={`rounded-full px-3 py-1.5 ${role === "student" ? "bg-[#1d2825] text-white" : "text-[#78817c]"}`}
          >
            Student
          </button>
          <button
            onClick={() => switchRole("teacher")}
            className={`rounded-full px-3 py-1.5 ${role === "teacher" ? "bg-[#1d2825] text-white" : "text-[#78817c]"}`}
          >
            Teacher
          </button>
        </div>
      </header>
      <section className="grid-paper border-y border-[#dfe3dc]">
        <div className="mx-auto max-w-[1380px] px-6 py-12 lg:px-10 lg:py-16">
          <div className="mono mb-4 flex items-center gap-2 text-[11px] uppercase tracking-[.18em] text-[#3d966c]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3d966c]" />{" "}
            {role === "student" ? "Student workspace" : "Teacher workspace"}
          </div>
          <h1 className="max-w-xl text-4xl font-extrabold leading-[1.05] tracking-[-.045em] sm:text-6xl">
            Make the thinking
            <br />
            <span className="text-[#78817c]">visible.</span>
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-6 text-[#66716b]">
            {role === "student"
              ? "Choose a challenge, run your solution, and turn stuck moments into good questions."
              : "Shape the practice set, review student work, and turn useful questions into shared understanding."}
          </p>
        </div>
      </section>
      {role === "student" ? <StudentDashboard /> : <TeacherDashboard />}
    </main>
  );
}

function StudentDashboard() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selected, setSelected] = useState<Challenge | null>(null);
  const [code, setCode] = useState(starter);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [history, setHistory] = useState<Submission[]>([]);
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [question, setQuestion] = useState("");
  const [running, setRunning] = useState(false);
  const [asking, setAsking] = useState(false);
  const [tab, setTab] = useState<"workspace" | "doubts">("workspace");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    Promise.all([
      fetch("/api/challenges?role=student"),
      fetch("/api/submit?role=student"),
      fetch("/api/doubts?ownerId=demo-student"),
    ])
      .then(async ([c, s, d]) => {
        const cs = await c.json();
        setChallenges(cs);
        setSelected(cs[0]);
        if (s.ok) setHistory(await s.json());
        if (d.ok) setDoubts(await d.json());
      })
      .catch(() => setError("The workspace could not load."));
  }, []);
  async function run() {
    if (!selected) return;
    setRunning(true);
    setError("");
    try {
      const r = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: selected.id,
          language: selected.language,
          code,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setSubmission(data);
      setHistory((h) => [data, ...h]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed.");
    } finally {
      setRunning(false);
    }
  }
  async function ask() {
    if (!question.trim()) return;
    setAsking(true);
    setError("");
    try {
      const r = await fetch("/api/doubts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Question could not be posted.");
      setQuestion("");
      setNotice(
        "Posted for teacher review. It will appear on the shared board after approval.",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Question could not be posted.",
      );
    } finally {
      setAsking(false);
    }
  }
  return (
    <div className="mx-auto max-w-[1380px] px-6 py-8 lg:px-10">
      <Tabs tab={tab} setTab={setTab} count={doubts.length} />
      {error && (
        <div
          role="alert"
          className="mb-5 border border-[#e3b0a7] bg-[#fff4f1] p-3 text-xs text-[#9c493a]"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="mb-5 border border-[#c5ddca] bg-[#f1f7f1] p-3 text-xs text-[#357e5b]"
        >
          {notice}
        </div>
      )}
      {tab === "workspace" ? (
        <div className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="mono text-[10px] uppercase tracking-[.16em] text-[#78817c]">
                  Challenge library
                </span>
                <h2 className="mt-1 text-lg font-bold">
                  {selected?.title ?? "Loading challenges…"}
                </h2>
              </div>
              <div className="relative">
                <select
                  value={selected?.id ?? ""}
                  onChange={(e) => {
                    const next = challenges.find(
                      (c) => c.id === e.target.value,
                    );
                    if (next) {
                      setSelected(next);
                      setCode(
                        next.language === "python"
                          ? starter
                          : "console.log('hello')",
                      );
                      setSubmission(null);
                    }
                  }}
                  className="appearance-none border border-[#dfe3dc] bg-white py-2 pl-3 pr-8 text-xs font-semibold"
                >
                  {challenges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2 top-2.5"
                  size={14}
                />
              </div>
            </div>
            <p className="mb-4 text-sm leading-6 text-[#66716b]">
              {selected?.description}
            </p>
            <Editor
              code={code}
              setCode={setCode}
              language={selected?.language ?? "python"}
            />
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-[#78817c]">
                {selected?.testCases.length ?? 0} predefined tests · hidden
                cases stay private
              </span>
              <button
                onClick={run}
                disabled={running || asking || !selected}
                className="flex items-center gap-2 bg-[#efad4b] px-5 py-2.5 text-xs font-extrabold text-[#19211f] disabled:opacity-60"
              >
                {running ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Play size={15} fill="currentColor" />
                )}
                {running ? "Running" : "Run solution"}
              </button>
            </div>
          </div>
          <aside className="space-y-4">
            <Result submission={submission} />
            <History history={history} />
          </aside>
        </div>
      ) : (
        <Doubts
          doubts={doubts}
          question={question}
          setQuestion={setQuestion}
          ask={ask}
          loading={asking}
        />
      )}
    </div>
  );
}

function TeacherDashboard() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tests, setTests] = useState<TestCase[]>([
    { input: "", expected: "", visible: true },
  ]);
  const [notice, setNotice] = useState("");
  async function load() {
    const [c, s, d] = await Promise.all([
      fetch("/api/challenges"),
      fetch("/api/submit?role=teacher"),
      fetch("/api/teacher/doubts"),
    ]);
    setChallenges(await c.json());
    setSubmissions(await s.json());
    setDoubts(await d.json());
  }
  useEffect(() => {
    load().catch(() => setNotice("Teacher data could not load."));
  }, []);
  async function create() {
    const r = await fetch("/api/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        language: "python",
        testCases: tests,
      }),
    });
    const data = await r.json();
    if (!r.ok) return setNotice(data.error);
    setChallenges((c) => [...c, data]);
    setTitle("");
    setDescription("");
    setTests([{ input: "", expected: "", visible: true }]);
  }
  async function review(
    d: Doubt,
    status: "APPROVED" | "REJECTED",
    answer: string,
  ) {
    const r = await fetch(`/api/doubts/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, teacherAnswer: answer }),
    });
    if (r.ok) setDoubts((ds) => ds.filter((x) => x.id !== d.id));
  }
  return (
    <div className="mx-auto max-w-[1380px] px-6 py-8 lg:px-10">
      <div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
        <div className="space-y-5">
          <div className="panel p-5">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-8 w-8 items-center justify-center bg-[#e9eee8] text-[#3d966c]">
                <Plus size={16} />
              </span>
              <div>
                <h2 className="text-sm font-bold">Create a challenge</h2>
                <p className="mt-1 text-xs leading-5 text-[#78817c]">
                  Students will run against these expected outputs.
                </p>
              </div>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Challenge title"
              className="mb-3 w-full border border-[#dfe3dc] bg-[#fbfbf8] p-3 text-sm"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task"
              rows={3}
              className="mb-3 w-full border border-[#dfe3dc] bg-[#fbfbf8] p-3 text-sm"
            />
            {tests.map((t, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <input
                  value={t.input}
                  onChange={(e) =>
                    setTests((ts) =>
                      ts.map((x, j) =>
                        j === i ? { ...x, input: e.target.value } : x,
                      ),
                    )
                  }
                  placeholder="Input"
                  className="w-1/2 border border-[#dfe3dc] p-2 text-xs"
                />
                <input
                  value={t.expected}
                  onChange={(e) =>
                    setTests((ts) =>
                      ts.map((x, j) =>
                        j === i ? { ...x, expected: e.target.value } : x,
                      ),
                    )
                  }
                  placeholder="Expected output"
                  className="w-1/2 border border-[#dfe3dc] p-2 text-xs"
                />
              </div>
            ))}
            <button
              onClick={() =>
                setTests((t) => [
                  ...t,
                  { input: "", expected: "", visible: true },
                ])
              }
              className="mr-2 border border-[#dfe3dc] px-3 py-2 text-xs font-bold"
            >
              Add test
            </button>
            <button
              onClick={create}
              className="bg-[#1d2825] px-4 py-2 text-xs font-bold text-white"
            >
              Create
            </button>
            {notice && <p className="mt-3 text-xs text-[#b65a4b]">{notice}</p>}
          </div>
          <div className="panel p-5">
            <h2 className="mb-3 text-sm font-bold">Challenge library</h2>
            {challenges.map((c) => (
              <div key={c.id} className="border-t border-[#edf0eb] py-3">
                <div className="flex justify-between text-sm font-semibold">
                  <span>{c.title}</span>
                  <span className="mono text-[10px] text-[#78817c]">
                    {c.testCases.length} tests
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#78817c]">{c.description}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <div className="panel p-5">
            <h2 className="mb-4 text-sm font-bold">
              Pending doubts{" "}
              <span className="mono ml-1 rounded-full bg-[#f7e8cc] px-1.5 py-0.5 text-[10px] text-[#9a641b]">
                {doubts.length}
              </span>
            </h2>
            {doubts.length ? (
              doubts.map((d) => (
                <ReviewCard key={d.id} doubt={d} review={review} />
              ))
            ) : (
              <p className="text-xs text-[#78817c]">
                The review queue is clear.
              </p>
            )}
          </div>
          <div className="panel p-5">
            <h2 className="mb-4 text-sm font-bold">Student submissions</h2>
            {submissions.length ? (
              submissions.slice(0, 10).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between border-t border-[#edf0eb] py-3 text-xs"
                >
                  <span>{s.challenge?.title ?? "Challenge"}</span>
                  <span
                    className={s.passed ? "text-[#3d966c]" : "text-[#b65a4b]"}
                  >
                    {s.passed ? "Passed" : "Needs work"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#78817c]">No submissions yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Tabs({
  tab,
  setTab,
  count,
}: {
  tab: string;
  setTab: (tab: "workspace" | "doubts") => void;
  count: number;
}) {
  return (
    <div className="mb-7 flex gap-6 border-b border-[#dfe3dc] text-sm font-semibold">
      <button
        className={`flex items-center gap-2 pb-3 ${tab === "workspace" ? "tab-active" : "text-[#78817c]"}`}
        onClick={() => setTab("workspace")}
      >
        <Code2 size={16} /> Code workspace
      </button>
      <button
        className={`flex items-center gap-2 pb-3 ${tab === "doubts" ? "tab-active" : "text-[#78817c]"}`}
        onClick={() => setTab("doubts")}
      >
        <CircleHelp size={16} /> Doubts{" "}
        <span className="mono rounded-full bg-[#e9eee8] px-1.5 py-0.5 text-[10px]">
          {count}
        </span>
      </button>
    </div>
  );
}
function Editor({
  code,
  setCode,
  language,
}: {
  code: string;
  setCode: (value: string) => void;
  language: string;
}) {
  return (
    <div className="editor overflow-hidden rounded-sm">
      <div className="flex items-center justify-between border-b border-[#3c4a45] px-4 py-3">
        <span className="mono text-[11px] text-[#8d9c95]">
          solution.{language === "python" ? "py" : "js"}
        </span>
        <button
          className="text-[#8d9c95]"
          onClick={() => navigator.clipboard?.writeText(code)}
        >
          <Copy size={14} />
        </button>
      </div>
      <div className="flex">
        <div className="mono select-none border-r border-[#3c4a45] px-3 py-5 text-right text-[11px] leading-[1.7] text-[#596a62]">
          {code.split("\n").map((_, i) => (
            <div key={i}>{String(i + 1).padStart(2, "0")}</div>
          ))}
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          rows={12}
          spellCheck={false}
          className="mono w-full bg-transparent px-4 py-5 text-[12px] leading-[1.7]"
        />
      </div>
    </div>
  );
}
function Result({ submission }: { submission: Submission | null }) {
  return (
    <div className="panel p-5">
      <div className="mb-5 flex items-center justify-between text-sm font-bold">
        <span className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-[#3d966c]" /> Latest result
        </span>
        {submission && (
          <span
            className={`mono text-[10px] uppercase ${submission.passed ? "text-[#3d966c]" : "text-[#b65a4b]"}`}
          >
            {submission.passed ? "Passed" : "Needs work"}
          </span>
        )}
      </div>
      {submission ? (
        <>
          <pre className="mb-4 whitespace-pre-wrap bg-[#1d2825] p-3 text-[11px] text-[#d9e4df]">
            {submission.output}
          </pre>
          <div className="border-l-2 border-[#efad4b] bg-[#fffaf0] pl-3 pr-3 py-3 text-xs leading-5 text-[#66716b]">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 font-bold text-[#4b5a51]">
                <Sparkles size={13} className="text-[#d18a22]" /> AI
                code-quality review
              </span>
              <span className="mono text-[9px] uppercase tracking-[.12em] text-[#a47735]">
                After submission
              </span>
            </div>
            <p className="whitespace-pre-line">{submission.aiFeedback}</p>
          </div>
          {submission.tests && (
            <div className="mt-4 space-y-2">
              {submission.tests.map((t, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span>Test {i + 1}</span>
                  <span
                    className={t.passed ? "text-[#3d966c]" : "text-[#b65a4b]"}
                  >
                    {t.passed ? "Pass" : "Fail"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="py-5 text-center text-xs leading-5 text-[#78817c]">
          Run a solution to see test results and feedback.
        </p>
      )}
    </div>
  );
}
function History({ history }: { history: Submission[] }) {
  return (
    <div className="panel p-5">
      <div className="mb-4 flex justify-between text-sm font-bold">
        <span>Recent attempts</span>
        <span className="mono text-[10px] text-[#78817c]">
          {history.length} saved
        </span>
      </div>
      {history.length ? (
        history.slice(0, 5).map((h) => (
          <div
            key={h.id}
            className="flex justify-between border-t border-[#edf0eb] py-3 text-xs"
          >
            <span>{h.challenge?.title ?? "Challenge"}</span>
            <span className={h.passed ? "text-[#3d966c]" : "text-[#b65a4b]"}>
              {h.passed ? "Passed" : "Failed"}
            </span>
          </div>
        ))
      ) : (
        <p className="text-xs text-[#78817c]">No attempts yet.</p>
      )}
    </div>
  );
}
function Doubts({
  doubts,
  question,
  setQuestion,
  ask,
  loading,
}: {
  doubts: Doubt[];
  question: string;
  setQuestion: (v: string) => void;
  ask: () => void;
  loading: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
      <div className="panel p-5">
        <div className="mb-5 flex items-start gap-3">
          <MessageSquareText size={18} className="text-[#bd7920]" />
          <div>
            <h2 className="text-sm font-bold">Ask the room</h2>
            <p className="mt-1 text-xs leading-5 text-[#78817c]">
              AI drafts an answer for a teacher to review.
            </p>
          </div>
        </div>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What are you stuck on?"
          rows={6}
          className="w-full border border-[#dfe3dc] bg-[#fbfbf8] p-3 text-sm"
        />
        <button
          onClick={ask}
          disabled={loading || !question.trim()}
          className="mt-3 flex w-full items-center justify-center gap-2 bg-[#1d2825] py-3 text-xs font-bold text-white disabled:opacity-40"
        >
          <Send size={14} /> Post doubt
        </button>
      </div>
      <div className="space-y-3">
        {doubts.length ? (
          doubts.map((d) => (
            <div key={d.id} className="panel p-5">
              <div className="mb-3 flex justify-between">
                <span className="mono text-[10px] uppercase text-[#78817c]">
                  Approved answer
                </span>
                <span className="mono text-[10px] text-[#a7afaa]">
                  {new Date(d.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm font-semibold leading-6">{d.question}</p>
              <p className="mt-4 border-l-2 border-[#3d966c] bg-[#f1f7f1] p-4 text-xs leading-5 text-[#66716b]">
                {d.teacherAnswer || d.aiDraft}
              </p>
            </div>
          ))
        ) : (
          <div className="panel p-8 text-center text-sm text-[#78817c]">
            Approved answers will appear here.
          </div>
        )}
      </div>
    </div>
  );
}
function ReviewCard({
  doubt,
  review,
}: {
  doubt: Doubt;
  review: (d: Doubt, status: "APPROVED" | "REJECTED", answer: string) => void;
}) {
  const [answer, setAnswer] = useState(doubt.teacherAnswer || doubt.aiDraft);
  return (
    <div className="border-t border-[#edf0eb] py-4">
      <p className="text-sm font-semibold leading-6">{doubt.question}</p>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={3}
        className="mt-3 w-full border border-[#dfe3dc] bg-[#fbfbf8] p-3 text-xs leading-5"
      />
      <div className="mt-2 flex justify-end gap-2">
        <button
          onClick={() => review(doubt, "REJECTED", answer)}
          className="flex items-center gap-1 border border-[#dfe3dc] px-3 py-2 text-xs font-bold"
        >
          <X size={13} /> Reject
        </button>
        <button
          onClick={() => review(doubt, "APPROVED", answer)}
          className="flex items-center gap-1 bg-[#3d966c] px-3 py-2 text-xs font-bold text-white"
        >
          <Check size={13} /> Approve
        </button>
      </div>
    </div>
  );
}
