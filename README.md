# Remindo

**Ingat tugasmu, tuntaskan tepat waktu.**

Remindo adalah aplikasi tugas berbahasa Indonesia dengan Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth, dan PostgreSQL.

- **User** dapat mendaftar, mengonfirmasi email, mengelola tugas sendiri, menggunakan daftar dan kalender, dan mengatur pengingat.
- **Admin** dapat mengelola semua tugas, menugaskan tugas ke pengguna aktif, melihat statistik per pengguna, serta mengubah role dan status akun pengguna lain.
- **Pengingat** muncul di kotak masuk Remindo dan dapat dikirim sebagai Web Push. Job Supabase Cron berjalan setiap menit. Pengingat aktif secara default untuk 1 hari dan 1 jam sebelum deadline serta saat deadline tiba.

## Struktur proyek

~~~text
remindo/
├── app/
│   ├── admin/
│   │   ├── page.tsx
│   │   └── users/                    Daftar pengguna dan perubahan akun
│   ├── api/reminders/route.ts       Pengiriman antrean Web Push
│   ├── auth/                        Aksi autentikasi dan konfirmasi email
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── todo-actions.ts
│   │   └── notifications/           Kotak masuk, preferensi, dan langganan browser
│   ├── login/ dan register/
│   ├── error.tsx, loading.tsx, layout.tsx, dan page.tsx
│   └── globals.css, icon.svg, dan manifest.ts
├── components/                      Form, navigasi, kalender, tema, dan toast
├── lib/                             Sesi server, Supabase, dan tipe data
├── public/sw.js                     Service Worker
├── supabase/
│   ├── migrations/                  Skema, RLS, statistik, dan antrean pengingat
│   ├── schedule-reminders.sql       Pendaftaran job pg_cron
│   └── templates/confirm-signup.html
├── .env.example
├── proxy.ts
├── package.json dan package-lock.json
├── next.config.ts, tsconfig.json, dan eslint.config.mjs
└── README.md
~~~

## Setup lokal

1. Gunakan Node.js 22 atau lebih baru. Buat proyek Supabase dan jalankan empat file di `supabase/migrations/` dari nomor terkecil ke terbesar, sekali per proyek. Jika sebagian migrasi sudah dipasang, jalankan file baru mulai dari nomor berikutnya.
2. Aktifkan provider Email dan **Confirm email**. Di **Authentication → URL Configuration**, tetapkan **Site URL** ke `http://localhost:3000` untuk proyek lokal dan tambahkan `http://localhost:3000/auth/confirm` ke daftar **Redirect URLs**.
3. Ganti subjek template **Confirm signup** menjadi **Konfirmasi akun Remindo** dan tempel isi [template HTML](supabase/templates/confirm-signup.html). Konfigurasikan SMTP produksi untuk mengirim email ke pengguna umum. [Panduan Supabase Auth](https://supabase.com/docs/guides/auth/passwords)
4. Salin [.env.example](.env.example) ke `.env.local`. Isi URL proyek dan publishable key Supabase, serta gunakan `SITE_URL=http://localhost:3000`. Isi juga `SUPABASE_SECRET_KEY` dengan secret key Supabase agar login dapat memeriksa pembatas percobaan.
5. Jalankan perintah berikut, lalu buka `http://localhost:3000`.

~~~sh
npm ci
npm run dev
~~~

## Batas percobaan login

Lima kegagalan kata sandi dalam 15 menit mengunci login melalui Remindo selama 30 menit. Email diperlakukan sama tanpa membedakan huruf kapital. Login sukses mereset penghitung. Ketika beberapa permintaan tiba bersamaan, slot percobaan dicatat sebelum memeriksa kata sandi agar batas berlaku lintas browser. Email yang belum dikonfirmasi dan gangguan dari penyedia autentikasi tidak menambah hitungan. `SUPABASE_SECRET_KEY` harus sama di semua instance deployment dan hanya disimpan di server.

Untuk instalasi Remindo yang sudah berjalan, jalankan [migrasi pembatas login](supabase/migrations/20261123000400_remindo_login_limit.sql). Jalankan kembali skrip jadwal setelahnya jika menggunakan Supabase Cron agar catatan kedaluwarsa dibersihkan setiap hari. Jika pemanggilan API Auth Supabase secara langsung digunakan oleh aplikasi lain, aturan login Remindo berlaku pada formulir Remindo.

## Admin pertama

Daftar dan konfirmasi akun. Di Supabase SQL Editor, jalankan perintah ini dengan email akun tersebut.

~~~sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where lower(email) = lower('admin@example.com')
);
~~~

