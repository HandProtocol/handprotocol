"use client";

// The team to-do list at /todo. Sign in by an emailed link (only the people on the list in the
// site's env get one); tasks live behind /api/todo (netlify/functions/todo.mjs). Every change
// saves at once; the list refreshes when the tab comes back so both people see the same thing.

import { useCallback, useEffect, useMemo, useState } from "react";
import s from "./todo.module.css";

type Area = "outreach" | "cleanup" | "social" | "newsletter" | "organization" | "other";
type Status = "todo" | "doing" | "done";
type Person = { name: string; email: string };
type Task = {
  id: string;
  title: string;
  notes: string;
  area: Area;
  status: Status;
  owner: string | null;
  due: string | null;
  sort: number;
  updated_by: string;
  updated_at: string;
};

const AREAS: { id: Area; label: string; hint: string }[] = [
  { id: "outreach", label: "Outreach from the list", hint: "Following up with the people we already know" },
  { id: "cleanup", label: "Social media cleanup", hint: "Accounts, logins, bios, old posts" },
  { id: "social", label: "Social outreach", hint: "Posting, tagging, showing up for neighbours" },
  { id: "newsletter", label: "Newsletter", hint: "The list, the first letter, the rhythm" },
  { id: "organization", label: "Organization", hint: "Inbox, calendar, shared files, check-ins" },
  { id: "other", label: "Everything else", hint: "" },
];
const STATUS_LABEL: Record<Status, string> = { todo: "To do", doing: "In progress", done: "Done" };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/todo/${path}`, {
    credentials: "same-origin",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Something went wrong."), { status: res.status });
  return data as T;
}

export function TodoApp() {
  const [phase, setPhase] = useState<"loading" | "signin" | "ready">("loading");
  const [me, setMe] = useState<Person | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const who = await api<{ me: Person; people: Person[] }>("me");
      const list = await api<{ tasks: Task[] }>("tasks");
      setMe(who.me);
      setPeople(who.people);
      setTasks(list.tasks);
      setPhase("ready");
    } catch (err) {
      if ((err as { status?: number }).status === 401) setPhase("signin");
      else setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    // A link from the sign-in mail lands here with ?t=: trade it for the session, then load.
    const start = async () => {
      const url = new URL(window.location.href);
      const token = url.searchParams.get("t");
      if (token) {
        url.searchParams.delete("t");
        window.history.replaceState(null, "", url.pathname);
        await api("auth/verify", { method: "POST", body: JSON.stringify({ token }) }).catch((err: Error) => setError(err.message));
      }
      await load();
    };
    start();
  }, [load]);

  useEffect(() => {
    if (phase !== "ready") return;
    const refresh = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", refresh);
    const timer = window.setInterval(refresh, 90_000);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(timer);
    };
  }, [phase, load]);

  const save = useCallback(async (id: string, patch: Partial<Task>) => {
    setTasks((all) => all.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    try {
      const { task } = await api<{ task: Task }>(`tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
      setTasks((all) => all.map((t) => (t.id === id ? task : t)));
      setError("");
    } catch (err) {
      setError((err as Error).message);
      load();
    }
  }, [load]);

  const add = useCallback(async (fields: Partial<Task>) => {
    try {
      const { task } = await api<{ task: Task }>("tasks", { method: "POST", body: JSON.stringify(fields) });
      setTasks((all) => [...all, task]);
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    setTasks((all) => all.filter((t) => t.id !== id));
    try {
      await api(`tasks/${id}`, { method: "DELETE" });
    } catch (err) {
      setError((err as Error).message);
      load();
    }
  }, [load]);

  if (phase === "loading") return <main className={s.page}><p className={s.quiet}>Opening the list…</p></main>;
  if (phase === "signin") return <SignIn error={error} />;

  return (
    <Board
      me={me}
      people={people}
      tasks={tasks}
      error={error}
      onSave={save}
      onAdd={add}
      onRemove={remove}
      onSignOut={async () => {
        await api("auth/logout", { method: "POST" }).catch(() => {});
        setPhase("signin");
      }}
    />
  );
}

