# Fitur Baru - Dashboard ESP32

## ✨ Fitur yang Ditambahkan

### 1. **Filter Rentang Waktu**
- Pilihan: **1 Jam**, **24 Jam**, **7 Hari**
- Tombol di bagian atas grafik untuk memilih rentang waktu
- Grafik akan otomatis update ketika Anda mengubah filter

### 2. **Pilih Metrik Grafik**
- Tombol untuk menampilkan/menyembunyikan metrik:
  - **Health**: Skor kesehatan motor (0-100)
  - **RMS**: Getaran (mm/s)
  - **RPM**: Kecepatan motor
- Tekan tombol metrik untuk toggle tampilan
- Kombinasi metrik apapun bisa ditampilkan bersamaan

### 3. **Auto Refresh Otomatis**
- Grafik akan **otomatis refresh setiap 5 detik** tanpa perlu reload halaman
- Terlihat indikator spinner (⟳) saat sedang refresh
- Waktu refresh terakhir ditampilkan di bagian atas grafik
- Berfungsi di background - Anda bisa gunakan filter sambil data di-refresh

### 4. **Deteksi Status ESP32 Online/Offline** 🆕
- Indikator status di header (🟢 Aktif / 🔴 Tidak Aktif)
- Card status detail yang menampilkan:
  - Status device (Online/Offline)
  - Device ID
  - Waktu update terakhir
  - Berapa lama sejak update terakhir
- Online jika ada data dalam **5 menit terakhir**
- Auto refresh setiap 10 detik
- Styling berbeda untuk status online (hijau) dan offline (merah)

## 🏗️ Struktur Teknis

### File-File Baru:
1. **`src/components/interactive-trend-chart.tsx`**
   - Komponen React interaktif untuk grafik
   - Menangani state filter, metrik, dan auto refresh
   - Client-side component ("use client")

2. **`src/components/device-status-indicator.tsx`** 🆕
   - Indikator kecil di header halaman
   - Menampilkan status dengan indikator visual
   - Auto-refresh setiap 10 detik

3. **`src/components/device-status-card.tsx`** 🆕
   - Card besar dengan informasi status detail
   - Menampilkan di bawah statistik di dashboard
   - Styling responsif untuk online/offline

4. **`src/app/api/logs/route.ts`**
   - API endpoint untuk fetch data dengan time range filter
   - Query: `?hours=1|24|168` (1 jam, 24 jam, 7 hari)
   - Mengembalikan data JSON dengan metadata

5. **`src/app/api/device-status/route.ts`** 🆕
   - API endpoint untuk check status device
   - Query database untuk data terakhir
   - Menghitung apakah device online atau offline
   - Return status + waktu terakhir update

### File-File Diupdate:
6. **`src/app/page.tsx`**
   - Menggunakan `InteractiveTrendChart` alih-alih `UploadTrendChart`
   - Import dan menampilkan `DeviceStatusIndicator` di header
   - Import dan menampilkan `DeviceStatusCard` di dashboard
   - Komponen lama masih ada jika Anda perlu referensi

## 🚀 Cara Penggunaan

### Grafik & Filter:
1. **Pilih Rentang Waktu**: Klik tombol "1 Jam", "24 Jam", atau "7 Hari"
2. **Tampilkan/Sembunyikan Metrik**: Klik tombol "Health", "RMS", atau "RPM"
3. **Biarkan Auto Refresh**: Grafik akan otomatis update setiap 5 detik

### Status Device:
1. **Lihat Indikator di Header**: Warna hijau (online) atau merah (offline)
2. **Baca Detail di Card**: Informasi lengkap tentang status device
3. **Monitor Auto Update**: Status otomatis update setiap 10 detik

## 📝 Catatan

- Interval auto refresh grafik dapat diubah dari 5000ms di file `interactive-trend-chart.tsx` (baris ~86)
- Threshold online (default 5 menit) dapat diubah di `device-status/route.ts`
- Interval refresh status (default 10 detik) dapat diubah di komponen status
- API hanya akan mengambil data dalam rentang waktu yang dipilih untuk performa lebih baik
- Data ditampilkan dalam format timestamp lokal Indonesia

## 💡 Tips Kustomisasi

Jika Anda ingin mengubah:
- **Interval refresh grafik**: Ubah nilai `5000` di `interactive-trend-chart.tsx` line ~86
- **Threshold online**: Ubah `ONLINE_THRESHOLD_SECONDS` di `device-status/route.ts`
- **Refresh status**: Ubah `setInterval(fetchStatus, 10000)` di komponen status
- **Warna garis**: Ubah property `stroke` di komponen `Line`
- **Skala Y-axis**: Ubah property `domain` di komponen `YAxis`
- **Warna status**: Ubah class Tailwind di komponen status card
