# Sales Copy Generator — Project Plan

## Overview
A modern, high-performance web app that generates marketing/sales copy from a product title and brief, powered by GPT-4o-mini via the OpenAI API.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **AI**: OpenAI Node.js SDK (`openai`) with `gpt-4o-mini`
- **Language**: TypeScript

---

## Project Structure

```
sales-copy-generator/
├── CLAUDE.md
├── .env.local                  # OPENAI_API_KEY (never committed)
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── package.json
└── src/
    └── app/
        ├── globals.css         # Tailwind base imports + custom tokens
        ├── layout.tsx          # Root layout (font, metadata)
        ├── page.tsx            # Main page — form + output display
        └── api/
            └── generate/
                └── route.ts    # POST handler: calls OpenAI, streams or
                                # returns JSON response
```

---

## Key Design Decisions

### 1. API Route (`src/app/api/generate/route.ts`)
- Accepts `POST { productTitle, productBrief }`
- Validates both fields server-side (non-empty, max length)
- Calls `openai.chat.completions.create` with `gpt-4o-mini`
- Returns `{ copy: string }` as JSON
- `OPENAI_API_KEY` read from `process.env` — never exposed to the client

### 2. Form UX (`src/app/page.tsx`)
- Two controlled inputs: **Product Title** (text) and **Product Brief** (textarea)
- Client-side `fetch` to `/api/generate` on submit
- Loading state with spinner/disabled button while waiting
- Error state displayed inline if the API call fails

### 3. Output Display
- Generated copy rendered in a styled card below the form
- **"Copy to Clipboard"** button using the `navigator.clipboard` API
- Visual confirmation ("Copied!") for 2 seconds after click

### 4. Styling
- Clean, professional look: white card on a neutral background
- Responsive single-column layout centered on the page
- Tailwind utility classes only — no external component library

---

## Environment Variable Required
```
OPENAI_API_KEY=sk-...
```
Add to `.env.local` before running. This file is gitignored.

---

## Scripts
```bash
npm run dev    # Start dev server at http://localhost:3000
npm run build  # Production build
npm run start  # Serve production build
```

---

## Files to Create (in order)
1. Bootstrap Next.js project (`npx create-next-app@latest`)
2. `.env.local` — user provides the key
3. `src/app/api/generate/route.ts` — OpenAI API route
4. `src/app/page.tsx` — Form + output UI
5. `src/app/globals.css` + `src/app/layout.tsx` — Layout/styling