function SignIn({ error }: { error: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [problem, setProblem] = useState(error);

  return (
    <main className={s.page}>
      <section className={s.signin}>
        <p className={s.eyebrow}>Mystic Hearts · Team list</p>
        <h1 className={s.title}>The to-do list</h1>
        {state === "sent" ? (
          <p className={s.lead}>
            If <strong>{email}</strong> is on the team, a link is on its way. Open it on this device; it lasts twenty minutes.
          </p>
        ) : (
          <form
            className={s.signinForm}
            onSubmit={async (e) => {
              e.preventDefault();
              setState("sending");
              try {
                await api("auth/request", { method: "POST", body: JSON.stringify({ email }) });
                setState("sent");
              } catch (err) {
                setProblem((err as Error).message);
                setState("idle");
              }
            }}
          >
            <p className={s.lead}>Enter your email and we will send you a link to sign in.</p>
            <label className={s.srOnly} htmlFor="todo-email">Email</label>
            <input
              id="todo-email"
              className={s.input}
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className={s.primary} disabled={state === "sending"}>
              {state === "sending" ? "Sending…" : "Email me a link"}
            </button>
          </form>
        )}
        {problem && <p className={s.error} role="alert">{problem}</p>}
      </section>
    </main>
  );
}

type BoardProps = {
  me: Person | null;
  people: Person[];
  tasks: Task[];
  error: string;
  onSave: (id: string, patch: Partial<Task>) => void;
  onAdd: (fields: Partial<Task>) => void;
  onRemove: (id: string) => void;
  onSignOut: () => void;
};

function Board({ me, people, tasks, error, onSave, onAdd, onRemove, onSignOut }: BoardProps) {
  const [who, setWho] = useState<string>("all"); // all | nobody | <email>
  const [showDone, setShowDone] = useState(false);
  const nameOf = useCallback((email: string | null) => people.find((p) => p.email === email)?.name || "", [people]);

  const visible = useMemo(
    () =>
      tasks.filter((t) => {
        if (!showDone && t.status === "done") return false;
        if (who === "all") return true;
        if (who === "nobody") return !t.owner;
        return t.owner === who;
      }),
    [tasks, who, showDone],
  );
  const open = tasks.filter((t) => t.status !== "done").length;
  const done = tasks.length - open;

  return (
    <main className={s.page}>
      <header className={s.head}>
        <div>
          <p className={s.eyebrow}>Mystic Hearts · Team list</p>
          <h1 className={s.title}>What we are doing</h1>
          <p className={s.quiet}>
            {open} open · {done} done
          </p>
        </div>
        <div className={s.me}>
          <span>{me?.name}</span>
          <button className={s.link} onClick={onSignOut}>Sign out</button>
        </div>
      </header>

      <nav className={s.filters} aria-label="Show tasks for">
        {[{ id: "all", label: "Everyone" }, ...people.map((p) => ({ id: p.email, label: p.name })), { id: "nobody", label: "Nobody yet" }].map((f) => (
          <button key={f.id} className={who === f.id ? s.chipOn : s.chip} aria-pressed={who === f.id} onClick={() => setWho(f.id)}>
            {f.label}
          </button>
        ))}
        <label className={s.toggle}>
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> Show done
        </label>
      </nav>

      {error && <p className={s.error} role="alert">{error}</p>}

      {AREAS.map((area) => {
        const list = visible.filter((t) => t.area === area.id).sort((a, b) => a.sort - b.sort);
        if (area.id === "other" && !list.length) return null;
        return (
          <section key={area.id} className={s.area}>
            <div className={s.areaHead}>
              <h2>{area.label}</h2>
              {area.hint && <p>{area.hint}</p>}
            </div>
            <ul className={s.list}>
              {list.map((t) => (
                <TaskRow key={t.id} task={t} people={people} nameOf={nameOf} onSave={onSave} onRemove={onRemove} />
              ))}
            </ul>
            <AddTask onAdd={(title) => onAdd({ title, area: area.id, owner: who !== "all" && who !== "nobody" ? who : null })} />
          </section>
        );
      })}
    </main>
  );
}

function TaskRow({ task, people, nameOf, onSave, onRemove }: RowProps) {
  const [open, setOpen] = useState(false);

  const isDone = task.status === "done";
  const overdue = task.due && !isDone && task.due < new Date().toISOString().slice(0, 10);

  return (
    <li className={isDone ? s.taskDone : s.task}>
      <div className={s.taskLine}>
        <input
          type="checkbox"
          className={s.check}
          checked={isDone}
          aria-label={isDone ? "Mark not done" : "Mark done"}
          onChange={(e) => onSave(task.id, { status: e.target.checked ? "done" : "todo" })}
        />
        <button className={s.taskTitle} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {task.title}
          {task.notes && !open && <span className={s.hasNotes} aria-label="has notes"> ·</span>}
        </button>
        <span className={s.meta}>
          {task.status === "doing" && <span className={s.doing}>In progress</span>}
          {task.due && <span className={overdue ? s.overdue : s.due}>{formatDue(task.due)}</span>}
          {task.owner ? <span className={s.owner}>{nameOf(task.owner)}</span> : null}
        </span>
      </div>

      {open && <TaskEditor key={task.id} task={task} people={people} nameOf={nameOf} onSave={onSave} onRemove={onRemove} />}
    </li>
  );
}

type RowProps = {
  task: Task;
  people: Person[];
  nameOf: (email: string | null) => string;
  onSave: (id: string, patch: Partial<Task>) => void;
  onRemove: (id: string) => void;
};

// Mounted fresh each time a task opens, so it shows the latest copy; while open, what you type wins.
function TaskEditor({ task, people, nameOf, onSave, onRemove }: RowProps) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  return (
    <div className={s.editor}>
      <label className={s.field}>
        <span>Task</span>
        <input
          className={s.input}
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title !== task.title && onSave(task.id, { title: title.trim() })}
        />
      </label>
      <label className={s.field}>
        <span>Notes</span>
        <textarea
          className={s.textarea}
          value={notes}
          rows={4}
          maxLength={4000}
          placeholder="Links, who to ask, what done looks like…"
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== task.notes && onSave(task.id, { notes })}
        />
      </label>
      <div className={s.fieldRow}>
        <label className={s.field}>
          <span>Who</span>
          <select className={s.input} value={task.owner || ""} onChange={(e) => onSave(task.id, { owner: e.target.value || null })}>
            <option value="">Nobody yet</option>
            {people.map((p) => (
              <option key={p.email} value={p.email}>{p.name}</option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          <span>Status</span>
          <select className={s.input} value={task.status} onChange={(e) => onSave(task.id, { status: e.target.value as Status })}>
            {(Object.keys(STATUS_LABEL) as Status[]).map((k) => (
              <option key={k} value={k}>{STATUS_LABEL[k]}</option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          <span>Due</span>
          <input className={s.input} type="date" value={task.due || ""} onChange={(e) => onSave(task.id, { due: e.target.value || null })} />
        </label>
        <label className={s.field}>
          <span>Area</span>
          <select className={s.input} value={task.area} onChange={(e) => onSave(task.id, { area: e.target.value as Area })}>
            {AREAS.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div className={s.editorFoot}>
        <span className={s.quiet}>Last change by {nameOf(task.updated_by) || task.updated_by}, {new Date(task.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        <button
          className={s.danger}
          onClick={() => {
            if (window.confirm(`Delete “${task.title}”?`)) onRemove(task.id);
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function AddTask({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState("");
  return (
    <form
      className={s.add}
      onSubmit={(e) => {
        e.preventDefault();
        const t = title.trim();
        if (!t) return;
        onAdd(t);
        setTitle("");
      }}
    >
      <input className={s.addInput} value={title} maxLength={200} placeholder="Add a task" aria-label="Add a task" onChange={(e) => setTitle(e.target.value)} />
      {title.trim() && <button className={s.addButton}>Add</button>}
    </form>
  );
}

function formatDue(due: string) {
  const [y, m, d] = due.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
