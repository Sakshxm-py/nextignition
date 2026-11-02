# NextIgnition — API & Server Costing Guide

> **Goal:** Run NextIgnition at the **lowest possible cost**, with side-by-side comparisons of
> the AI providers/models, infrastructure, and communication APIs the app actually uses.
>
> **Prepared:** June 2026 · **Currency:** USD primary, ₹ (INR) where the vendor bills in INR.
> Prices change often — treat the **Sources** at the bottom as the source of truth.

---

## 1. What this project actually uses

Pulled from the codebase (`backend/package.json`, `backend/src/controllers/aiController.ts`, `utils/`):

| Category | Service(s) in code | Where |
|---|---|---|
| **LLM / AI** | OpenRouter (primary) → Gemini → Bytez (fallback chain) | `aiController.ts` |
| **Database + Storage + Auth** | Supabase (`@supabase/supabase-js`) | `utils/supabase.ts`, `utils/storage.ts` |
| **Backend hosting** | Render | deploy target |
| **Frontend hosting** | Vercel | deploy target |
| **Transactional email** | Resend (`resend`) | `utils/mailer.ts` |
| **SMS / OTP** | Twilio (`twilio`) | phone verification |
| **Payments** | Razorpay (`razorpay`) | `paymentController.ts`, admin refunds |
| **OAuth login** | Google / LinkedIn / Apple | `authController.ts` — **free** |

The AI layer is built to **prefer free models** and only fall back to paid ones, so the single
biggest lever on cost is keeping AI on free tiers.

---

## 2. AI / LLM API costs (the most important section)

### 2.1 How the app picks a model (the fallback chain)

From `callTextModelWithFallback()` in `aiController.ts`:

```
1. OpenRouter  →  preferred model  (default: "openrouter/free")
2. OpenRouter  →  fallback model   ("openrouter/free")
3. Bytez       →  "google/gemini-2.0-flash-exp"
   (Gemini is used directly for document/image analysis: "gemini-1.5-flash")
```

