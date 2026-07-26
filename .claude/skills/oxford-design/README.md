# Oxford Soluções Digitais — Design System

> Agência de marketing digital brasileira focada em **tráfego pago, performance e gestão de conteúdo** para empresários e donos de negócio. Não fala com outros gestores de tráfego — fala com quem assina o cheque.

---

## What is Oxford

Oxford Soluções Digitais is a performance-oriented digital marketing agency serving Brazilian business owners (SMB and mid-market). Competitors tracked internally include `@bluebery.ag`, `@v4company`, and `@agencia2gather`. The brand positions itself as the **structured, honest, operation-grade** alternative to freelancers and template agencies — a consultant tone, not a vendor tone.

**Primary audience**
- Empresários e donos de negócio (business owners / founders)
- NOT traffic managers, NOT agency-to-agency
- People who are burned by previous agencies, distrustful of "tráfego pago", and need proof + process

**Primary surfaces** (inferred from competitive landscape; confirm with user)
- Marketing website (lead gen → diagnóstico / reunião de estratégia)
- Instagram feed + Reels (main content engine)
- LinkedIn (carousels, B2B repositioning)
- Sales deck / case-study PDF used in strategy meetings
- Internal dashboards and client reports

---

## Sources given to build this system

| Source | Path / link | Notes |
|---|---|---|
| Logo | `uploads/WhatsApp Image 2026-04-20 at 15.29.08.jpeg` (1600×1600, blue bg) | The only visual asset provided. Logo has been recropped and masked — see `assets/logo-oxford-*.png`. |
| Brand colors | Given by user | `#263fa3` primary / `#ffffff` secondary / `#d97757` accent |
| Product / content sample | `conteudo/analise-semanal-concorrentes-2026-04-16.md` (local mount) | Weekly internal competitive-analysis report. Establishes voice, audience, cadence, emoji usage, and visual conventions of internal content. |

**Nothing else was provided** — no codebase, no Figma, no production screenshots. Voice, visual foundations, and UI kit components below are **extrapolated from the logo + the internal report + stated brand colors**, with assumptions flagged clearly.

---

## Index

Start here, then drill in:

| File | What |
|---|---|
| [`README.md`](./README.md) | This file. Brand context, voice, visual foundations, iconography. |
| [`colors_and_type.css`](./colors_and_type.css) | All CSS variables — colors, type scale, radii, shadows, spacing, motion, semantic tokens. Import from any prototype. |
| [`fonts/FONTS.md`](./fonts/FONTS.md) | Font substitution notes (actual Oxford fonts not provided; Google Font matches used). |
| [`assets/`](./assets/) | Logos (horizontal + mark, on-blue + white variants), brand-blue background tile. |
| [`preview/`](./preview/) | HTML cards rendered into the Design System tab. |
| [`ui_kits/marketing-site/`](./ui_kits/marketing-site/) | Marketing website UI kit (React components + interactive index.html). |
| [`ui_kits/instagram/`](./ui_kits/instagram/) | Instagram feed / Reel / carousel templates — the main content engine. |
| [`SKILL.md`](./SKILL.md) | Skill manifest for cross-project / Claude Code use. |

---

## CONTENT FUNDAMENTALS

### Language
**Portuguese (Brazilian).** All customer-facing copy is in pt-BR. Tecnical terms (CTR, CPA, ROAS, Reels, carrossel) are kept in English when that's how the audience says them.

### Who we're talking to
- **Sempre o empresário.** Never another marketer.
- Assumes a smart reader with limited time who has been burned by previous agencies.
- Treats the reader as a peer decision-maker — not a student, not a lead to be "nurtured".

### Pronouns & address
- **Você** (not `tu`, not `o senhor`). Direct, peer-level.
- First-person plural "**nós / a Oxford**" for agency voice — we do this, we believe this.
- Never anonymous corporate voice. CEO/founder voice is explicitly valuable ("Renan falando para câmera").

### Tone
| Attribute | Dial |
|---|---|
| Formal ↔ Casual | **Conversational, but sober.** Not slangy, not stiff. |
| Promotional ↔ Consultative | **Consultative.** "O consultor honesto, não o vendedor." |
| Optimistic ↔ Direct | **Direct.** Names the pain explicitly ("tem medo de estar sendo passado para trás"). |
| Poetic ↔ Concrete | **Concrete.** Real numbers, real timeframes, real before/after. |

### Hooks & headlines
The pattern that works — use it:

- **Number + pain noun:** "3 sinais de que sua agência atual está te enganando"
- **Specific case frame:** "Case: como [cliente] saiu de R$ X para R$ Y em 90 dias com a Oxford"
- **Reframe question:** "O que custa mais caro: o anúncio ou o anúncio mal feito?"
- **Gatekeeping question:** "A pergunta que você precisa fazer antes de contratar QUALQUER agência"
- **Backstage reveal:** "Bastidor: a reunião de estratégia que define se um cliente Oxford vai escalar ou não"

Observable rules:
- Numbers in the first line whenever possible ("Faturou R$ X em Y dias com Z investido").
- Occasional **ALL CAPS** for emphasis on one word only (never a whole sentence).
- Rhetorical questions are fine — they're the most natural way to talk to a skeptical owner.

