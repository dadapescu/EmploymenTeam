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

// Tasks where person is owner or assignee
function tasksForPerson(tasks, person) {
  return tasks
    .filter((t) => t.column === person || t.assignees?.includes(person))
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
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
      sections.push(new Paragraph({ children: [new TextRun({ text: "Niciun task.", italics: true, color: GRAY70, size: 20 })], spacing: { after: 160 } }));
      continue;
    }

    const rows = [
      new TableRow({
        tableHeader: true,
        children: [headerCell("Task"), headerCell("Termen"), headerCell("Status"), headerCell("Colaborare")],
      }),
    ];

    for (const t of pTasks) {
      const overdue = isOverdue(t.due, t.done);
      const titleRuns = [new TextRun({ text: t.title || "", size: 20, color: GRAY70, strike: t.done })];
      if (t.important) titleRuns.unshift(new TextRun({ text: "★ ", color: ORANGE, size: 20 }));

      const dueRuns = [new TextRun({ text: fmtDate(t.due), size: 20, color: overdue ? RED : GRAY70, bold: overdue })];

      const status = t.done ? "Done" : overdue ? "Intarziat" : "In lucru";
      const statusColor = t.done ? "15803D" : overdue ? RED : GRAY70;
      const statusRuns = [new TextRun({ text: status, size: 20, color: statusColor, bold: overdue || t.done })];

      const collab = (t.assignees || []).filter((a) => a !== person);
      const collabRuns = [new TextRun({ text: collab.length ? collab.join(", ") : "—", size: 20, color: GRAY70 })];

      rows.push(
        new TableRow({
          children: [
            bodyCell(titleRuns, { fill: t.done ? "F5F5F4" : undefined }),
            bodyCell(dueRuns, { fill: t.done ? "F5F5F4" : undefined }),
            bodyCell(statusRuns, { fill: t.done ? "F5F5F4" : undefined }),
            bodyCell(collabRuns, { fill: t.done ? "F5F5F4" : undefined }),
          ],
        }),
      );
    }

    sections.push(
      new Table({
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
      }),
      new Paragraph({ children: [], spacing: { after: 120 } }),
    );
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri" } } } },
    sections: [{ properties: {}, children: sections }],
  });

  const blob = await Packer.toBlob(doc);
  const stamp = new Date().toISOString().slice(0, 10);
  saveAs(blob, `Employment-Team-${stamp}.docx`);
}
