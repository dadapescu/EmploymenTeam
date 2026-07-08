import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, WidthType, AlignmentType, BorderStyle, ShadingType,
} from "docx";
import { saveAs } from "file-saver";

const ORANGE = "CB6015";
const GRAY70 = "53565A";
const GRAY10 = "D0D0CE";
const WHITE = "FFFFFF";
const RED = "E53E3E";

const PERSON_HEX = { Andrada: "CB6015", Claudiu: "76232F", Rena: "722257" };
const TEAM = ["Andrada", "Claudiu", "Rena"];

function fmtDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}
function isOverdue(due, done) {
  if (!due || done) return false;
  return new Date(due) < new Date(new Date().toDateString());
}

// Task is fully done when master `done` is set, or when every involved person
// (owner column + all assignees, excluding BD) has closed it individually via doneFor.
function isFullyDone(t) {
  if (t.done) return true;
  if (t.column === "BD") return false;
  const involved = new Set([t.column, ...(t.assignees || [])]);
  const doneFor = new Set(t.doneFor || []);
  for (const p of involved) if (!doneFor.has(p)) return false;
  return involved.size > 0;
}

function headerCell(text) {
  return new TableCell({
    shading: { type: ShadingType.CLEAR, fill: ORANGE, color: "auto" },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: WHITE, size: 20 })] })],
  });
}

function bodyCell(runs, opts = {}) {
  return new TableCell({
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill, color: "auto" } : undefined,
    children: [new Paragraph({ children: runs })],
  });
}

// Tasks where person is owner or assignee — excludes BD (shown separately) and finished tasks
function tasksForPerson(tasks, person) {
  return tasks
    .filter((t) => t.column !== "BD" && (t.column === person || t.assignees?.includes(person)))
    .filter((t) => !isFullyDone(t))
    .sort((a, b) => {
      const aImp = a.important ? 1 : 0, bImp = b.important ? 1 : 0;
      if (aImp !== bImp) return bImp - aImp;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
    });
}

// BD (business development) tasks, shared — excludes finished tasks
function tasksForBD(tasks) {
  return tasks
    .filter((t) => t.column === "BD" && !isFullyDone(t))
    .sort((a, b) => {
      const aImp = a.important ? 1 : 0, bImp = b.important ? 1 : 0;
      if (aImp !== bImp) return bImp - aImp;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
    });
}

function buildTaskTable(pTasks, excludeFromCollab) {
  const rows = [
    new TableRow({
      tableHeader: true,
      children: [headerCell("Task"), headerCell("Termen"), headerCell("Status"), headerCell("Colaborare")],
    }),
  ];

  for (const t of pTasks) {
    const done = isFullyDone(t);
    const overdue = isOverdue(t.due, done);
    const fullTitle = t.client ? `${t.client} - ${t.title || ""}` : (t.title || "");
    const titleRuns = [new TextRun({ text: fullTitle, size: 20, color: GRAY70, strike: done })];
    if (t.important) titleRuns.unshift(new TextRun({ text: "★ ", color: ORANGE, size: 20 }));

    const dueRuns = [new TextRun({ text: fmtDate(t.due), size: 20, color: overdue ? RED : GRAY70, bold: overdue })];

    const status = done ? "Done" : overdue ? "Intarziat" : "In lucru";
    const statusColor = done ? "15803D" : overdue ? RED : GRAY70;
    const statusRuns = [new TextRun({ text: status, size: 20, color: statusColor, bold: overdue || done })];

    const collab = excludeFromCollab
      ? (t.assignees || []).filter((a) => a !== excludeFromCollab)
      : [t.column, ...(t.assignees || [])].filter((a, i, arr) => arr.indexOf(a) === i);
    const collabRuns = [new TextRun({ text: collab.length ? collab.join(", ") : "—", size: 20, color: GRAY70 })];

    rows.push(
      new TableRow({
        children: [
          bodyCell(titleRuns, { fill: done ? "F5F5F4" : undefined }),
          bodyCell(dueRuns, { fill: done ? "F5F5F4" : undefined }),
          bodyCell(statusRuns, { fill: done ? "F5F5F4" : undefined }),
          bodyCell(collabRuns, { fill: done ? "F5F5F4" : undefined }),
        ],
      }),
    );
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [4500, 1700, 1700, 2100],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: GRAY10 },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: GRAY10 },
      left: { style: BorderStyle.SINGLE, size: 4, color: GRAY10 },
      right: { style: BorderStyle.SINGLE, size: 4, color: GRAY10 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: GRAY10 },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: GRAY10 },
    },
    rows,
  });
}

export async function exportToWord(tasks) {
  const today = new Date().toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" });

  const sections = [];

  // Title block
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: "EMPLOYMENT TEAM", bold: true, size: 36, color: GRAY70 })],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Generat: ${today}`, size: 18, color: GRAY70, italics: true })],
      spacing: { after: 300 },
    }),
  );

  for (const person of TEAM) {
    const pTasks = tasksForPerson(tasks, person);

    sections.push(
      new Paragraph({
        children: [new TextRun({ text: person, bold: true, size: 26, color: PERSON_HEX[person] })],
        spacing: { before: 240, after: 120 },
        border: { bottom: { color: PERSON_HEX[person], size: 12, style: BorderStyle.SINGLE, space: 4 } },
      }),
    );

    if (pTasks.length === 0) {
      sections.push(new Paragraph({ children: [new TextRun({ text: "Niciun task in lucru.", italics: true, color: GRAY70, size: 20 })], spacing: { after: 160 } }));
      continue;
    }

    sections.push(buildTaskTable(pTasks, person), new Paragraph({ children: [], spacing: { after: 120 } }));
  }

  // BD section — shared, once, at the end
  const bdTasks = tasksForBD(tasks);
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: "BD / NB", bold: true, size: 26, color: "1A1A1A" })],
      spacing: { before: 240, after: 120 },
      border: { bottom: { color: "1A1A1A", size: 12, style: BorderStyle.SINGLE, space: 4 } },
    }),
  );
  if (bdTasks.length === 0) {
    sections.push(new Paragraph({ children: [new TextRun({ text: "Niciun task in lucru.", italics: true, color: GRAY70, size: 20 })], spacing: { after: 160 } }));
  } else {
    sections.push(buildTaskTable(bdTasks, null), new Paragraph({ children: [], spacing: { after: 120 } }));
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri" } } } },
    sections: [{ properties: {}, children: sections }],
  });

  const blob = await Packer.toBlob(doc);
  const stamp = new Date().toISOString().slice(0, 10);
  saveAs(blob, `Employment-Team-v3-${stamp}.docx`);
}