Buka **Admin → Pengguna** untuk pengelolaan akun selanjutnya. Admin dapat mengubah role atau status akun pengguna lain. RLS menentukan akses menggunakan role dan status terbaru dari database. Akun yang dinonaktifkan kehilangan akses ke tugas, notifikasi, dan preferensi. Tanggal ditampilkan menurut zona waktu browser dan disimpan dalam PostgreSQL sebagai `timestamptz`.

## Deploy ke Vercel

1. Impor repositori Git di Vercel sebagai proyek Next.js. Pilih Node.js 22 atau yang lebih baru.
2. Tambahkan variabel dari `.env.example` di **Settings → Environment Variables**. Setel `SITE_URL` ke origin HTTPS produksi tanpa path, lalu deploy. [Variabel lingkungan Vercel](https://vercel.com/docs/environment-variables)
3. Gunakan origin produksi yang sama sebagai **Site URL** di Supabase dan tambahkan URL produksi berakhiran `/auth/confirm` ke **Redirect URLs**. Pertahankan entri localhost jika Supabase juga dipakai untuk pengembangan lokal. [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)

## Aktifkan pengingat terjadwal dan Web Push

1. Setelah memasang migrasi, aktifkan **Cron** dan ekstensi **pg_net** di Supabase. [Supabase Cron](https://supabase.com/docs/guides/cron/install) · [pg_net](https://supabase.com/docs/guides/database/extensions/pg_net)
2. Buat satu pasangan kunci VAPID dan satu rahasia acak untuk worker. Salin keluaran perintah ke konfigurasi server dan simpan kunci privat serta rahasia worker di tempat terbatas.

~~~sh
npx --no-install web-push generate-vapid-keys
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
~~~

3. Di Vercel, isi `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` dengan alamat kontak berawalan `mailto:`, `REMINDO_CRON_SECRET` dengan nilai acak tadi, dan `SUPABASE_SECRET_KEY` dengan secret key proyek Supabase. Deploy ulang setelah mengubah variabel.
4. Di Supabase Vault, buat dua secret dengan nama berikut. [Panduan Supabase Vault untuk penjadwalan](https://supabase.com/docs/guides/functions/schedule-functions)

   | Nama Vault | Isi |
   | --- | --- |
   | `remindo_worker_url` | URL HTTPS produksi lengkap, misalnya `https://remindo.example.com/api/reminders` |
   | `remindo_cron_secret` | Nilai yang sama dengan `REMINDO_CRON_SECRET` di Vercel |

5. Jalankan [schedule-reminders.sql](supabase/schedule-reminders.sql) melalui Supabase SQL Editor. Job tersebut membuat pengingat in-app setiap menit dan memanggil worker ketika ada kiriman push yang siap. Fungsi generasi mencatat satu pengingat per tugas, penerima, versi deadline, dan waktu pengingat. Job dapat mengejar pengingat yang jatuh tempo sampai satu hari saat jadwal terhenti sementara.
6. Masuk ke Remindo, buka **Notifikasi**, pilih **Aktifkan**, lalu izinkan notifikasi browser. Gunakan HTTPS atau localhost dan browser yang mendukung Push API. Pada iOS, tambahkan Remindo ke Home Screen dan buka dari sana. [Panduan Web Push Next.js](https://nextjs.org/docs/app/guides/progressive-web-apps)

Jika hanya membutuhkan pengingat in-app, cukup aktifkan Supabase Cron dan jadwalkan `select public.remindo_generate_reminders();` setiap menit. Pengiriman push memakai langganan per browser. Isi push berupa pesan umum demi privasi layar kunci. Judul tugas dan detailnya tersedia setelah pengguna masuk ke Remindo.

## Verifikasi setelah deploy

1. Daftar dua pengguna dan tetapkan salah satunya sebagai Admin. Pastikan User dialihkan saat membuka `/admin`.
2. Sebagai Admin, tugaskan todo ke User. Sebagai User, periksa badge dan isi kotak masuk lalu tandai notifikasi sebagai dibaca.
3. Aktifkan push dan buat tugas dengan deadline lima menit ke depan. Periksa job **remindo-reminders** dan log fungsi Vercel. Saat waktunya tiba, pastikan kotak masuk bertambah satu dan browser menampilkan push.
4. Jalankan `npm run lint` dan `npm run build` untuk verifikasi kode lokal.
