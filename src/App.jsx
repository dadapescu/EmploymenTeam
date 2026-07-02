import { useState, useEffect, useMemo } from "react";
import { db } from "./firebase";
import etImg from "./assets/et.png";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
} from "firebase/firestore";
import { exportToWord } from "./exportWord";

// ── Kinstellar palette ──────────────────────────────────────────
const K = {
  orange: "#cb6015", orangePale: "#fdf0e6",
  burgundy: "#76232f",
  purple: "#722257",
  teal: "#1a6e6e", tealPale: "#e6f3f3",
  gray70: "#53565a", gray50: "#75787b", gray30: "#a7a8aa",
  gray20: "#bbbcbc", gray10: "#d0d0ce", grayBg: "#f5f5f4", white: "#ffffff",
};

const PASSWORD = "KS2026";

// Extra colors for guests beyond the core 3
const GUEST_COLORS = [
  { bg: K.teal, pale: K.tealPale },
  { bg: "#5a6e1a", pale: "#f0f3e6" },
  { bg: "#1a3e6e", pale: "#e6ecf3" },
  { bg: "#6e1a5a", pale: "#f3e6f0" },
];

const BASE_TEAM = ["Andrada", "Claudiu", "Rena"];
const BASE_COLORS = {
  Andrada: { bg: K.purple, pale: "#f5eef3" },
  Claudiu: { bg: K.gray50, pale: "#eceded" },
  Rena: { bg: K.orange, pale: K.orangePale },
};

function getPersonColor(name, extraNames) {
  if (BASE_COLORS[name]) return BASE_COLORS[name];
  const idx = extraNames.indexOf(name) % GUEST_COLORS.length;
  return GUEST_COLORS[idx >= 0 ? idx : 0];
}

