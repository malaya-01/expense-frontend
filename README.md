# Expense Frontend

Next.js app for the expense tracker, styled with the Vercel design language in `DESIGN.md`.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The API defaults to `http://localhost:9000/api` via `NEXT_PUBLIC_API_BASE_URL`.

## Features

- Auth: sign in, sign up, forgot password
- Dashboard overview with month metrics
- Expenses CRUD (local storage until expense API is ready)
- Categories CRUD (backend API)
- Settings / session

## Design

Tokens and components follow `DESIGN.md`: achromatic surfaces, shadow-as-border, Geist typography (400/500/600), blue `#0072F5` as the sole interactive accent, status colors as 10px dots only.
