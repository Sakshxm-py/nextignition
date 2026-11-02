// Generates docs/API_AND_SERVER_COSTING_1K_2K.pdf — costing sized for 1,000-2,000 users.
// Same visual style as generate-costing-pdf.mjs. Uses jspdf + jspdf-autotable (frontend deps).
// Run: node scripts/generate-costing-1k-2k-pdf.mjs
import { jsPDF } from 'jspdf';
import autoTableImport from 'jspdf-autotable';
import { writeFileSync, mkdirSync } from 'fs';

const autoTable = typeof autoTableImport === 'function'
  ? autoTableImport
  : (autoTableImport && typeof autoTableImport.default === 'function' ? autoTableImport.default : null);
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', '..', 'docs', 'API_AND_SERVER_COSTING_1K_2K.pdf');

const NAVY = [26, 32, 64];
const BLUE = [37, 99, 235];
const ORANGE = [234, 88, 12];
const GREEN = [22, 130, 90];
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
  doc.text('NextIgnition — Cost Plan for 1,000-2,000 Users', MARGIN, 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Server hosting · Frontend hosting · AI/LLM · Email · SMS  —  sized for 1k-2k users', MARGIN, 52);
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
  'This plan sizes NextIgnition for a real user base of 1,000-2,000 registered users (assume ~1,500 monthly ' +
  'active, ~300 daily active). It keeps the same lean philosophy as the MVP guide but bumps each service to the ' +
  'tier that actually holds up at this scale. Two end-to-end monthly scenarios are given: LEAN (~1k users, careful) ' +
  'and RECOMMENDED (1k-2k users with headroom). Usage costs (SMS, payments) scale on top and are estimated separately.'
);

// 0. Workload assumptions
sectionTitle('1.  Workload assumptions at this scale', GREEN);
table(
  ['Metric', 'Assumption (1k-2k users)', 'Why it matters'],
  [
    ['Registered users', '1,000 - 2,000', 'Well within every "medium" tier limit below'],
    ['Monthly active (MAU)', '~1,500', 'Supabase Pro includes 100,000 MAU — no auth overage'],
    ['Daily active (DAU)', '~250 - 350', 'Drives AI requests, DB reads, bandwidth'],
    ['AI requests / day', '~1,500 - 3,000', 'Exceeds the 1,000/day free cap -> some paid overflow'],
    ['Emails / day (verify + notify)', '~150 - 400', 'Exceeds Resend free 100/day cap -> paid email'],
    ['SMS OTPs / month', '~3,000 - 6,000', 'Signups + phone logins; pay-per-use'],
    ['File storage (avatars + decks)', '~5 - 30 GB', 'Comfortably inside Supabase Pro 100 GB'],
  ],
  { 0: { cellWidth: 150, fontStyle: 'bold' }, 1: { cellWidth: 170 } }
);

// 2. AI / LLM
sectionTitle('2.  AI / LLM costing  (per 1,000,000 tokens)', ORANGE);
table(
  ['Provider / Model (as used in app)', 'Input $/1M', 'Output $/1M', 'Role at 1k-2k', 'Notes'],
  [
    ['OpenRouter  "openrouter/free"  (DEFAULT)', '$0.00', '$0.00', 'Primary', 'Free 1,000 req/day after one-time $10 credit'],
    ['Google Gemini 2.5 Flash-Lite', '$0.10', '$0.40', 'Paid overflow', 'Cheapest reliable fallback once daily free cap is hit'],
    ['Google Gemini 3.1 Flash-Lite', '$0.25', '$1.50', 'Optional', 'GA budget model; better quality'],
    ['Google Gemini 3.5 Flash', '$1.50', '$9.00', 'Premium only', 'Use only for high-value flows'],
    ['OpenAI GPT-4 Turbo  (useGPT4 = ON)', '$10.00', '$30.00', 'Avoid', 'Most expensive path — keep OFF'],
  ],
  { 0: { cellWidth: 165 }, 1: { halign: 'right', cellWidth: 48 }, 2: { halign: 'right', cellWidth: 50 }, 3: { cellWidth: 58 } }
);
note(
  'Math: ~1.5k-3k AI requests/day. The first 1,000/day stay free (after the one-time $10 OpenRouter credit). ' +
  'The overflow (~500-2,000 req/day) goes to Gemini 2.5 Flash-Lite. At ~2,500 tokens in / ~600 out per request, ' +
  '~45,000 paid requests/month = ~110M input + ~27M output tokens = ~$11 input + ~$11 output ≈ $15-30/month. ' +
  'Keep useGPT4 OFF. Enable Gemini prompt caching (~90% input savings) to push this toward the low end.'
);

// 3. Server / backend hosting
sectionTitle('3.  Server / backend hosting  (per month)', BLUE);
table(
  ['Service', 'Plan', 'Cost / mo', 'Fit for 1k-2k', 'Notes'],
  [
    ['Render (backend API)', 'Starter', '$7', 'Lean / tight', '512 MB RAM, always-on — OK for ~1k users, watch memory'],
    ['Render (backend API)', 'Standard', '$25', 'Recommended', '2 GB RAM — comfortable headroom for 1k-2k + AI calls'],
    ['Render (backend API)', 'Pro', '$85', 'Overkill (yet)', '4 GB RAM — only if traffic spikes hard'],
    ['Supabase (DB + storage + auth)', 'Pro', '$25', 'Recommended', 'Always-on, backups, 8 GB DB, 100 GB files, 100k MAU'],
    ['Supabase', 'Pro + compute add-on', '$35+', 'If DB is hot', 'Bump compute only if query latency climbs'],
  ],
  { 0: { cellWidth: 150 }, 2: { halign: 'right', cellWidth: 60 }, 3: { cellWidth: 75 } }
);
note(
  'DB lives in Supabase, so no separate Render database is needed. For 1k-2k users the realistic backend is ' +
  'Render Standard ($25) + Supabase Pro ($25). Render Starter ($7) can work for the lean ~1k end but 512 MB RAM ' +
  'is tight once concurrent AI/DB load rises — size up to Standard at the first sign of memory pressure.'
);