// ── Helpers ───────────────────────────────────────────────────────
function fmt(d) { if (!d) return ""; const [y, m, day] = d.split("-"); return `${day}.${m}.${y}`; }
function isOverdue(due) { if (!due) return false; return new Date(due) < new Date(new Date().toDateString()); }
function isoDate(y, m, d) { return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function firstDayOfMonth(y, m) { let d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; }

// ════════════════════════════════════════════════════════════════
export default function App() {
  const [authed, setAuthed] = useState(() => {
    const saved = localStorage.getItem("et_auth_until");
    return saved && Date.now() < parseInt(saved, 10);
  });
  const [me, setMe] = useState(() => localStorage.getItem("et_me") || null);

  if (!authed) return <PasswordGate onAuth={() => { localStorage.setItem("et_auth_until", String(Date.now() + 7 * 24 * 60 * 60 * 1000)); setAuthed(true); }} />;
  if (!me) return <NameGate onPick={(name) => { localStorage.setItem("et_me", name); setMe(name); }} />;
  return <Planner me={me} onSwitch={() => { localStorage.removeItem("et_me"); setMe(null); }} />;
}

// ── Password screen ───────────────────────────────────────────────
function PasswordGate({ onAuth }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);

  function attempt() {
    if (val === PASSWORD) { onAuth(); }
    else { setErr(true); setVal(""); }
  }

  return (
    <div style={{ minHeight: "100vh", background: K.gray70, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: K.white, borderRadius: 16, padding: "40px 36px", maxWidth: 360, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.3)", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 28 }}>
          <div style={{ width: 5, height: 28, background: K.orange, borderRadius: 3 }} />
          <div style={{ fontSize: 20, fontWeight: 700, color: K.gray70 }}>ET PLANNER</div>
        </div>
        <input
          type="password" value={val} placeholder="Parola"
          onChange={(e) => { setVal(e.target.value); setErr(false); }}
          onKeyDown={(e) => e.key === "Enter" && attempt()}
          style={{ width: "100%", padding: "12px 14px", borderRadius: 9, border: `1.5px solid ${err ? "#e53e3e" : K.gray10}`, fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 10, textAlign: "center", letterSpacing: 3, fontFamily: "inherit" }}
        />
        {err && <div style={{ color: "#e53e3e", fontSize: 12, marginBottom: 10 }}>Parola incorecta</div>}
        <button onClick={attempt}
          style={{ width: "100%", padding: "12px 0", borderRadius: 9, background: K.orange, color: K.white, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          Intra
        </button>
      </div>
    </div>
  );
}

// ── Name entry screen ─────────────────────────────────────────────
function NameGate({ onPick }) {
  const [custom, setCustom] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: K.gray70, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: K.white, borderRadius: 16, padding: "40px 36px", maxWidth: 380, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.3)", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 5, height: 28, background: K.orange, borderRadius: 3 }} />
          <div style={{ fontSize: 20, fontWeight: 700, color: K.gray70 }}>ET PLANNER</div>
        </div>
        <div style={{ fontSize: 13, color: K.gray30, marginBottom: 28 }}>Cine esti?</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {BASE_TEAM.map((name) => (
            <button key={name} onClick={() => onPick(name)}
              style={{ padding: "13px 0", borderRadius: 10, border: `2px solid ${BASE_COLORS[name].bg}`, background: BASE_COLORS[name].pale, color: BASE_COLORS[name].bg, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              {name}
            </button>
          ))}
          {!showCustom && (
            <button onClick={() => setShowCustom(true)}
              style={{ padding: "13px 0", borderRadius: 10, border: `2px dashed ${K.gray20}`, background: K.white, color: K.gray30, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Altcineva
            </button>
          )}
          {showCustom && (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={custom} onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && custom.trim() && onPick(custom.trim())}
                placeholder="Numele tau" autoFocus
                style={{ flex: 1, padding: "11px 12px", borderRadius: 9, border: `1.5px solid ${K.gray10}`, fontSize: 14, outline: "none", fontFamily: "inherit" }}
              />
              <button onClick={() => custom.trim() && onPick(custom.trim())}
                style={{ padding: "11px 16px", borderRadius: 9, background: K.orange, color: K.white, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                OK
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main planner ──────────────────────────────────────────────────
function Planner({ me, onSwitch }) {
  const [tab, setTab] = useState("todo");
  const [tasks, setTasks] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [expandedDone, setExpandedDone] = useState({});

  // All known people = base team + anyone who has tasks/leaves as a guest
  const allPeople = useMemo(() => {
    const fromTasks = tasks.flatMap((t) => [t.column, ...(t.assignees || [])]);
    const fromLeaves = leaves.map((l) => l.person);
    const all = new Set([...BASE_TEAM, ...fromTasks, ...fromLeaves]);
    all.delete("BD");
    return [...all];
  }, [tasks, leaves]);

  const extraNames = useMemo(() => allPeople.filter((n) => !BASE_COLORS[n]), [allPeople]);

  // Known clients: from explicit client fields + legacy "CLIENT - task" title prefixes (excluding BD)
  const knownClients = useMemo(() => {
    const set = new Set();
    for (const t of tasks) {
      if (t.client) set.add(t.client.trim());
      else if (t.column !== "BD" && t.title?.includes(" - ")) {
        const prefix = t.title.slice(0, t.title.indexOf(" - ")).trim();
        if (prefix && prefix.length <= 30) set.add(prefix);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  // Columns: me first, then others, then BD
  const COLUMNS = useMemo(() => {
    const others = allPeople.filter((n) => n !== me);
    return [me, ...others, "BD"];
  }, [me, allPeople]);

  // ── Firebase live sync ──
  useEffect(() => {
    const u1 = onSnapshot(collection(db, "tasks"), (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const u2 = onSnapshot(collection(db, "leaves"), (snap) => {
      setLeaves(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { u1(); u2(); };
  }, []);

  const emptyTask = { title: "", client: "", assignees: [], due: "", important: false, column: me, done: false, private: false, createdBy: me };
  const emptyLeave = { person: me, start: "", end: "", label: "" };
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [leaveForm, setLeaveForm] = useState(emptyLeave);

  // ── Task ops ──
  function openAddTask(col) { setTaskForm({ ...emptyTask, column: col }); setEditId(null); setModal("task"); }
  function openEditTask(t) {
    // Legacy tasks: split "CLIENT - task" into separate fields (not for BD)
    let client = t.client || "";
    let title = t.title || "";
    if (!client && t.column !== "BD" && title.includes(" - ")) {
      const idx = title.indexOf(" - ");
      client = title.slice(0, idx).trim();
      title = title.slice(idx + 3).trim();
    }
    setTaskForm({
      title,
      client,
      assignees: t.assignees || [],
      due: t.due || "",
      important: !!t.important,
      done: !!t.done,
      column: t.column || me,
      private: !!t.private,
      createdBy: t.createdBy || me,
      ...(t.createdAt ? { createdAt: t.createdAt } : {}),
    });
    setEditId(t.id);
    setModal("task");
  }
  async function saveTask() {
    if (!taskForm.title.trim()) return;
    const { id, ...data } = taskForm;
    const clean = {};
    for (const [k, v] of Object.entries(data)) clean[k] = v === undefined ? null : v;
    try {
      if (editId) await updateDoc(doc(db, "tasks", editId), clean);
      else await addDoc(collection(db, "tasks"), { ...clean, createdAt: Date.now() });
      setModal(null);
    } catch (err) {
      alert("Eroare la salvare: " + (err?.message || err));
    }
  }
  async function deleteTask(id) { await deleteDoc(doc(db, "tasks", id)); }
  async function toggleImportant(id) { const t = tasks.find((x) => x.id === id); await updateDoc(doc(db, "tasks", id), { important: !t.important }); }
  async function toggleDone(id) { const t = tasks.find((x) => x.id === id); await updateDoc(doc(db, "tasks", id), { done: !t.done }); }
  function toggleAssignee(name) {
    setTaskForm((f) => ({ ...f, assignees: f.assignees.includes(name) ? f.assignees.filter((a) => a !== name) : [...f.assignees, name] }));
  }
  function toggleExpandDone(col) { setExpandedDone((e) => ({ ...e, [col]: !e[col] })); }

  // ── Leave ops ──
  function openAddLeave() { setLeaveForm({ ...emptyLeave, person: me }); setEditId(null); setModal("leave"); }
  async function saveLeave() {
    if (!leaveForm.start || !leaveForm.end) return;
    const { id, ...data } = leaveForm;
    if (editId) await updateDoc(doc(db, "leaves", editId), data);
    else await addDoc(collection(db, "leaves"), data);
    setModal(null);
  }
  async function deleteLeave(id) { await deleteDoc(doc(db, "leaves", id)); }

  function isVisibleToMe(t) {
    if (!t.private) return true;
    return t.createdBy === me || t.assignees?.includes(me);
  }

  function sortTasks(list) {
    return [...list].sort((a, b) => {
      // 1. Overdue tasks first
      const aOverdue = !a.done && isOverdue(a.due) ? 1 : 0;
      const bOverdue = !b.done && isOverdue(b.due) ? 1 : 0;
      if (aOverdue !== bOverdue) return bOverdue - aOverdue;

      // 2. Important (star) next
      const aImp = a.important ? 1 : 0;
      const bImp = b.important ? 1 : 0;
      if (aImp !== bImp) return bImp - aImp;

      // 3. Tasks with a deadline come before those without
      const aHas = a.due ? 1 : 0;
      const bHas = b.due ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;

      // 4a. Both have deadlines -> soonest first
      if (a.due && b.due) return a.due.localeCompare(b.due);

      // 4b. Neither has a deadline -> keep insertion order (oldest first)
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
  }

  function tasksForColumn(col) {
    const visible = tasks.filter(isVisibleToMe);
    if (col === "BD") return sortTasks(visible.filter((t) => t.column === "BD"));
    return sortTasks(visible.filter((t) => t.column === col || (t.assignees?.includes(col) && t.column !== col && t.column !== "BD")));
  }

  const myColor = getPersonColor(me, extraNames);

  if (loading) {
    return <div style={{ minHeight: "100vh", background: K.grayBg, display: "flex", alignItems: "center", justifyContent: "center", color: K.gray30, fontSize: 14 }}>Se incarca…</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: K.grayBg, color: K.gray70 }}>
      {/* Header */}
      <div style={{ background: K.gray70, position: "relative" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 7, height: 44, background: K.orange, borderRadius: 3 }} />
              <div>
                <div style={{ fontSize: 27, fontWeight: 700, color: K.white, letterSpacing: -0.3 }}>ET PLANNER</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {tab === "todo" && (
                <button onClick={() => exportToWord(tasks.filter(isVisibleToMe), extraNames)}
                  style={{ background: "none", color: K.white, border: `1px solid ${K.gray50}`, borderRadius: 7, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  ↓ Word
                </button>
              )}
              {tab === "leaves" && (
                <button onClick={openAddLeave}
                  style={{ background: K.orange, color: K.white, border: "none", borderRadius: 7, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  + Concediu
                </button>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 4 }}>
                <span style={{ background: myColor.bg, color: "#fff", borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 700 }}>{me}</span>
                <button onClick={onSwitch}
                  style={{ background: "none", border: `1px solid ${K.gray50}`, color: K.gray30, borderRadius: 6, padding: "5px 8px", fontSize: 11, cursor: "pointer" }}>
                  schimba
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* spacer to give the gray header body some height */}
        <div style={{ height: 70 }} />

        {/* Tabs row at the very bottom edge of the gray */}
        <div style={{ position: "relative" }}>
          <div style={{ maxWidth: 1300, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "center" }}>
            <div style={{ display: "flex" }}>
              {[{ k: "todo", label: "TO DO" }, { k: "leaves", label: "CONCEDII" }].map(({ k, label }) => (
                <button key={k} onClick={() => setTab(k)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "12px 30px", fontSize: 15, fontWeight: tab === k ? 700 : 400, color: tab === k ? K.white : K.gray30, borderBottom: tab === k ? `3px solid ${K.orange}` : "3px solid transparent", letterSpacing: 0.5 }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ET anchored to the header's true bottom edge (the gray/white boundary), aligned under the title */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, pointerEvents: "none" }}>
          <div style={{ maxWidth: 1300, margin: "0 auto", padding: "0 24px", position: "relative" }}>
            <img src={etImg} alt="ET"
              style={{
                position: "absolute",
                left: 8,
                bottom: -58,
                height: 160,
                width: "auto",
                userSelect: "none",
              }}
            />
          </div>
        </div>
      </div>

      {/* TO DO */}
      {tab === "todo" && (
        <div style={{ maxWidth: 1300, margin: "0 auto", padding: "24px 24px 40px", overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(220px, 1fr))`, gap: 16, alignItems: "start" }}>
            {COLUMNS.map((col) => {
              const all = tasksForColumn(col);
              const active = all.filter((t) => !t.done);
              const done = all.filter((t) => t.done);
              const isBD = col === "BD";
              const isMe = col === me;
              const pc = isBD ? { bg: "#1a1a1a", pale: "#e8e8e8" } : getPersonColor(col, extraNames);
              const color = pc.bg;
              return (
                <div key={col}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: K.gray70 }}>{col === "BD" ? "BD / NB" : col}{isMe ? " (tu)" : ""}</span>
                      {active.length > 0 && <span style={{ background: color, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{active.length}</span>}
                    </div>
                    <button onClick={() => openAddTask(col)}
                      style={{ background: "none", border: `1.5px dashed ${K.gray20}`, borderRadius: 6, width: 24, height: 24, cursor: "pointer", color: K.gray30, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {active.length === 0 && (
                      <div style={{ background: K.white, border: `1.5px dashed ${K.gray10}`, borderRadius: 10, padding: "20px 14px", textAlign: "center", color: K.gray30, fontSize: 12 }}>Niciun task</div>
                    )}
                    {active.map((t) => (
                      <TaskCard key={t.id + col} task={t} col={col} isBD={isBD} color={color} extraNames={extraNames}
                        onOpen={openEditTask} onToggleImportant={toggleImportant} onToggleDone={toggleDone} onDelete={deleteTask} />
                    ))}
                  </div>

                  {done.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <button onClick={() => toggleExpandDone(col)}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: "6px 2px", color: K.gray50, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
                        <span style={{ transform: expandedDone[col] ? "rotate(90deg)" : "none", display: "inline-block", fontSize: 9 }}>▶</span>
                        Dobby is free <span style={{ background: K.gray10, color: K.gray50, borderRadius: 9, padding: "1px 7px", fontSize: 10 }}>{done.length}</span>
                      </button>
                      {expandedDone[col] && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                          {done.map((t) => (
                            <TaskCard key={t.id + col + "d"} task={t} col={col} isBD={isBD} color={color} extraNames={extraNames}
                              onOpen={openEditTask} onToggleImportant={toggleImportant} onToggleDone={toggleDone} onDelete={deleteTask} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "leaves" && <LeaveTab leaves={leaves} allPeople={allPeople} extraNames={extraNames} onDelete={deleteLeave} onEdit={(l) => { setLeaveForm({ ...l }); setEditId(l.id); setModal("leave"); }} />}

      {/* Modals */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(83,86,90,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: K.white, borderRadius: 14, padding: 28, width: "100%", maxWidth: 460, boxShadow: "0 24px 60px rgba(0,0,0,0.18)" }}>
            {modal === "task" && (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, color: K.gray70, marginBottom: 20, borderBottom: `3px solid ${K.orange}`, paddingBottom: 10 }}>{editId ? "Editeaza task" : "Task nou"}</div>
                <div style={{ display: "flex", gap: 10 }}>
                  {taskForm.column !== "BD" && (
                    <div style={{ flex: 1, marginBottom: 14 }}>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: K.gray30, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Client</label>
                      <ClientInput value={taskForm.client} onChange={(v) => setTaskForm((f) => ({ ...f, client: v }))} suggestions={knownClients} />
                    </div>
                  )}
                  <div style={{ flex: 2, marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: K.gray30, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Task</label>
                    <input value={taskForm.title} onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))} style={iStyle} />
                  </div>
                </div>
                <Field label="Impreuna cu">
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {allPeople.map((name) => {
                      const pc = getPersonColor(name, extraNames);
                      const active = taskForm.assignees.includes(name);
                      return (
                        <button key={name} onClick={() => toggleAssignee(name)}
                          style={{ padding: "7px 12px", borderRadius: 8, border: `1.5px solid ${active ? pc.bg : K.gray10}`, background: active ? pc.pale : K.white, color: active ? pc.bg : K.gray50, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{name}</button>
                      );
                    })}
                  </div>
                </Field>
                <Field label="Deadline">
                  <DatePicker value={taskForm.due} onChange={(v) => setTaskForm((f) => ({ ...f, due: v }))} />
                </Field>
                <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                  <button onClick={() => setTaskForm((f) => ({ ...f, important: !f.important }))}
                    style={{ background: "none", border: `1.5px solid ${taskForm.important ? K.orange : K.gray10}`, borderRadius: 7, padding: "7px 14px", cursor: "pointer", color: taskForm.important ? K.orange : K.gray30, fontSize: 13, fontWeight: 600 }}>
                    ★ Important
                  </button>
                  <button onClick={() => setTaskForm((f) => ({ ...f, done: !f.done }))}
                    style={{ background: taskForm.done ? K.gray70 : "none", border: `1.5px solid ${taskForm.done ? K.gray70 : K.gray10}`, borderRadius: 7, padding: "7px 14px", cursor: "pointer", color: taskForm.done ? "#fff" : K.gray30, fontSize: 13, fontWeight: 600 }}>
                    ✓ Done
                  </button>
                  <button onClick={() => setTaskForm((f) => ({ ...f, private: !f.private }))}
                    style={{ background: taskForm.private ? K.gray70 : "none", border: `1.5px solid ${taskForm.private ? K.gray70 : K.gray10}`, borderRadius: 7, padding: "7px 14px", cursor: "pointer", color: taskForm.private ? "#fff" : K.gray30, fontSize: 13, fontWeight: 600 }}>
                    🔒 Privat
                  </button>
                </div>
                {taskForm.private && (
                  <div style={{ fontSize: 11, color: K.gray30, marginTop: -12, marginBottom: 18 }}>
                    Vizibil doar pentru tine si persoanele asignate.
                  </div>
                )}
                <ModalActions onCancel={() => setModal(null)} onSave={saveTask} disabled={!taskForm.title.trim()} label={editId ? "Salveaza" : "Adauga"} />
              </>
            )}
            {modal === "leave" && (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, color: K.gray70, marginBottom: 20, borderBottom: `3px solid ${K.orange}`, paddingBottom: 10 }}>{editId ? "Editeaza concediu" : "Concediu nou"}</div>
                <Field label="Persoana">
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {allPeople.map((name) => {
                      const pc = getPersonColor(name, extraNames);
                      return (
                        <button key={name} onClick={() => setLeaveForm((f) => ({ ...f, person: name }))}
                          style={{ padding: "7px 12px", borderRadius: 8, border: `1.5px solid ${leaveForm.person === name ? pc.bg : K.gray10}`, background: leaveForm.person === name ? pc.pale : K.white, color: leaveForm.person === name ? pc.bg : K.gray50, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{name}</button>
                      );
                    })}
                  </div>
                </Field>
                <Field label="De la"><DatePicker value={leaveForm.start} onChange={(v) => setLeaveForm((f) => ({ ...f, start: v }))} /></Field>
                <Field label="Pana la"><DatePicker value={leaveForm.end} onChange={(v) => setLeaveForm((f) => ({ ...f, end: v }))} /></Field>
                <Field label="Nota"><input value={leaveForm.label} onChange={(e) => setLeaveForm((f) => ({ ...f, label: e.target.value }))} style={iStyle} /></Field>
                <ModalActions onCancel={() => setModal(null)} onSave={saveLeave} disabled={!leaveForm.start || !leaveForm.end} label={editId ? "Salveaza" : "Adauga"} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Task card ─────────────────────────────────────────────────────
function TaskCard({ task, col, isBD, color, extraNames, onOpen, onToggleImportant, onToggleDone, onDelete }) {
  const overdue = !task.done && isOverdue(task.due);
  const done = task.done;

  // Everyone involved in this task (owner column + assignees), excluding the current column's person
  const involved = useMemo(() => {
    const set = new Set([...(isBD ? [] : [task.column]), ...(task.assignees || [])]);
    set.delete(col);
    set.delete("BD");
    return [...set];
  }, [task.column, task.assignees, col, isBD]);

  return (
    <div onClick={() => onOpen(task)} style={{ background: done ? K.grayBg : K.white, border: `1.5px solid ${overdue ? "#e53e3e" : K.gray10}`, borderLeft: `4px solid ${overdue ? "#e53e3e" : done ? K.gray20 : color}`, borderRadius: 10, padding: "12px 12px 10px", cursor: "pointer", position: "relative", opacity: done ? 0.75 : 1 }}>
      <button onClick={(e) => { e.stopPropagation(); onToggleImportant(task.id); }}
        style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", fontSize: 14, color: task.important ? K.orange : K.gray20, padding: 0 }}>★</button>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <button onClick={(e) => { e.stopPropagation(); onToggleDone(task.id); }}
          style={{ flexShrink: 0, marginTop: 1, width: 18, height: 18, borderRadius: 5, border: `2px solid ${done ? color : K.gray20}`, background: done ? color : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, padding: 0 }}>
          {done ? "✓" : ""}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: overdue ? "#e53e3e" : K.gray70, lineHeight: 1.4, paddingRight: 18, marginBottom: 8, textDecoration: done ? "line-through" : "none" }}>
            {task.private && <span title="Privat" style={{ marginRight: 4 }}>🔒</span>}
            {task.client ? `${task.client} - ${task.title}` : task.title}
          </div>
          {involved.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
              {involved.map((a) => {
                const pc = getPersonColor(a, extraNames);
                return <span key={a} style={{ background: pc.pale, color: pc.bg, borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>{a}</span>;
              })}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: overdue ? "#e53e3e" : K.gray30, fontWeight: overdue ? 700 : 400 }}>{task.due ? (overdue ? "⚠ " : "") + fmt(task.due) : "Fara deadline"}</span>
            <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: K.gray20, fontSize: 15, padding: 0 }}>×</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Leave calendar ────────────────────────────────────────────────
function LeaveTab({ leaves, allPeople, extraNames, onDelete, onEdit }) {
  const [showPast, setShowPast] = useState(false);

  const now = new Date();
  const curY = now.getFullYear(), curM = now.getMonth();

  // Rolling window: current month + next 17 months (18 total)
  const months = [];
  for (let i = 0; i < 18; i++) {
    const d = new Date(curY, curM + i, 1);
    months.push({ y: d.getFullYear(), m: d.getMonth() });
  }

  // Past months: everything before current month, going back as far as leaves exist (or at least a year)
  const pastMonths = [];
  const earliestLeave = leaves.reduce((min, l) => (l.start < min ? l.start : min), `${curY}-01-01`);
  const earliestYear = parseInt(earliestLeave.slice(0, 4), 10);
  let py = Math.min(earliestYear, curY - 1), pm = 0;
  while (py < curY || (py === curY && pm < curM)) {
    pastMonths.push({ y: py, m: pm });
    pm++; if (pm > 11) { pm = 0; py++; }
  }

  const DAYS = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sa", "Du"];
  const leavesOnDay = (iso) => leaves.filter((l) => l.start <= iso && iso <= l.end);

  const todayIso = now.toISOString().slice(0, 10);
  const currentAndFutureLeaves = leaves.filter((l) => l.end >= todayIso);
  const pastLeaves = leaves.filter((l) => l.end < todayIso);

  function renderMonthGrid(y, m) {
    const monthName = new Date(y, m, 1).toLocaleString("ro-RO", { month: "long", year: "numeric" });
    const days = daysInMonth(y, m); const fd = firstDayOfMonth(y, m);
    const cells = []; for (let i = 0; i < fd; i++) cells.push(null); for (let d = 1; d <= days; d++) cells.push(d);
    return (
      <div key={`${y}-${m}`} style={{ background: K.white, borderRadius: 12, padding: "16px 14px", border: `1px solid ${K.gray10}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: K.gray70, marginBottom: 12, textTransform: "capitalize" }}>{monthName}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {DAYS.map((d) => <div key={d} style={{ textAlign: "center", fontSize: 9, fontWeight: 700, color: K.gray30, paddingBottom: 4 }}>{d}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} />;
            const iso = isoDate(y, m, d); const dl = leavesOnDay(iso);
            const weekend = (i % 7 === 5 || i % 7 === 6);
            const bgs = dl.map((l) => getPersonColor(l.person, extraNames).bg).filter(Boolean);
            const today = todayIso === iso;
            let bg = "transparent", tc = weekend ? K.gray30 : K.gray70;
            if (bgs.length === 1) { bg = bgs[0]; tc = "#fff"; }
            else if (bgs.length === 2) { bg = `linear-gradient(135deg, ${bgs[0]} 50%, ${bgs[1]} 50%)`; tc = "#fff"; }
            else if (bgs.length >= 3) { bg = `linear-gradient(135deg, ${bgs[0]} 33%, ${bgs[1]} 33% 66%, ${bgs[2]} 66%)`; tc = "#fff"; }
            return <div key={d} title={dl.map((l) => l.person).join(", ")} style={{ textAlign: "center", fontSize: 11, fontWeight: today ? 700 : 400, color: tc, background: bg, borderRadius: 5, padding: "4px 2px", border: today ? `2px solid ${K.orange}` : "2px solid transparent" }}>{d}</div>;
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", padding: "24px 24px 40px" }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        {allPeople.map((name) => {
          const pc = getPersonColor(name, extraNames);
          return (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: pc.bg }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: K.gray70 }}>{name}</span>
            </div>
          );
        })}
        <div style={{ marginLeft: "auto", fontSize: 12, color: K.gray30 }}>{currentAndFutureLeaves.length} {currentAndFutureLeaves.length === 1 ? "concediu" : "concedii"}</div>
      </div>

      {currentAndFutureLeaves.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
          {[...currentAndFutureLeaves].sort((a, b) => a.start.localeCompare(b.start)).map((l) => {
            const pc = getPersonColor(l.person, extraNames);
            return (
              <div key={l.id} onClick={() => onEdit(l)} style={{ background: pc.pale, border: `1.5px solid ${pc.bg}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: pc.bg }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: pc.bg }}>{l.person}</span>
                <span style={{ fontSize: 12, color: K.gray50 }}>{fmt(l.start)} – {fmt(l.end)}</span>
                {l.label && <span style={{ fontSize: 11, color: K.gray30 }}>· {l.label}</span>}
                <button onClick={(e) => { e.stopPropagation(); onDelete(l.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: K.gray20, fontSize: 15, padding: 0, marginLeft: 4 }}>×</button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
        {months.map(({ y, m }) => renderMonthGrid(y, m))}
      </div>

      {pastMonths.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <button onClick={() => setShowPast((s) => !s)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: "6px 2px", color: K.gray50, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
            <span style={{ transform: showPast ? "rotate(90deg)" : "none", display: "inline-block", fontSize: 10 }}>▶</span>
            Luni trecute <span style={{ background: K.gray10, color: K.gray50, borderRadius: 9, padding: "1px 7px", fontSize: 10 }}>{pastMonths.length}</span>
          </button>
          {showPast && (
            <>
              {pastLeaves.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "14px 0" }}>
                  {[...pastLeaves].sort((a, b) => a.start.localeCompare(b.start)).map((l) => {
                    const pc = getPersonColor(l.person, extraNames);
                    return (
                      <div key={l.id} onClick={() => onEdit(l)} style={{ background: pc.pale, border: `1.5px solid ${pc.bg}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, opacity: 0.7 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: pc.bg }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: pc.bg }}>{l.person}</span>
                        <span style={{ fontSize: 12, color: K.gray50 }}>{fmt(l.start)} – {fmt(l.end)}</span>
                        {l.label && <span style={{ fontSize: 11, color: K.gray30 }}>· {l.label}</span>}
                        <button onClick={(e) => { e.stopPropagation(); onDelete(l.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: K.gray20, fontSize: 15, padding: 0, marginLeft: 4 }}>×</button>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20, marginTop: 14 }}>
                {pastMonths.map(({ y, m }) => renderMonthGrid(y, m))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────
function ClientInput({ value, onChange, suggestions }) {
  const [open, setOpen] = useState(false);
  const matches = value
    ? suggestions.filter((c) => c.toLowerCase().startsWith(value.toLowerCase()) && c.toLowerCase() !== value.toLowerCase())
    : [];

  return (
    <div style={{ position: "relative" }}>
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={iStyle}
      />
      {open && matches.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: `1.5px solid ${K.gray10}`, borderRadius: 8, marginTop: 4, zIndex: 300, maxHeight: 180, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
          {matches.map((c) => (
            <div key={c}
              onMouseDown={() => { onChange(c); setOpen(false); }}
              style={{ padding: "9px 12px", fontSize: 14, color: K.gray70, cursor: "pointer", borderBottom: `1px solid ${K.grayBg}` }}
              onMouseEnter={(e) => e.currentTarget.style.background = K.grayBg}
              onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}>
              {c}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DatePicker({ value, onChange }) {
  const now = new Date().getFullYear();
  const [parts, setParts] = useState(() => {
    if (value && value.includes("-")) {
      const [yy, mm, dd] = value.split("-");
      return { d: String(parseInt(dd)), m: String(parseInt(mm)), y: yy };
    }
    return { d: "", m: "", y: String(now) };
  });

  const months = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
  const years = [];
  for (let yr = now; yr <= now + 3; yr++) years.push(yr);
  const daysInM = (yy, mm) => (mm ? new Date(parseInt(yy) || now, parseInt(mm), 0).getDate() : 31);
  const dayCount = daysInM(parts.y, parts.m);

  function update(next) {
    setParts(next);
    if (next.d && next.m && next.y) {
      onChange(`${next.y}-${String(next.m).padStart(2, "0")}-${String(next.d).padStart(2, "0")}`);
    } else {
      onChange("");
    }
  }

  const sel = { padding: "9px 8px", borderRadius: 8, border: `1.5px solid ${K.gray10}`, fontSize: 14, color: K.gray70, outline: "none", fontFamily: "inherit", background: "#fff", cursor: "pointer" };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <select value={parts.d} onChange={(e) => update({ ...parts, d: e.target.value })} style={{ ...sel, flex: 1 }}>
        <option value="">Zi</option>
        {Array.from({ length: dayCount }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <select value={parts.m} onChange={(e) => update({ ...parts, m: e.target.value })} style={{ ...sel, flex: 2 }}>
        <option value="">Luna</option>
        {months.map((mn, i) => <option key={mn} value={i + 1}>{mn}</option>)}
      </select>
      <select value={parts.y} onChange={(e) => update({ ...parts, y: e.target.value })} style={{ ...sel, flex: 1.2 }}>
        <option value="">An</option>
        {years.map((yr) => <option key={yr} value={yr}>{yr}</option>)}
      </select>
      {(parts.d || parts.m) && (
        <button onClick={() => update({ d: "", m: "", y: String(now) })} title="Sterge data"
          style={{ border: `1.5px solid ${K.gray10}`, background: "#fff", borderRadius: 8, padding: "0 10px", height: 38, cursor: "pointer", color: K.gray30, fontSize: 16 }}>×</button>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: K.gray30, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}
function ModalActions({ onCancel, onSave, disabled, label }) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
      <button onClick={onCancel} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1.5px solid ${K.gray10}`, background: K.white, color: K.gray50, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Anuleaza</button>
      <button onClick={onSave} disabled={disabled} style={{ flex: 2, padding: "10px 0", borderRadius: 8, border: "none", background: disabled ? K.gray20 : K.orange, color: K.white, fontSize: 14, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer" }}>{label}</button>
    </div>
  );
}
const iStyle = { width: "100%", padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${K.gray10}`, fontSize: 14, color: K.gray70, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
