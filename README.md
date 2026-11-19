# Sweetnation Web

Versi web dari aplikasi Flutter **Sweetnation** (kasir homemade food). React + TypeScript + Vite, responsif: sidebar di desktop, bottom navigation di HP. Data tetap di Google Sheets lewat Apps Script yang sama — tanpa backend baru, tanpa mengubah struktur sheet.

- Produksi: https://sweetnation.vercel.app (domain lama `sweetnation-web.vercel.app` dialihkan 308 ke sini)
- Repo: https://github.com/muhammad1510520253/sweetnation-web

## 1. Planning

| Fase | Isi | Status |
|---|---|---|
| 1. Fondasi | Vite + React + TS, auth, routing, layout mobile-first | selesai |
| 2. Operasional | Beranda, menu, transaksi (list, filter, detail, ubah status), stok, statistik | selesai |
| 3. Cetak | Pengaturan printer, struk 58/80 mm, pratinjau, cetak otomatis setelah simpan | selesai |
| 4. Performa | Code splitting per route, cache katalog, header cache aset | selesai |
| 5. Desain & navigasi | Neo-Brutalism, responsif penuh, pagination di menu/transaksi/stok/statistik | selesai |
| 6. Lanjutan | Bluetooth ESC/POS, PWA offline, foto produk, export laporan | belum |

## 2. Fitur

### Sudah jalan

**Auth** — login ke sheet `akun`, sesi di `localStorage`, guard route ke `/login`.

**Beranda** — pesanan hari ini per status (Antrian/Proses/Siap/Selesai), omzet, akses cepat transaksi baru.

**Menu** — 75 produk dari sheet `produk`, pencarian, gambar lazy load.

**Transaksi** — filter tanggal + status; form (pilih menu, jumlah, diskon per item & transaksi, bayar, kirim, alamat, keterangan); detail + ubah status berurutan sampai Selesai.

**Stok** — 50 bahan, pencarian, filter Habis/Sedikit/Banyak, tambah & ubah. Tahan data kotor: `satuan` yang tersimpan sebagai angka (`200`) dinormalisasi, tidak lagi membuat halaman blank.

**Statistik** — total pesanan, omzet, rincian per tanggal dari `summary`.

**Pengaturan Printer** (`/settings`)
- Kertas 58 mm (32 kolom) / 80 mm (48 kolom)
- Header (baris pertama = nama toko), footer, salinan 1–3
- Pratinjau struk real-time
- Test Print
- Cetak otomatis setelah simpan transaksi
- Tersimpan di `localStorage` (`sweetnation.settings`)

**Cetak struk** — tombol printer di detail transaksi. HTML struk dibuat sendiri (`src/receipt.ts`), dicetak lewat iframe tersembunyi dengan `@page size: 58mm|80mm auto`, jadi ukuran kertas ikut setting dan dialog print tidak menutupi UI.

**Tampilan** — Neo-Brutalism: border hitam 3 px, hard shadow, palet kuning/pink/biru/lime, latar titik-titik. Sidebar di ≥ 900 px, bottom nav di HP, kartu transaksi & stok jadi 2 kolom di desktop.

**Pagination** — semua daftar panjang dipotong per halaman: Menu 12, Transaksi 10, Stok 20, Statistik 10; pilihan 10/20/50/100 per halaman, nomor halaman ringkas (`1 … 4 5 6 … 12`), reset ke halaman 1 saat filter/pencarian berubah. Hook `usePaged` + komponen `Pager` di `src/Pagination.tsx`.

**Deploy** — push/merge ke `main` → GitHub Actions → `vercel deploy --prod`; SPA rewrite ke `index.html`.

### Belum dikerjakan

| Fitur | Catatan |
|---|---|
| Printer Bluetooth ESC/POS langsung | Browser tidak bisa Bluetooth klasik (SPP). Opsi: Web Bluetooth (BLE, Chrome) atau WebUSB. Sekarang lewat dialog browser + driver OS. |
| PWA / offline | Butuh service worker + cache API. |
| Foto produk & upload | Sheet `produk` hanya menyimpan URL gambar. |
| Export laporan (CSV/PDF) | Statistik masih tampilan layar. |
| Edit/hapus transaksi | API hanya menyediakan tambah + ubah status. |
| Manajemen akun / hak akses | `hak_akses` baru ditampilkan, belum membatasi menu. |
| Form stok lengkap | Form web lebih ringkas dari `stock_form_page.dart`. |
| Notifikasi pesanan baru | Belum ada push; butuh polling/websocket. |

## 3. Stack & struktur

React + TypeScript, Vite, react-router-dom, lucide-react, CSS murni (tanpa framework UI), tema pink `#F395BE`, font Chivo.

```
src/
  api.ts        wrapper Apps Script (GET/POST) + helper rupiah & tanggal
  auth.tsx      konteks login/logout (localStorage)
  store.tsx     cache produk & konfigurasi
  settings.ts   setting printer (localStorage)
  receipt.ts    builder teks struk + cetak via iframe
  Pagination.tsx hook usePaged + komponen Pager
  ui.tsx        toast, modal, spinner, empty state
  App.tsx       router + shell (sidebar desktop / bottom nav mobile)
  pages/        Login, Home, Menu, Transactions, TransactionForm,
                TransactionDetail, Stock, Profile, Statistic, Settings
```

## 4. Optimasi

**Loading data**
- Produk + konfigurasi diambil paralel (`Promise.all`) saat login.
- Katalog di-cache di `localStorage`, tampil instan saat app dibuka; refetch hanya saat cache kosong atau tombol *Refresh Cache*.
- Code splitting per route (`React.lazy`): bundle awal 303 kB → 264 kB (gzip 94 kB → 84 kB).
- Cache aset permanen: `/assets/*` immutable 1 tahun, `index.html` must-revalidate.
- Gambar `loading="lazy"`, tanpa polling — request hanya saat halaman dibuka atau aksi user.

**Desain**
- Mobile-first, 390 px tanpa horizontal scroll, target sentuh ≥ 40 px.
- Bottom nav di HP, sidebar di ≥ 900 px; grid 2 kolom untuk transaksi & stok di desktop.
- Neo-Brutalism: `--ink` #0B0B0B, border 3 px, `6px 6px 0` hard shadow, palet kuning/pink/biru/lime.
- Warna, shadow, radius via CSS variable; CSS ± 16 kB (gzip 3,8 kB).
- Struk pakai monospace + kolom tetap agar rapi di printer thermal.
- Toast 2,6 s, modal tutup dengan Esc/klik luar, state kosong & loading selalu ada.

## 5. Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build → dist/
npm run preview
```

## 6. Deploy

Otomatis: merge/push ke `main` → `.github/workflows/deploy.yml` → `vercel deploy --prod`.
Secret repo: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

Manual: `vercel --prod`

## 7. Catatan cetak

1. **Akun → Pengaturan Printer**, pilih 58/80 mm, atur header/footer, simpan.
2. **Test Print** → di dialog browser pilih printer thermal, margin `None`, matikan *Headers and footers*.
3. Struk dari detail transaksi (atau otomatis setelah simpan bila diaktifkan) memakai setting yang sama.

## 8. Catatan data

Data dari Apps Script aplikasi Flutter: `.../exec?sheet=produk|akun|transaksi|transaksi-item|stok|konfigurasi|summary`. Write via POST JSON (`isUpdate` / `isDelete` sesuai kontrak aplikasi asli).