// 4. Frontend hosting
sectionTitle('4.  Frontend hosting  (per month)', BLUE);
table(
  ['Service', 'Free tier', 'Paid', 'Commercial on free?', 'Notes'],
  [
    ['Cloudflare Pages', '$0 (unlimited bandwidth)', '~$5-20', 'Yes', 'Best pick — free + commercial even at 1k-2k users'],
    ['Netlify', '$0 (100 GB)', '$19', 'Yes (basic)', '100 GB likely enough; upgrade if bandwidth grows'],
    ['Render Static Site', '$0', '-', 'Yes', 'Keeps frontend + backend on one provider'],
    ['Vercel', '$0 (100 GB)', '$20 / seat', 'No', 'Hobby is non-commercial; a paid app needs Pro ($20)'],
  ],
  { 0: { cellWidth: 110 }, 1: { cellWidth: 120 }, 2: { halign: 'right', cellWidth: 55 } }
);
note('At 1k-2k users frontend bandwidth is still small. Cloudflare Pages stays $0 and allows commercial use — no reason to pay $20 for Vercel Pro.');

// 5. Email + SMS
sectionTitle('5.  Email & SMS  (volume-driven)', ORANGE);
table(
  ['Service', 'Plan', 'Cost / mo', 'Capacity', 'Notes'],
  [
    ['Resend (email)', 'Free', '$0', '3,000/mo · 100/day', 'Too tight — 1k-2k users blow past 100/day'],
    ['Resend (email)', 'Pro', '$20', '50,000/mo', 'Recommended — covers verify + notifications comfortably'],
    ['Twilio Verify (OTP)', 'Pay-per-use', '~$16-27', '3k-6k OTPs', 'India ~Rs 0.45/OTP incl. forex surcharge'],
    ['MSG91 / Gupshup (OTP)', 'Pay-per-use', '~$5-9', '3k-6k OTPs', 'India ~Rs 0.15-0.18/OTP — ~60% cheaper than Twilio'],
  ],
  { 0: { cellWidth: 130 }, 2: { halign: 'right', cellWidth: 65 }, 3: { cellWidth: 90 } }
);
note(
  'Email: move to Resend Pro ($20) — at 1k-2k users daily verification + notification email exceeds the free 100/day cap. ' +
  'SMS: stays pay-per-use. At ~3k-6k OTPs/month Twilio costs ~$16-27; switching India OTP traffic to MSG91/Gupshup ' +
  'cuts that to ~$5-9. Payments (Razorpay) are 2% + GST per successful transaction — a cost of revenue, not a fixed fee.'
);

// 6. Scenarios
sectionTitle('6.  Monthly cost scenarios  (1,000-2,000 users)', ORANGE);
table(
  ['Component', 'LEAN  (~1k users, careful)', 'RECOMMENDED  (1k-2k, headroom)'],
  [
    ['Backend (Render)', 'Starter  ($7)', 'Standard  ($25)'],
    ['Database/Storage/Auth (Supabase)', 'Pro  ($25)', 'Pro  ($25)'],
    ['Frontend hosting', 'Cloudflare Pages  ($0)', 'Cloudflare Pages  ($0)'],
    ['AI / LLM (free + paid overflow)', '~$10', '~$25'],
    ['Email (Resend)', 'Free 3k  ($0, if <100/day)', 'Pro 50k  ($20)'],
    ['SMS OTP', 'MSG91 ~$5-9', 'Twilio ~$16-27'],
    ['Payments (Razorpay)', '2% + GST / txn', '2% + GST / txn'],
    ['FIXED MONTHLY TOTAL', '~ $42 / month', '~ $95 / month'],
    ['ALL-IN incl. usage (est.)', '~ $50-60 / month', '~ $110-130 / month'],
  ],
  { 0: { cellWidth: 175, fontStyle: 'bold' }, 1: { cellWidth: 145 }, 2: { cellWidth: 150 } }
);
note(
  'LEAN ~ $42/mo fixed: Render Starter ($7) + Supabase Pro ($25) + free frontend + light AI overflow (~$10), keeping ' +
  'email on the free tier by staying under 100/day. Workable near 1,000 users but little headroom. ' +
  'RECOMMENDED ~ $95/mo fixed: Render Standard ($25) + Supabase Pro ($25) + free frontend + AI (~$25) + Resend Pro ($20) — ' +
  'the realistic plan for a live product at 1k-2k users. Add SMS/payment usage on top: budget ~$110-130/mo all-in. ' +
  'One-time $10 to OpenRouter unlocks 1,000 free AI req/day in both scenarios.'
);

// footer page numbers
const pages = doc.internal.getNumberOfPages();
for (let i = 1; i <= pages; i++) {
  doc.setPage(i);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`NextIgnition cost plan (1k-2k users) — page ${i} of ${pages}`, MARGIN, doc.internal.pageSize.getHeight() - 20);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.from(doc.output('arraybuffer')));
console.log('Wrote', OUT);
