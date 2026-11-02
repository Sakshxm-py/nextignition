// Lightweight helpers that let users copy or save any content Ignisha AI returns.
// Downloads render to PDF via jsPDF (already a project dependency) with a light
// Markdown pass so headings, lists, code blocks and tables stay readable.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/** Derive a safe, human-readable filename from the content's first heading/line. */
function deriveFileName(content: string): string {
  const firstLine =
    (content || '')
      .split('\n')
      .map((l) => l.replace(/^#+\s*/, '').replace(/[*_`>#|-]/g, '').trim())
      .find((l) => l.length > 0) || 'ignisha-document';
  const slug = firstLine
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'ignisha-document';
}

/** Copy text to the clipboard, with a legacy fallback. Returns true on success. */
export async function copyAiContent(text: string): Promise<boolean> {
  const value = text ?? '';
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// jsPDF's core fonts can't render emoji/pictographs (they show as boxes/garbage),
// and embedding an emoji TTF would bloat the bundle — so we strip them instead.
const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{2122}\u{2139}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu;

/** Remove emoji/pictographs and tidy the whitespace they leave behind. */
function stripEmoji(s: string): string {
  return s
    .replace(EMOJI_RE, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([.,;:!?])/g, '$1');
}

/** Strip inline Markdown markers + emoji so text reads cleanly in the PDF. */
function stripInline(s: string): string {
  return stripEmoji(
    s
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images -> alt text
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)') // links -> text (url)
      .replace(/`([^`]+)`/g, '$1') // inline code
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/(^|[^_])_([^_]+)_/g, '$1$2')
      .replace(/~~([^~]+)~~/g, '$1')
  ).trim();
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);
}

function splitTableRow(line: string): string[] {
  let l = line.trim();
  if (l.startsWith('|')) l = l.slice(1);
  if (l.endsWith('|')) l = l.slice(0, -1);
  return l.split('|').map((c) => stripInline(c.trim()));
}

/** Download AI content as a PDF (renders Markdown headings, lists, code & tables). */
export function downloadAiContent(text: string, baseName?: string): void {
  const name = baseName || deriveFileName(text);
  const content = (text ?? '').replace(/\r\n/g, '\n');

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeWrapped = (
    str: string,
    opts: {
      size?: number;
      style?: 'normal' | 'bold' | 'italic';
      color?: [number, number, number];
      indent?: number;
      gap?: number;
      font?: string;
    } = {}
  ) => {
    const size = opts.size ?? 11;
    const indent = opts.indent ?? 0;
    const gap = opts.gap ?? 4;
    const color = opts.color ?? [33, 37, 41];
    doc.setFont(opts.font ?? 'helvetica', opts.style ?? 'normal');
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(str || ' ', contentWidth - indent) as string[];
    const lineHeight = size * 1.35;
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, margin + indent, y);
      y += lineHeight;
    }
    y += gap;
  };

  const rawLines = content.split('\n');
  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i];

    // Fenced code block
    if (/^\s*```/.test(line)) {
      const code: string[] = [];
      i++;
      while (i < rawLines.length && !/^\s*```/.test(rawLines[i])) {
        code.push(rawLines[i]);
        i++;
      }
      i++; // skip closing fence
      doc.setFont('courier', 'normal');
      doc.setFontSize(9.5);
      const codeLines = doc.splitTextToSize(stripEmoji(code.join('\n')) || ' ', contentWidth - 16) as string[];
      const lineHeight = 9.5 * 1.4;
      for (const cl of codeLines) {
        ensureSpace(lineHeight);
        doc.setFillColor(245, 246, 248);
        doc.rect(margin, y - lineHeight + 3, contentWidth, lineHeight, 'F');
        doc.setTextColor(40, 40, 40);
        doc.text(cl, margin + 8, y);
        y += lineHeight;
      }
      y += 10;
      continue;
    }

    // Table
    if (line.includes('|') && i + 1 < rawLines.length && isTableSeparator(rawLines[i + 1])) {
      const header = splitTableRow(line);
      i += 2; // skip header + separator
      const body: string[][] = [];
      while (i < rawLines.length && rawLines[i].includes('|') && rawLines[i].trim() !== '') {
        body.push(splitTableRow(rawLines[i]));
        i++;
      }
      ensureSpace(40);
      autoTable(doc, {
        head: [header],
        body,
        startY: y,
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
        headStyles: { fillColor: [99, 102, 241], textColor: 255 },
      });
      y = ((doc as any).lastAutoTable?.finalY ?? y) + 12;
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      y += 6;
      i++;
      continue;
    }

    // Horizontal rule
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      ensureSpace(12);
      doc.setDrawColor(220, 222, 226);
      doc.line(margin, y, margin + contentWidth, y);
      y += 12;
      i++;
      continue;
    }

    // Heading
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const sizes = [20, 17, 15, 13, 12, 11];
      writeWrapped(stripInline(heading[2]), { size: sizes[level - 1], style: 'bold', gap: 6 });
      i++;
      continue;
    }

    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      writeWrapped(stripInline(line.replace(/^\s*>\s?/, '')), {
        color: [107, 114, 128],
        style: 'italic',
        indent: 12,
      });
      i++;
      continue;
    }

    // Bullet list item
    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    if (bullet) {
      writeWrapped('•  ' + stripInline(bullet[1]), { indent: 12, gap: 2 });
      i++;
      continue;
    }

    // Numbered list item
    const numbered = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (numbered) {
      writeWrapped(numbered[1] + '.  ' + stripInline(numbered[2]), { indent: 12, gap: 2 });
      i++;
      continue;
    }

    // Paragraph
    writeWrapped(stripInline(line));
    i++;
  }

  doc.save(`${name}.pdf`);
}
