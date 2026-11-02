// Generates docs/API_AND_SERVER_COSTING.pdf from the costing data.
// Uses jspdf + jspdf-autotable (already in frontend deps). Run: node scripts/generate-costing-pdf.mjs
import { jsPDF } from 'jspdf';
import autoTableImport from 'jspdf-autotable';
import { writeFileSync, mkdirSync } from 'fs';

// jspdf-autotable v3 may expose the helper as the default export, as `.default`,
// or only as a method patched onto the jsPDF instance. Normalise to a callable.
const autoTable = typeof autoTableImport === 'function'
  ? autoTableImport
  : (autoTableImport && typeof autoTableImport.default === 'function' ? autoTableImport.default : null);
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', '..', 'docs', 'API_AND_SERVER_COSTING.pdf');

const NAVY = [26, 32, 64];
const BLUE = [37, 99, 235];
const ORANGE = [234, 88, 12];
const LIGHT = [243, 244, 246];

const doc = new jsPDF({ unit: 'pt', format: 'a4' });
const PAGE_W = doc.internal.pageSize.getWidth();
const MARGIN = 40;
let y = 0;

function header() {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 70, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('NextIgnition — Cost Comparison', MARGIN, 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Server hosting · Frontend hosting · AI/LLM costing  —  basic to medium tiers', MARGIN, 52);
  doc.setFontSize(8);
  doc.text('Prepared June 2026 · USD unless noted · vendor prices change — verify before relying', MARGIN, 63);
  y = 90;
}

function sectionTitle(txt, accent = BLUE) {
  if (y > 720) { doc.addPage(); y = 50; }
  doc.setFillColor(...accent);
  doc.rect(MARGIN, y - 11, 4, 15, 'F');
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(txt, MARGIN + 12, y);
  y += 12;
}

function note(txt) {
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(txt, PAGE_W - MARGIN * 2);
  doc.text(lines, MARGIN, y);
  y += lines.length * 12 + 6;
}

function table(head, body, colStyles = {}) {
  const opts = {
    startY: y,
    head: [head],
    body,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 9, cellPadding: 5, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: colStyles,
  };
  if (autoTable) autoTable(doc, opts);
  else if (typeof doc.autoTable === 'function') doc.autoTable(opts);
  else throw new Error('jspdf-autotable not available as function or jsPDF method');
  y = doc.lastAutoTable.finalY + 22;
}

// ───────────────────────── build ─────────────────────────
header();

note(
  'This compares the services NextIgnition actually uses, at basic (free/low) and medium (small-production) ' +
  'levels. Goal: keep costs reasonable. Three categories are compared — Server/backend, Frontend hosting, and AI/LLM. ' +
  'Two end-to-end monthly scenarios are given at the end.'
);

// 1. AI / LLM
sectionTitle('1.  AI / LLM costing  (per 1,000,000 tokens)', ORANGE);
table(
  ['Provider / Model (as used in app)', 'Input $/1M', 'Output $/1M', 'Tier', 'Notes'],
  [
    ['OpenRouter  "openrouter/free"  (DEFAULT)', '$0.00', '$0.00', 'Basic', 'Free; 50 req/day (1,000/day after a one-time $10 credit)'],
    ['Google Gemini 2.5 Flash-Lite', '$0.10', '$0.40', 'Basic-Med', 'Cheapest reliable paid fallback'],
    ['Google Gemini 3.1 Flash-Lite', '$0.25', '$1.50', 'Medium', 'GA budget model'],
    ['Google Gemini 3.5 Flash', '$1.50', '$9.00', 'Medium', 'Latest Flash; higher quality'],
    ['OpenAI GPT-4 Turbo  (useGPT4 = ON)', '$10.00', '$30.00', 'High (avoid)', 'Most expensive path — keep OFF'],
  ],
  { 0: { cellWidth: 200 }, 1: { halign: 'right', cellWidth: 55 }, 2: { halign: 'right', cellWidth: 60 }, 3: { cellWidth: 55 } }
);
note(
  'Recommendation: keep useGPT4 OFF (default free model), buy $10 OpenRouter credit once (50 -> 1,000 free req/day), ' +
  'and use Gemini 2.5 Flash-Lite as the cheap paid fallback. Net recurring AI cost at basic/medium scale: ~ $0/month.'
);

// 2. Server / backend hosting
sectionTitle('2.  Server / backend hosting  (per month)', BLUE);
table(
  ['Service', 'Plan', 'Cost / mo', 'Tier', 'Notes'],
  [
    ['Render (backend API)', 'Free', '$0', 'Basic', 'Spins down after 15 min idle (~1 min cold start)'],
    ['Render (backend API)', 'Starter', '$7', 'Medium', 'Always-on, 512 MB RAM — recommended minimum'],
    ['Render (backend API)', 'Standard', '$25', 'Medium+', '2 GB RAM for heavier traffic'],
    ['Supabase (DB + storage + auth)', 'Free', '$0', 'Basic', 'Pauses after 7 days idle; 500 MB DB, 1 GB files'],
    ['Supabase (DB + storage + auth)', 'Pro', '$25', 'Medium', 'Always-on, daily backups, 8 GB DB, 100 GB files'],
  ],
  { 0: { cellWidth: 150 }, 2: { halign: 'right', cellWidth: 60 }, 3: { cellWidth: 55 } }
);
note('DB lives in Supabase, so no separate Render database is needed. Medium backend = Render Starter ($7) + Supabase Pro ($25).');

// 3. Frontend hosting
sectionTitle('3.  Frontend hosting  (per month)', BLUE);
table(
  ['Service', 'Free tier', 'Paid', 'Commercial on free?', 'Notes'],
  [
    ['Cloudflare Pages', '$0 (unlimited bandwidth)', '~$5-20', 'Yes', 'Best free option for a monetized app'],
    ['Netlify', '$0 (100 GB)', '$19', 'Yes (basic)', 'Generous free tier'],
    ['Render Static Site', '$0', '-', 'Yes', 'Keeps everything on one provider'],
    ['Vercel', '$0 (100 GB)', '$20 / seat', 'No', 'Hobby is non-commercial; needs Pro for a paid app'],
  ],
  { 0: { cellWidth: 110 }, 1: { cellWidth: 120 }, 2: { halign: 'right', cellWidth: 55 } }
);
note('Tip: a monetized app on Vercel needs Pro ($20). Cloudflare Pages / Render Static are free AND allow commercial use — save $20/mo.');

// 4. Scenarios
sectionTitle('4.  Monthly cost scenarios', ORANGE);
table(
  ['Component', 'BASIC (dev / MVP)', 'MEDIUM (small production)'],
  [
    ['Backend (Render)', 'Free  ($0)', 'Starter  ($7)'],
    ['Database/Storage (Supabase)', 'Free  ($0)', 'Pro  ($25)'],
    ['Frontend hosting', 'Cloudflare/Vercel Hobby  ($0)', 'Cloudflare Pages  ($0)'],
    ['AI / LLM', 'OpenRouter free  ($0)', 'OpenRouter free + $10 once  (~$0/mo)'],
    ['Email (Resend)', 'Free 3k/mo  ($0)', 'Free 3k/mo  ($0)'],
    ['SMS OTP (Twilio)', 'pay-per-use', 'pay-per-use (~Rs 0.45/OTP)'],
    ['Payments (Razorpay)', '2% + GST / txn', '2% + GST / txn'],
    ['FIXED MONTHLY TOTAL', '~ $0 / month', '~ $32 / month'],
  ],
  { 0: { cellWidth: 170, fontStyle: 'bold' }, 1: { cellWidth: 150 }, 2: { cellWidth: 150 } }
);
note(
  'BASIC ~ $0/mo: every service on its free tier — great for development/demo, but Supabase pauses, Render cold-starts, ' +
  'and Vercel Hobby is non-commercial. MEDIUM ~ $32/mo: Supabase Pro ($25) + Render Starter ($7) + free commercial ' +
  'frontend, plus a one-time $10 to OpenRouter. Using Vercel Pro instead of Cloudflare makes it ~ $52/mo. ' +
  'Usage costs (Twilio OTP, Razorpay %) are on top and scale with activity, not a fixed fee.'
);

// footer page numbers
const pages = doc.internal.getNumberOfPages();
for (let i = 1; i <= pages; i++) {
  doc.setPage(i);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`NextIgnition cost comparison — page ${i} of ${pages}`, MARGIN, doc.internal.pageSize.getHeight() - 20);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.from(doc.output('arraybuffer')));
console.log('Wrote', OUT);
