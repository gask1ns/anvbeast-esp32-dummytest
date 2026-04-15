# Fitur Deteksi Status ESP32 Online/Offline

## 📊 Ringkasan Fitur

Website sekarang dapat **mendeteksi apakah ESP32 sedang online atau offline** dengan cara memonitor waktu data terakhir yang diterima dari database.

---

## 🔍 Cara Kerja

### Status Detection Logic
- **Online**: Ada data baru dalam **5 menit terakhir**
- **Offline**: Tidak ada data baru dalam **5 menit terakhir**

### Indikator Visual

#### 1. **Status Indicator di Header** (Kecil & Ringkas)
   - Lokasi: Pojok atas kanan halaman utama
   - Menampilkan: 🟢 Aktif / 🔴 Tidak Aktif
   - Update: Setiap 10 detik

#### 2. **Status Card di Dashboard** (Besar & Rinci)
   - Lokasi: Setelah card statistik, sebelum grafik
   - Menampilkan:
     - Status device (Online/Offline)
     - Device ID
     - Waktu update terakhir (format lengkap)
     - Berapa lama sejak update terakhir
     - Pesan deskriptif

---

## ⚙️ Komponen-Komponen

### File-File Baru:

1. **`src/components/device-status-indicator.tsx`**
   - Komponen kecil untuk header
   - Menampilkan indikator sederhana
   - Auto-refresh setiap 10 detik

2. **`src/components/device-status-card.tsx`**
   - Komponen card besar dengan detail
   - Menampilkan informasi lengkap
   - Styling berbeda untuk status online/offline

3. **`src/app/api/device-status/route.ts`**
   - API endpoint yang check status device
   - Query database untuk data terakhir
   - Return status + metadata

### File-File Diupdate:

4. **`src/app/page.tsx`**
   - Import kedua komponen status
   - Tambah `DeviceStatusIndicator` di header
   - Tambah `DeviceStatusCard` di dashboard utama

---

## 🎨 Styling & Warna

### Ketika Online ✅
- Border: Hijau (#22c55e)
- Background: Hijau muda (#dcfce7)
- Text: Hijau gelap (#166534)
- Indikator: 🟢

### Ketika Offline ⚠️
- Border: Merah (#ef4444)
- Background: Merah muda (#fee2e2)
- Text: Merah gelap (#7f1d1d)
- Indikator: 🔴

---

## 🔄 Auto-Refresh Behavior

- **Header Indicator**: Refresh 10 detik sekali
- **Status Card**: Refresh 10 detik sekali
- **Tidak ada reload page**: Hanya update data via API

---

## 📝 Customization

### Mengubah Threshold Online (Default: 5 menit)

Edit file: `src/app/api/device-status/route.ts`

```typescript
// Ubah nilai ini (dalam detik)
const ONLINE_THRESHOLD_SECONDS = 5 * 60; // 5 menit
// Menjadi misalnya:
const ONLINE_THRESHOLD_SECONDS = 2 * 60; // 2 menit
```

### Mengubah Interval Refresh

Edit masing-masing komponen:

```typescript
// Di device-status-indicator.tsx & device-status-card.tsx
const interval = setInterval(fetchStatus, 10000); // 10 detik
// Ubah menjadi:
const interval = setInterval(fetchStatus, 5000);  // 5 detik
```

---

## 📱 Responsive Design

- Header indicator: Responsif di mobile & desktop
- Status card: Full-width dengan padding yang sesuai
- Text: Scalable berdasarkan ukran screen

---

## ✅ Testing

1. Jalankan website: `npm run dev`
2. Buka halaman utama
3. Lihat indikator di header (sebelah kanan judul)
4. Lihat status card di bawah statistik
5. Stop ESP32 untuk test status offline (tunggu 5 menit)
6. Jalankan ESP32 kembali untuk test status online

---

## 🐛 Troubleshooting

**Q: Kenapa status selalu offline?**
- A: Pastikan database sudah punya data
- A: Pastikan interval threshold cukup (5 menit)

**Q: Kenapa tidak update saat ESP32 restart?**
- A: Perlu tunggu sampai data baru masuk ke database
- A: Kalau interval offline 5 menit, status update otomatis

**Q: Berapa interval recommended?**
- A: 5 menit bagus untuk production
- A: Bisa lebih pendek (2-3 menit) untuk testing