- Default text model = **`openrouter/free`** → **$0 per token**.
- `useGPT4` admin setting flips the model to **`openai/gpt-4-turbo`** (paid) — leave this **OFF** to stay free.
- API keys read from env: `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `BYTEZ_API_KEY`.

### 2.2 Provider / model comparison (per 1M tokens)

| Provider | Model (as used in code) | Input $/1M | Output $/1M | Notes |
|---|---|---:|---:|---|
| **OpenRouter** | `openrouter/free` (e.g. DeepSeek / Llama / Qwen `:free`) | **$0.00** | **$0.00** | Default. Rate-limited (see 2.3) |
| OpenRouter | `openai/gpt-4-turbo` (`useGPT4`) | ~$10.00 | ~$30.00 | **Most expensive option** — avoid unless required |
| **Google Gemini** | `gemini-2.0-flash` / `2.0-flash-lite` | **$0.00** | **$0.00** | Free tier — **deprecating ~2026-06-01**, migrate off |
| Google Gemini | `gemini-2.5-flash-lite` | $0.10 | $0.40 | Cheapest *paid* Gemini, good fallback |
| Google Gemini | `gemini-3.1-flash-lite` | $0.25 | $1.50 | GA budget model |
| Google Gemini | `gemini-3.5-flash` | $1.50 | $9.00 | Latest Flash |
| Google Gemini | `gemini-1.5-flash` (doc analysis) | legacy | legacy | Being retired — move to a 2.5/3.x Flash-Lite |
| **Bytez** | `google/gemini-2.0-flash-exp` | usage-based | usage-based | Last-resort fallback; check Bytez dashboard for current rate |

> 💡 **Caching:** Gemini supports prompt caching that cuts **input** cost by ~90% (cache reads ≈ 10% of base input). Worth enabling if you move document analysis onto a paid Gemini model.

### 2.3 OpenRouter free-tier limits (the real constraint, not $)

The free models cost $0 but are **rate-limited**:

| Account state | Requests/min | `:free` requests/day |
|---|---:|---:|
| No credits purchased | 20 | **50/day** |
| **≥ $10 credits (one-time)** | 20 | **1,000/day** |

➡️ **Cheapest scaling trick:** buy **$10 of OpenRouter credits once** → daily free-model cap jumps
from 50 → **1,000 requests/day** while still paying **$0 per token**. This is the single best
cost-per-value move for the AI layer.

### 2.4 AI cost recommendation (minimum)

1. Keep `useGPT4 = false` → default `openrouter/free`.
2. Buy **$10 OpenRouter credits once** to unlock 1,000 free req/day.
3. Migrate the Gemini paths off `2.0-flash` / `1.5-flash` (deprecating) to **`gemini-2.5-flash-lite`** ($0.10/$0.40) as a cheap, reliable fallback.
4. Net recurring AI cost at MVP scale: **≈ $0/month** (plus the one-time $10).

---

## 3. Infrastructure: Database, Storage & Auth (Supabase)

Supabase covers Postgres DB + file storage (avatars, decks) + auth in one bill.

| | **Free** | **Pro** | Overage |
|---|---|---|---|
| Price | **$0** | **$25/mo** | — |
| DB storage | 500 MB | 8 GB | $0.125/GB |
| File storage | 1 GB | 100 GB | $0.021/GB |
| Egress (bandwidth) | 5 GB | 250 GB | $0.09/GB |
| Monthly active users | 50,000 | 100,000 | — |
| Backups | ❌ | 7-day daily | — |
| **24/7 uptime** | ❌ **pauses after 7 days idle** | ✅ always-on | — |

> ⚠️ The free project **auto-pauses after 7 days of inactivity** → unusable for a live product.
> A profile-pics bucket must also be **public** for avatars to load (see project memory).
> **For production you need Pro ($25/mo).** For dev/demo, Free is fine.

---

## 4. Backend hosting (Render)

| | **Free** | **Starter** | **Standard / Pro** |
|---|---|---|---|
| Price | **$0** (750 hrs/mo) | **$7/mo** per service | $25 → $85/mo |
| RAM | 512 MB | 512 MB | 2–4 GB |
| **Cold starts** | ⚠️ spins down after 15 min idle (~1 min wake) | ✅ always-on | ✅ always-on |
| Workspace seat fee | $0 | $0 (Professional plan optional, $19/user) | optional |

- Render Postgres **not needed** — DB lives in Supabase.
- **Minimum for a real backend:** **$7/mo** (Starter, no cold starts).
- Free works for demos but the 15-min spin-down hurts UX (first request stalls ~1 min).

---

## 5. Frontend hosting (Vercel)

| | **Hobby (Free)** | **Pro** | Overage |
|---|---|---|---|
| Price | **$0** | **$20/seat/mo** | — |
| Bandwidth | 100 GB/mo | 1 TB/mo | $0.15/GB |
| Function invocations | 1M | 10M+ | usage |
| **Commercial use** | ❌ **personal/non-commercial only** | ✅ allowed | — |

> ⚠️ Vercel **Hobby forbids commercial use.** A monetized NextIgnition (Razorpay payments)
> technically requires **Pro ($20/mo)**. Cheaper alternative: host the frontend on
> **Render Static Site / Cloudflare Pages (free, commercial-OK)** to avoid the $20.

---

## 6. Communication APIs

### 6.1 Email — Resend

| Tier | Price | Emails/mo | Daily cap |
|---|---|---:|---:|
| **Free** | **$0** | 3,000 | 100/day |
| Pro | $20–$35/mo | 50,000 | — |

➡️ **Free tier (3k/mo) is enough** for OTP/notification email at MVP scale. Upgrade only when you exceed ~100 emails/day.

### 6.2 SMS / OTP — Twilio (India)

| Item | Cost |
|---|---|
| Twilio **Verify** (OTP) baseline | ~$0.05 / verification |
| India per-OTP (incl. forex surcharge) | **~₹0.45 / OTP** |
| Forex margin | ~2–3% added to invoice |

➡️ **Cost scales with usage**, not a flat fee. 10,000 OTPs ≈ **₹4,500 (~$54)**.
**Cheaper India alternatives:** MSG91 ~₹0.15, Gupshup ~₹0.17, Kaleyra ~₹0.18 per OTP — switching from
Twilio can cut OTP cost by **~60–65%** at volume. Consider this if SMS volume grows.

### 6.3 Payments — Razorpay (cost of revenue)

| Method | Fee |
|---|---|
| UPI / Cards / Netbanking / Wallets (domestic) | **2% + 18% GST** |
| EMI / Amex / Diners / Pay Later | 3% + GST |
| High volume (>₹10L/mo, negotiated) | ~1.5–1.8% |

- No setup / no AMC; charged **only on successful payments**.
- This is a **% of revenue**, not a fixed monthly cost. On ₹1,00,000 collected → ~₹2,360 in fees.

### 6.4 OAuth (Google / LinkedIn / Apple)

**Free.** No per-login charge. (Apple requires the $99/yr Apple Developer membership only if you ship a native iOS app — not needed for web "Sign in with Apple".)

---

## 7. Minimum monthly cost scenarios

### Scenario A — Absolute minimum (dev / demo / pre-launch) → **$0/month**

| Service | Plan | Cost |
|---|---|---|
| AI | OpenRouter `openrouter/free` + Gemini free | $0 |
| Database/Storage | Supabase Free | $0 |
| Backend | Render Free | $0 |
| Frontend | Vercel Hobby / Cloudflare Pages | $0 |
| Email | Resend Free (3k) | $0 |
| SMS | Twilio pay-as-you-go | $0 until used |
| **Total** | | **$0/mo** |

> Caveats: Supabase pauses after 7 days idle · Render cold-starts · Vercel Hobby is non-commercial.
> Fine for building/demoing, **not** for a live monetized product.

### Scenario B — Production minimum (always-on, commercial) → **≈ $52/month + usage**

| Service | Plan | Cost |
|---|---|---|
| Database/Storage/Auth | **Supabase Pro** (always-on, backups) | $25 |
| Backend | **Render Starter** (no cold start) | $7 |
| Frontend | **Vercel Pro** (commercial) — *or Cloudflare Pages = $0* | $20 *(→ $0)* |
| AI | `openrouter/free` + **$10 one-time** credit | $0/mo |
| Email | Resend Free (3k) | $0 |
| SMS (Twilio) | per OTP (~₹0.45) | usage |
| Razorpay | 2% + GST per txn | % of revenue |
| **Fixed total** | | **~$52/mo** (**~$32/mo** if frontend on Cloudflare Pages) |

> 💰 **Leanest realistic production stack ≈ $32/month** (Supabase Pro $25 + Render Starter $7 +
> free frontend) plus pure usage costs (Twilio OTPs, Razorpay %). One-time $10 to OpenRouter.

---

## 8. Quick cost-cutting checklist

- [ ] Keep `useGPT4 = OFF` (GPT-4 Turbo is ~$10/$30 per 1M — the most expensive path).
- [ ] Buy **$10 OpenRouter credits once** → 50 → 1,000 free requests/day.
- [ ] Migrate Gemini calls off deprecating `2.0-flash` / `1.5-flash` → `gemini-2.5-flash-lite`.
- [ ] Host frontend on **Cloudflare Pages / Render Static** (free + commercial) instead of Vercel Pro → save $20/mo.
- [ ] Stay on **Resend Free** (3k emails) until >100/day.
- [ ] Evaluate **MSG91/Gupshup** vs Twilio for OTP → ~60% cheaper in India at volume.
- [ ] Enable Gemini **prompt caching** if/when you move to paid Gemini (≈90% input savings).
- [ ] Watch Supabase **egress** (avatars/decks) — keep images compressed to stay under 250 GB.

---

## Sources

- [OpenRouter Pricing](https://openrouter.ai/pricing) · [Free-tier limits](https://openrouter.ai/docs/api/reference/limits) · [Free models list (Jun 2026)](https://costgoat.com/pricing/openrouter-free-models)
- [Gemini API Pricing (Google)](https://ai.google.dev/gemini-api/docs/pricing) · [Gemini pricing guide 2026](https://costgoat.com/pricing/gemini-api)
- [Supabase Pricing](https://supabase.com/pricing) · [Storage pricing](https://supabase.com/docs/guides/storage/pricing)
- [Render Pricing](https://render.com/pricing) · [Render free tier 2026](https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026)
- [Vercel Pricing](https://vercel.com/pricing) · [Hobby plan limits](https://vercel.com/docs/plans/hobby)
- [Resend Pricing](https://resend.com/pricing)
- [Twilio Verify Pricing](https://www.twilio.com/en-us/verify/pricing) · [SMS India](https://www.twilio.com/en-us/sms/pricing/in) · [India OTP cost breakdown](https://www.messagecentral.com/blog/sms-otp-pricing-india)
- [Razorpay Pricing](https://razorpay.com/pricing/) · [Fees explained](https://razorpay.com/blog/razorpay-payment-gateway-pricing-explained/)
