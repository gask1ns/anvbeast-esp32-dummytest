# ESP32 Upload Dashboard

Dashboard web untuk melihat data upload ESP32 dari tabel Supabase `vibration_fft_logs`.

## Teknologi

- Next.js 16 (App Router)
- Tailwind CSS 4
- shadcn/ui
- Supabase JS Client

## Setup

1. Masuk ke folder project ini.
2. Copy `.env.example` menjadi `.env.local`.
3. Isi environment variable berikut:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Catatan:
- Jika policy `select` Supabase Anda hanya untuk role `authenticated`, gunakan `SUPABASE_SERVICE_ROLE_KEY` agar dashboard server-side bisa membaca data.
- Jangan expose service role key ke client component. Di project ini key dipakai di server component.

## Jalankan Lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Fitur Halaman

- Ringkasan total upload, average health score, jumlah data risiko tinggi, dan waktu upload terakhir.
- Tabel riwayat 100 data terbaru.
- Status health dengan badge warna.