### Casing
- **Sentence case** for headlines and body. Not Title Case.
- **UPPERCASE with wide tracking** for decorative micro-copy and eyebrows (matches "SOLUÇÕES DIGITAIS" in the wordmark).
- Brand name is **Oxford** (capital O, rest lowercase), never OXFORD in body copy — uppercase is reserved for the logo.

### Emoji
**Used in internal ops docs** (`📊 📅 ⚠️ 🔥 💡`) as lightweight section markers in Markdown.
**Avoided in external customer-facing copy** — competitor feeds in this space tend to emoji-stuff and it undermines the "operação estruturada" positioning Oxford wants. Rule of thumb: if a slide is going to the customer, no emoji. If it's for an ops Telegram / internal report, a functional emoji as a section marker is fine.

### Punctuation quirks
- Em dash `—` used liberally to set off a rephrasing ("Oxford não é freela — é operação estruturada").
- Portuguese conventions: `R$ 1,2 mi`, `90 dias`, `8h–10h`, quotation marks `"..."` (straight quotes are OK in body, curly preferred in display).

### Do / Don't examples

| Do ✅ | Don't ❌ |
|---|---|
| "A pergunta que você precisa fazer antes de contratar QUALQUER agência." | "🚀 5 Dicas Incríveis Para Seu Marketing Digital! 🔥" |
| "Caso: cliente X saiu de R$ 80k para R$ 310k em 90 dias." | "Nossos resultados são transformadores e únicos no mercado." |
| "Tráfego mal feito é o que custa caro — não o tráfego." | "Aqui na nossa agência, nós temos paixão por resultados." |
| "Bastidor da reunião de estratégia." | "Confira agora mesmo o nosso mais novo conteúdo!" |

---

## VISUAL FOUNDATIONS

### Color system
Built around three tokens and one cream:

- **Oxford Blue `#263fa3`** — primary everything. Backgrounds, buttons, headers, brand moments. Deep, confident, slightly purple-leaning royal blue.
- **White `#ffffff`** — paper, text on blue, empty space.
- **Terracotta `#d97757`** — accent only. Reserved for: big numbers, CTAs, underlines, callouts, dropcaps. **Never used as a large fill** — it's a punctuation color, not a section color.
- **Cream `#f7f4ee`** — optional warm page background for long-read content (case studies, reports). Signals a "document" vs an "ad".

Vibe: **editorial + confident**, closer to a consultancy's report cover or a fine-printing press than a SaaS landing page. No pastels. No neon. No gradients on brand elements.

### Typography
- **Display / headlines:** Prata (high-contrast transitional serif). Matches the "OXFORD" wordmark feel. Used large, with tight leading.
- **Body / UI:** Manrope. Geometric, warm, neutral. Chosen explicitly to avoid Inter.
- **Serif alt:** Cormorant Garamond for long-form pullquotes and case-study body.
- **Tracked-out uppercase:** Manrope 500, `letter-spacing: 0.12em`, uppercase — the "SOLUÇÕES DIGITAIS" motif extended to eyebrows, labels, and section markers.

### Spacing & rhythm
- 4px base grid. Generous whitespace — editorial feel, not SaaS density.
- Content columns max out at **~680px** for long-form, **~1200px** for marketing layouts.
- Vertical rhythm: section padding is `--space-16` or `--space-20` on marketing pages. Cards have `--space-6` padding.

