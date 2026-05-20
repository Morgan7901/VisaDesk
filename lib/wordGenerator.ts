/**
 * Client-side Word document generator using the docx library.
 * Called from AITools.tsx after the AI generation is complete.
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { saveAs } from "file-saver";

export interface WordDocOptions {
  documentType: string;
  title: string;
  content: string;
  firmName: string;
  agentName: string;
  agentMaraNumber: string;
  clientName: string;
  caseRefNumber: string;
  /** Formatted as "20 May 2026" */
  date: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** A thin grey horizontal rule implemented as a bottom border on an empty paragraph. */
function rule(): Paragraph {
  return new Paragraph({
    children: [],
    border: {
      bottom: {
        color: "AAAAAA",
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    spacing: { before: 120, after: 120 },
  });
}

/** Parse a block of text into docx Paragraph objects.
 *
 * Supported markers:
 *  # Title      → Heading 1 (13pt bold)
 *  ## Section   → Heading 2 (12pt bold)
 *  Q1. …        → Question heading (bold, 11pt)
 *  1. …         → Numbered list item (indented)
 *  - …          → Bullet-style list item (indented)
 *  (blank)      → Vertical spacer
 *  anything else → Body paragraph (11pt Calibri)
 */
function parseContent(text: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  for (const line of text.split("\n")) {
    if (line.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({
          text: line.slice(2).trim(),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 360, after: 120 },
        })
      );
    } else if (line.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          text: line.slice(3).trim(),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 80 },
        })
      );
    } else if (/^Q\d+\.\s/.test(line)) {
      // GS form question headings (Q1. CURRENT CIRCUMSTANCES etc.)
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.trim(),
              font: "Calibri",
              size: 26, // 13pt
              bold: true,
            }),
          ],
          spacing: { before: 240, after: 80 },
        })
      );
    } else if (/^\d+\.\s/.test(line)) {
      // Numbered list
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: line.trim(), font: "Calibri", size: 22 }),
          ],
          indent: { left: 360 },
          spacing: { before: 80, after: 60 },
        })
      );
    } else if (/^-\s/.test(line)) {
      // Bullet list
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "•  " + line.slice(2).trim(),
              font: "Calibri",
              size: 22,
            }),
          ],
          indent: { left: 360 },
          spacing: { before: 60, after: 60 },
        })
      );
    } else if (line.trim() === "") {
      paragraphs.push(new Paragraph({ text: "", spacing: { before: 80 } }));
    } else {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: line.trim(), font: "Calibri", size: 22 }),
          ],
          spacing: { before: 80, after: 80 },
        })
      );
    }
  }

  return paragraphs;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateWordDoc(options: WordDocOptions): Promise<void> {
  const {
    documentType,
    title,
    content,
    firmName,
    agentName,
    agentMaraNumber,
    clientName,
    caseRefNumber,
    date,
  } = options;

  const marnText = agentMaraNumber ? ` (MARN: ${agentMaraNumber})` : "";
  const refText = caseRefNumber ? ` — ${caseRefNumber}` : "";

  const children: Paragraph[] = [
    // ── Title ────────────────────────────────────────────────────────────────
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 32, // 16pt
          font: "Calibri",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),

    rule(),

    // ── Date (right-aligned) ─────────────────────────────────────────────────
    new Paragraph({
      children: [new TextRun({ text: date, font: "Calibri", size: 22 })],
      alignment: AlignmentType.RIGHT,
      spacing: { before: 200, after: 60 },
    }),

    // ── Metadata block ───────────────────────────────────────────────────────
    new Paragraph({
      children: [
        new TextRun({
          text: `Prepared by: ${agentName}${marnText}`,
          font: "Calibri",
          size: 22,
        }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Firm: ${firmName}`, font: "Calibri", size: 22 }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Re: ${clientName}${refText}`,
          bold: true,
          font: "Calibri",
          size: 22,
        }),
      ],
      spacing: { after: 120 },
    }),

    rule(),

    // ── Main content ─────────────────────────────────────────────────────────
    ...parseContent(content),

    // ── Footer ───────────────────────────────────────────────────────────────
    rule(),
    new Paragraph({
      children: [
        new TextRun({
          text: "This document was prepared using VisaDesk AI Tools and should be reviewed by the responsible migration agent before use.",
          font: "Calibri",
          size: 18, // 9pt
          italics: true,
          color: "666666",
        }),
      ],
      spacing: { before: 80, after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Prepared by: ${agentName}${agentMaraNumber ? ` | MARN: ${agentMaraNumber}` : ""} | ${firmName}`,
          font: "Calibri",
          size: 20, // 10pt
          bold: true,
        }),
      ],
    }),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 2.54 cm ≈ 1 inch = 1440 twips
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);

  // Build filename: GS_Supporting_Statement_John_Smith_20May2026.docx
  const safeName = clientName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
  const safeDate = date.replace(/\s/g, "");
  const safeType = documentType.replace(/[^a-zA-Z0-9_]/g, "_");
  saveAs(blob, `${safeType}_${safeName}_${safeDate}.docx`);
}
