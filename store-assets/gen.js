/* NextIgnition store-asset generator — Midnight Premium.
   Emits self-contained HTML into ./html; render.sh screenshots them with headless Chrome. */
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'html');
fs.mkdirSync(OUT, { recursive: true });

const LOGO = 'data:image/png;base64,' +
  fs.readFileSync(path.join(__dirname, 'assets', 'logo-transparent.png')).toString('base64');

// Brand
const C = {
  orange: '#f78405', blue: '#6666ff', navy: '#242b64',
  ink: '#080a15', ink2: '#0f1striped', card: '#161b33', cardHi: '#1d2340',
  line: 'rgba(255,255,255,.08)', sub: '#aeb4d6', dim: '#8a90b8',
};

// ---- shared building blocks ------------------------------------------------
const ICONS = {
  spark: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18l-2.2-5.8L3.5 10l6.3-1.7L12 2z" fill="currentColor"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3a6 6 0 00-6 6c0 5-2 6-2 6h16s-2-1-2-6a6 6 0 00-6-6z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 20a2 2 0 004 0" stroke="currentColor" stroke-width="1.8"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.5 12l2.3 2.3L15.5 9.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.2" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 19a5.5 5.5 0 0111 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M16 6.2a3 3 0 010 5.6M17 14.5a5 5 0 013.5 4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  cal: `<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  doc: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 3h8l4 4v14H6z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 12h6M9 16h6M9 8h3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill="currentColor"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="10" width="14" height="10" rx="2.4" stroke="currentColor" stroke-width="1.7"/><path d="M8 10V7a4 4 0 018 0v3" stroke="currentColor" stroke-width="1.7"/></svg>`,
  apple: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.4 12.9c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.8-3.5.8-.7 0-1.8-.8-3-.8-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .7 1.1 1.6 2.3 2.7 2.3 1.1 0 1.5-.7 2.8-.7s1.6.7 2.8.7c1.2 0 1.9-1.1 2.6-2.2.8-1.2 1.2-2.4 1.2-2.5-.1 0-2.3-.9-2.4-3.6zM14.3 6.3c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.6 1 .1 1.9-.5 2.5-1.2z"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

const av = (a, b, ini) => `<span class="av" style="background:linear-gradient(135deg,${a},${b})">${ini}</span>`;

// ---- app-screen mockups (go inside the phone) ------------------------------
const bar = (title) => `
  <div class="tbar">
    <div class="brand"><img src="${LOGO}"/><b>${title}</b></div>
    <span class="ic sm dim">${ICONS.bell}</span>
  </div>`;

const screens = {
  feed: `
    ${bar('NextIgnition')}
    <div class="hero">
      <div class="ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" stroke="rgba(255,255,255,.12)" stroke-width="10" fill="none"/><circle cx="60" cy="60" r="52" stroke="url(#g)" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="326" stroke-dashoffset="120" transform="rotate(-90 60 60)"/><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.orange}"/><stop offset="1" stop-color="${C.blue}"/></linearGradient></defs></svg><em>63%</em></div>
      <div><div class="h-lbl">Your journey</div><div class="h-title">Ideation → Growth</div><div class="chips"><span class="chip on">MVP</span><span class="chip">Fundraise</span><span class="chip">Scale</span></div></div>
    </div>
    <div class="post">
      <div class="prow">${av(C.orange, '#ff5a8a', 'A')}<div><b>Ananya Rao</b><span>Founder · SaaS</span></div></div>
      <p>Just shipped our beta 🚀 Looking for early users & a technical co-founder.</p>
      <div class="react"><span>♥ 128</span><span>💬 24</span><span>↗ Share</span></div>
    </div>
    <div class="post slim"><div class="prow">${av(C.blue, C.navy, 'M')}<div><b>Marcus Lee</b><span>Investor · Seed</span></div><span class="tag">Open to pitch</span></div></div>`,

  ai: `
    ${bar('Ignisha AI')}
    <div class="ai-hero">
      <span class="ic lg grad">${ICONS.spark}</span>
      <div><div class="h-title">Ignisha AI</div><div class="h-lbl">Your startup copilot</div></div>
      <span class="pill">92 left</span>
    </div>
    ${[['Pitch Deck Summarizer', 'Upload a deck, get an instant brief', ICONS.doc],
       ['Startup Summary Generator', 'Turn your idea into a crisp pitch', ICONS.bolt],
       ['Profile Summarizer', 'Auto-craft your founder profile', ICONS.users],
       ['Market Insights', 'AI research on your space', ICONS.chart]]
      .map(([t, s, ic]) => `<div class="tool"><span class="ic md grad-soft">${ic}</span><div><b>${t}</b><span>${s}</span></div><span class="ic sm dim">${ICONS.arrow}</span></div>`).join('')}`,

  network: `
    ${bar('Discover')}
    <div class="tabs"><span class="on">Founders</span><span>Experts</span><span>Investors</span></div>
    ${[['Ravi Kumar', 'FinTech Founder', C.orange, '#ff5a8a', 'R', '94%'],
       ['Sofia Martin', 'AI / ML Expert', '#22c55e', '#0ea5e9', 'S', '89%'],
       ['Devang Shah', 'Growth Advisor', C.blue, C.navy, 'D', '86%']]
      .map(([n, r, a, b, i, m]) => `<div class="pcard">${av(a, b, i)}<div class="pinfo"><b>${n}</b><span>${r}</span></div><div class="pright"><span class="match">${m}</span><span class="btn sm">Connect</span></div></div>`).join('')}`,

  invest: `
    ${bar('Funding')}
    <div class="fhead"><div><div class="h-title">Investor Match</div><div class="h-lbl">Curated for your stage</div></div><span class="ic md grad-soft">${ICONS.chart}</span></div>
    ${[['Blue Peak Ventures', 'Seed · SaaS, AI', '$50k–250k', 'B'],
       ['Anita Desai', 'Angel · Consumer', '$10k–50k', 'A'],
       ['Nova Capital', 'Series A · Fintech', '$250k–1M', 'N']]
      .map(([n, r, c, i]) => `<div class="icard"><div class="prow">${av(C.blue, C.navy, i)}<div><b>${n}</b><span>${r}</span></div></div><div class="irow"><span class="cheque">${c}</span><span class="btn sm out">Message</span></div></div>`).join('')}`,

  events: `
    ${bar('Events')}
    <div class="ev big">
      <div class="ev-top"><span class="date"><em>18</em>JUL</span><span class="live">● LIVE SOON</span></div>
      <b>Founder Fireside: Raising Your First Round</b>
      <div class="attend">${av(C.orange, '#ff5a8a', 'A')}${av(C.blue, C.navy, 'M')}${av('#22c55e', '#0ea5e9', 'S')}<span>+212 going</span></div>
      <span class="btn full">Register free</span>
    </div>
    ${[['24 JUL', 'AI for Startups — Workshop', '132'],
       ['02 AUG', 'Pitch Night: Demo & Feedback', '88']]
      .map(([d, t, g]) => `<div class="ev row"><span class="date sm"><em>${d.split(' ')[0]}</em>${d.split(' ')[1]}</span><div><b>${t}</b><span>${g} going</span></div><span class="ic sm dim">${ICONS.arrow}</span></div>`).join('')}`,

  secure: `
    ${bar('Privacy & Security')}
    <div class="sec-hero"><span class="ic xl grad">${ICONS.shield}</span><div class="h-title">Your data is safe</div><div class="h-lbl">Private by design</div></div>
    ${[['Encrypted in transit', 'HTTPS-only, tokenized sessions', ICONS.lock],
       ['Sign in with Apple', 'Private, one-tap, no passwords', ICONS.apple],
       ['You control your data', 'Export or delete anytime', ICONS.check],
       ['Report & block', 'Safe, moderated community', ICONS.shield]]
      .map(([t, s, ic]) => `<div class="tool"><span class="ic md grad-soft">${ic}</span><div><b>${t}</b><span>${s}</span></div><span class="ic sm ok">${ICONS.check}</span></div>`).join('')}`,
};

// ---- page CSS --------------------------------------------------------------
const CSS = `
*{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased}
html,body{width:1080px;height:1920px;overflow:hidden;font-family:'Segoe UI',system-ui,Arial,sans-serif}
.page{width:1080px;height:1920px;position:relative;background:
  radial-gradient(1100px 700px at 78% -8%, rgba(247,132,5,.28), transparent 60%),
  radial-gradient(1000px 900px at 12% 108%, rgba(102,102,255,.34), transparent 60%),
  linear-gradient(160deg,#0b0f22 0%, #080a15 55%, #060713 100%);
  overflow:hidden;color:#fff}
.page:before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:60px 60px;mask:radial-gradient(900px 900px at 50% 42%,#000,transparent 75%)}
.copy{position:relative;padding:104px 92px 0;text-align:center}
.eyebrow{display:inline-flex;align-items:center;gap:14px;font-size:26px;font-weight:700;letter-spacing:4px;color:${C.orange};text-transform:uppercase}
.eyebrow:before,.eyebrow:after{content:"";width:34px;height:2px;background:linear-gradient(90deg,transparent,${C.orange})}
.eyebrow:after{background:linear-gradient(90deg,${C.orange},transparent)}
h1{font-size:82px;line-height:1.04;font-weight:800;letter-spacing:-1.5px;margin-top:30px}
h1 .g{background:linear-gradient(100deg,${C.orange},${C.blue});-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{font-size:34px;line-height:1.4;color:${C.sub};margin-top:26px;font-weight:500}
/* phone */
.stage{position:absolute;left:50%;bottom:-46px;transform:translateX(-50%)}
.phone{width:640px;height:1300px;border-radius:74px;background:linear-gradient(160deg,#20263f,#0a0c16);padding:16px;box-shadow:0 60px 120px rgba(0,0,0,.6),0 0 0 2px rgba(255,255,255,.06),inset 0 0 0 2px rgba(255,255,255,.04);position:relative}
.phone:before{content:"";position:absolute;top:26px;left:50%;transform:translateX(-50%);width:150px;height:34px;background:#05060c;border-radius:20px;z-index:5}
.screen{width:100%;height:100%;border-radius:60px;background:linear-gradient(180deg,#0e1226,#0a0d1b);overflow:hidden;padding:64px 30px 30px;display:flex;flex-direction:column;gap:20px}
.tbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
.brand{display:flex;align-items:center;gap:12px}
.brand img{width:40px;height:40px}
.brand b{font-size:28px;font-weight:800;letter-spacing:-.3px}
.ic{display:inline-flex;align-items:center;justify-content:center}
.ic svg{width:100%;height:100%}
.ic.sm{width:30px;height:30px}.ic.md{width:34px;height:34px}.ic.lg{width:44px;height:44px}.ic.xl{width:64px;height:64px}
.dim{color:${C.dim}}.ok{color:#34d399}
.grad{color:#fff;background:linear-gradient(135deg,${C.orange},${C.blue});border-radius:18px;padding:16px}
.grad.xl{border-radius:28px;padding:26px}
.grad-soft{color:${C.orange};background:rgba(247,132,5,.14);border-radius:16px;padding:14px;width:64px!important;height:64px!important}
.hero{background:${C.card};border:1px solid ${C.line};border-radius:30px;padding:30px;display:flex;gap:26px;align-items:center}
.ring{position:relative;width:120px;height:120px;flex:none}
.ring svg{width:120px;height:120px}.ring em{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:800;font-size:32px}
.h-lbl{color:${C.dim};font-size:24px;font-weight:600}
.h-title{font-size:34px;font-weight:800;margin:4px 0 14px;letter-spacing:-.4px}
.chips{display:flex;gap:10px}
.chip{font-size:22px;padding:8px 18px;border-radius:20px;background:rgba(255,255,255,.06);color:${C.sub};font-weight:600}
.chip.on{background:linear-gradient(135deg,${C.orange},#ff9a3d);color:#1a1200}
.post{background:${C.card};border:1px solid ${C.line};border-radius:28px;padding:28px}
.post.slim{padding:22px 28px}
.prow{display:flex;align-items:center;gap:16px}
.prow>div{display:flex;flex-direction:column}
.av{width:64px;height:64px;border-radius:50%;flex:none;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:28px;color:#fff;box-shadow:0 6px 16px rgba(0,0,0,.3)}
.prow b,.tool b,.pinfo b,.icard b,.ev b{font-size:27px;font-weight:700}
.prow span,.tool span,.pinfo span,.icard span,.ev span{font-size:22px;color:${C.dim}}
.post p{font-size:26px;color:#e7e9f7;line-height:1.45;margin:20px 0}
.react{display:flex;gap:26px;color:${C.dim};font-size:23px;font-weight:600}
.tag{margin-left:auto;background:rgba(102,102,255,.16);color:#a9adff;font-size:20px;font-weight:700;padding:8px 16px;border-radius:16px}
.ai-hero{background:linear-gradient(120deg,rgba(247,132,5,.16),rgba(102,102,255,.16));border:1px solid ${C.line};border-radius:30px;padding:28px;display:flex;align-items:center;gap:22px}
.ai-hero .h-title{margin:0}
.pill{margin-left:auto;background:rgba(255,255,255,.1);border-radius:18px;padding:10px 18px;font-size:22px;font-weight:700;color:#fff}
.tool{display:flex;align-items:center;gap:20px;background:${C.card};border:1px solid ${C.line};border-radius:24px;padding:24px}
.tool>div{display:flex;flex-direction:column;flex:1}
.tabs{display:flex;gap:10px;background:${C.card};border:1px solid ${C.line};border-radius:22px;padding:8px}
.tabs span{flex:1;text-align:center;padding:16px;border-radius:16px;font-size:24px;font-weight:700;color:${C.dim}}
.tabs .on{background:linear-gradient(135deg,${C.orange},${C.blue});color:#fff}
.pcard,.icard{background:${C.card};border:1px solid ${C.line};border-radius:26px;padding:24px}
.pcard{display:flex;align-items:center;gap:18px}
.pinfo{display:flex;flex-direction:column;flex:1}
.pright{display:flex;flex-direction:column;align-items:flex-end;gap:10px}
.match{color:#34d399;font-weight:800;font-size:24px}
.btn{background:linear-gradient(135deg,${C.orange},#ff9a3d);color:#231500;font-weight:900;border-radius:16px;padding:12px 22px;font-size:22px;text-align:center}
.btn.sm{padding:10px 20px;font-size:21px}
.btn.out{background:rgba(102,102,255,.16);color:#c4c7ff}
.btn.full{display:block;margin-top:20px;padding:20px;font-size:26px;border-radius:20px;color:#231500}
.fhead,.sec-hero{display:flex;align-items:center;gap:20px;background:${C.card};border:1px solid ${C.line};border-radius:28px;padding:28px}
.fhead .h-title{margin:0}.fhead>div{flex:1}
.sec-hero{flex-direction:column;text-align:center;gap:14px;padding:38px}
.icard .irow{display:flex;align-items:center;justify-content:space-between;margin-top:20px}
.cheque{background:rgba(52,211,153,.14);color:#5ee0a8;font-weight:800;font-size:24px;padding:10px 18px;border-radius:16px}
.ev{background:${C.card};border:1px solid ${C.line};border-radius:28px;padding:26px}
.ev.big{background:linear-gradient(150deg,rgba(102,102,255,.18),${C.card})}
.ev-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.ev.big b{font-size:30px;display:block;line-height:1.25}
.date{display:flex;flex-direction:column;align-items:center;background:rgba(255,255,255,.08);border-radius:16px;padding:10px 18px;font-size:20px;font-weight:700;color:${C.sub}}
.date em{font-style:normal;font-size:32px;color:#fff}
.date.sm{padding:8px 14px;font-size:16px}.date.sm em{font-size:24px}
.live{color:#ff7a7a;font-weight:800;font-size:20px}
.attend{display:flex;align-items:center;gap:-8px;margin:18px 0 0}
.attend .av{width:52px;height:52px;font-size:22px;margin-right:-14px;border:3px solid #121631}
.attend span{margin-left:24px;color:${C.dim};font-size:22px;font-weight:600}
.ev.row{display:flex;align-items:center;gap:20px}.ev.row>div{flex:1;display:flex;flex-direction:column}
/* footer brand */
.foot{position:absolute;left:0;right:0;bottom:40px;display:flex;align-items:center;justify-content:center;gap:16px;z-index:6}
.foot img{width:44px;height:44px}
.foot b{font-size:30px;font-weight:800;letter-spacing:-.3px}
.dots{position:absolute;left:50%;transform:translateX(-50%);bottom:118px;display:flex;gap:12px;z-index:6}
.dots i{width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,.22)}
.dots i.on{width:38px;border-radius:8px;background:linear-gradient(90deg,${C.orange},${C.blue})}
`;

const N = 6;
function page({ i, eyebrow, title, sub, screen }) {
  const dots = Array.from({ length: N }, (_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head>
<body><div class="page">
  <div class="copy">
    <span class="eyebrow">${eyebrow}</span>
    <h1>${title}</h1>
    <p class="sub">${sub}</p>
  </div>
  <div class="stage"><div class="phone"><div class="screen">${screen}</div></div></div>
  <div class="dots">${dots}</div>
</div></body></html>`;
}

const PANELS = [
  { file: '01-feed',    eyebrow: 'Your Startup OS', title: 'Turn ideas into<br><span class="g">real startups</span>', sub: 'Plan, build, and grow — one guided journey from idea to funding.', screen: screens.feed },
  { file: '02-ai',      eyebrow: 'Ignisha AI',       title: 'Supercharge with<br><span class="g">AI startup tools</span>', sub: 'Summarize decks, generate pitches, and get market insights in seconds.', screen: screens.ai },
  { file: '03-network', eyebrow: 'Community',         title: 'Built by founders,<br><span class="g">for founders</span>', sub: 'Match with co-founders, mentors, and experts who get it.', screen: screens.network },
  { file: '04-invest',  eyebrow: 'Fundraising',       title: 'Connect with<br><span class="g">the right investors</span>', sub: 'Curated investor matches for your stage, sector, and cheque size.', screen: screens.invest },
  { file: '05-events',  eyebrow: 'Events',            title: 'Grow through<br><span class="g">live events</span>', sub: 'Join fireside chats and pitch nights — or host your own.', screen: screens.events },
  { file: '06-secure',  eyebrow: 'Privacy & Security', title: 'Your data<br><span class="g">stays yours</span>', sub: 'Sign in with Apple, full control, and a safe, moderated community.', screen: screens.secure },
];
PANELS.forEach((p, i) => fs.writeFileSync(path.join(OUT, p.file + '.html'), page({ i, ...p })));

// ---- Feature graphic 1024x500 ----------------------------------------------
const feature = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased}
html,body{width:1024px;height:500px;overflow:hidden;font-family:'Segoe UI',system-ui,Arial}
.fg{width:1024px;height:500px;position:relative;color:#fff;overflow:hidden;background:
  radial-gradient(700px 500px at 88% 120%, rgba(247,132,5,.32), transparent 60%),
  radial-gradient(760px 620px at 6% -20%, rgba(102,102,255,.5), transparent 62%),
  linear-gradient(120deg,#10152f,#0a0d1e 60%,#080a15)}
.fg:before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:46px 46px;mask:radial-gradient(600px 400px at 30% 50%,#000,transparent 78%)}
.wrap{position:relative;height:100%;display:flex;align-items:center;padding:0 70px;gap:40px}
.left{flex:1}
.badge{display:inline-flex;align-items:center;gap:10px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);padding:9px 18px;border-radius:30px;font-size:19px;font-weight:600;color:#dfe2ff}
.badge b{background:linear-gradient(90deg,#f78405,#6666ff);-webkit-background-clip:text;background-clip:text;color:transparent}
h1{font-size:58px;line-height:1.04;font-weight:800;letter-spacing:-1.4px;margin:18px 0 14px}
h1 .g{background:linear-gradient(100deg,#f78405,#6666ff);-webkit-background-clip:text;background-clip:text;color:transparent}
p{font-size:23px;color:#b9bfe4;font-weight:500;max-width:520px;line-height:1.38}
.mark{width:340px;height:340px;flex:none;position:relative;display:flex;align-items:center;justify-content:center}
.mark .halo{position:absolute;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,rgba(102,102,255,.45),transparent 60%);filter:blur(10px)}
.chip{position:relative;width:230px;height:230px;border-radius:56px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 30px 70px rgba(0,0,0,.5),inset 0 0 0 1px rgba(255,255,255,.6)}
.chip img{width:150px;height:150px}
</style></head><body><div class="fg"><div class="wrap">
  <div class="left">
    <span class="badge"><b>NextIgnition</b> · Startup network + AI</span>
    <h1>Where founders<br><span class="g">build & fund</span></h1>
    <p>AI tools, investor matching & a founder community — all in one app.</p>
  </div>
  <div class="mark"><div class="halo"></div><div class="chip"><img src="${LOGO}"/></div></div>
</div></div></body></html>`;
fs.writeFileSync(path.join(OUT, 'feature.html'), feature);

// ---- App icon 512x512 ------------------------------------------------------
const icon = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:512px;height:512px;overflow:hidden}
.ic{width:512px;height:512px;background:#fff;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.ic:before{content:"";position:absolute;inset:0;background:radial-gradient(300px 300px at 30% 18%,rgba(247,132,5,.10),transparent 60%),radial-gradient(320px 320px at 78% 92%,rgba(102,102,255,.12),transparent 62%)}
.ic img{width:330px;height:330px;position:relative;filter:drop-shadow(0 14px 26px rgba(102,102,255,.28))}
</style></head><body><div class="ic"><img src="${LOGO}"/></div></body></html>`;
fs.writeFileSync(path.join(OUT, 'icon.html'), icon);

console.log('Wrote', PANELS.length, 'panels + feature + icon to', OUT);