### Backgrounds
- **Solid Oxford Blue** full-bleed for hero sections and section dividers. That's the signature move.
- **White / cream** for content surfaces.
- **No gradients on brand color** (no blue-to-purple, no blue-to-teal — that's the trope we avoid).
- A single **paper grain / subtle noise** texture is acceptable on cream backgrounds to add editorial warmth (optional).
- **No stock photos** unless they're high-contrast, warm-toned, slightly grainy editorial photography. When in doubt, use blue solid + white type.

### Animation
- **Fades and subtle slides only.** Entrance: 300ms, `cubic-bezier(0.2, 0.8, 0.2, 1)`, 8–16px Y-offset.
- **No bounces, no spring overshoot.** The brand is sober; springiness reads as consumer-app playful.
- Hover transitions: 120–200ms.
- Page transitions: cross-fade, never slide.

### Hover states
- **On primary (blue) buttons:** darken to `--oxford-blue-600` (#1f3589). No scale.
- **On accent (terracotta) buttons:** darken to `--oxford-terracotta-600`.
- **On secondary / ghost buttons:** bg shifts to `--oxford-blue-50`, border to `--oxford-blue`.
- **On links:** underline appears (`text-decoration-thickness: 2px`, `text-underline-offset: 3px`), color stays.
- **On cards:** shadow lifts from `--shadow` to `--shadow-md`, `translateY(-2px)`.

### Press / active states
- Buttons darken one more step (`--oxford-blue-700` / `--oxford-terracotta-700`).
- `transform: translateY(1px)` — tactile but subtle. No shrink/scale.

### Borders
- 1px `--border-1` (cool pale gray) on most surfaces.
- 1px `--border-brand` (Oxford blue) on emphasized cards and form focus states.
- 2px terracotta underline under headlines as a decorative motif (editorial touch).

### Shadow system
Two layered shadows — a tight inner shadow and a softer ambient. See `--shadow` / `--shadow-md` / `--shadow-lg` / `--shadow-brand`.
- `--shadow-brand` uses blue-tinted shadow for brand-colored cards and CTAs.
- Inset white shadow `--shadow-inset` on dark (blue) surfaces to add a subtle top-light edge.

### Transparency & blur
- Rarely. When used: a **navbar** that becomes `rgba(255,255,255,0.85)` + `backdrop-filter: blur(12px)` on scroll.
- **No frosted-glass cards.** Not the brand.
- Modal scrims: `rgba(11, 21, 56, 0.55)` — uses the deep blue, never pure black.

### Corner radii
- **Cards & surfaces:** 12–16px (`--radius-md` / `--radius-lg`). Soft but not pillowy.
- **Buttons:** 8px (`--radius`). Or `--radius-full` capsule for a single "hero" primary CTA.
- **Inputs:** 8px.
- **Pills / badges:** `--radius-full`.
- **No sharp 0px corners** anywhere — the design is round and editorial, not brutalist.

### Card anatomy
```
- Background: --oxford-white  (or --oxford-cream for warm variants)
- Border:     1px --border-1
- Radius:     --radius-md (12px) default, --radius-lg for hero cards
- Shadow:     --shadow (subtle, ambient)
- Padding:    --space-6 (24px) default, --space-8 for marketing cards
- Hover:      translateY(-2px) + --shadow-md, 200ms ease-out
```

### Layout rules
- **Fixed nav:** translucent on scroll, 64px tall on desktop, 56px mobile.
- **Full-bleed hero:** Oxford-blue background, centered white display type, optional terracotta number on top.
- **Sticky CTA on long reads:** bottom-right, terracotta pill, 56px high.

### Imagery mood
- **Warm, slightly desaturated, editorial.** Think *Monocle* or *Courrier International*, not *TechCrunch*.
- Skin tones preserved; backgrounds slightly muted.
- **If in doubt:** full-bleed Oxford-blue with white type is always on-brand and better than a mismatched photo.

### Tropes we avoid (house banlist)
- Gradient blobs, mesh gradients, bluish-purple gradients
- Emoji cards, emoji headlines
- Rounded cards with a single colored left-border accent
- Bento grids with overly-rounded corners
- Inter / Roboto / system sans
- Fake-3D isometric illustrations
- AI-generated-looking stock photography

---

## ICONOGRAPHY

**No icon set was provided.** We use **Lucide Icons** (CDN) as the house substitute:

- Stroke width: `1.5` (slightly lighter than Lucide's default `2`) to match the classic, editorial feel.
- Size: 20px inline in body, 16px in badges, 24px for feature callouts, 40px+ for hero icons.
- Color: inherits `currentColor`. On blue surfaces, white. On white surfaces, `--fg-2`. Accent color (terracotta) reserved for one-off highlight icons, never a row of icons.

```html
<!-- Drop in via CDN -->
<script src="https://unpkg.com/lucide@latest"></script>
<i data-lucide="arrow-right"></i>
<script>lucide.createIcons();</script>
```

**Substitution flag:** Lucide is a best-guess. If Oxford has a proprietary icon sprite, please provide it — we'll swap in.

### Emoji
Already covered in CONTENT FUNDAMENTALS. Short version: **yes in internal ops docs as section markers, no in customer-facing UI.**

### Unicode glyphs
- **`—` em dash** is used typographically in long-form copy.
- **`•` bullet** for inline separators.
- **`→ ←` arrows** as decorative cue in case-study CTAs ("Ver case →").
- **`R$`** always with a thin space before the number (`R$ 1.200`).

### Logo usage
| File | Use |
|---|---|
| `assets/logo-oxford-horizontal-on-blue.png` | Primary — always prefer this on Oxford-blue backgrounds. |
| `assets/logo-oxford-horizontal-white.png` | White logo with transparent background — for custom backgrounds. |
| `assets/logo-oxford-mark-on-blue.png` | Mark only (the "O" swirl), on blue. |
| `assets/logo-oxford-mark-white.png` | Mark only, white on transparent — favicon, app icon, social avatar. |
| `assets/bg-brand-blue.png` | Solid Oxford-blue tile, useful as a background image. |

**Clear space:** minimum padding around the logo equal to the height of the "O" mark.
**Minimum size:** 120px wide for the horizontal lockup; 32px for the mark alone.
**Never:** stretch, recolor to non-brand color, place on busy imagery, use on gradients, or flip.

---

## Caveats & open questions

See the bottom of my summary message. Short version:

1. No codebase / no Figma / no existing UI → UI kits below are **new, brand-aligned designs**, not recreations.
2. Fonts are **best-guess Google Font substitutes**. Send TTF/OTF if you have them.
3. Voice and content fundamentals are extrapolated from a **single internal report**. Send 3–5 real customer-facing posts / emails / landing pages to sharpen this significantly.
4. Iconography defaults to **Lucide**. Replace if you have a house set.
