# ESP32 Dummy Vibration FFT to Supabase

Project ini masih menggunakan data vibrasi dummy yang disintesis di ESP32, lalu diproses dengan FFT sebelum di-upload ke Supabase. Ini dipakai sampai MPU6500 benar-benar dipasang:

1. Generate sampel vibrasi dummy yang menyerupai pola MPU6500.
2. Proses data dengan FFT.
3. Estimasi frekuensi putar dan RPM dari puncak spektrum.
4. Hitung RMS, peak magnitude, dan indikator health berbasis ISO 10816 Class I.
5. Deteksi pola umum unbalance, misalignment, dan bearing fault secara heuristik.
6. Upload hasil ke Supabase via REST API.

## Setup

1. Buka file [src/main.cpp](src/main.cpp) dan isi:
   - `WIFI_SSID`
   - `WIFI_PASSWORD`
2. Copy file [include/secrets.example.h](include/secrets.example.h) menjadi `include/secrets.h`, lalu isi:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. Saat ini tidak perlu MPU6500 terpasang. Jika nanti sensor dipasang, Anda bisa ganti generator dummy dengan pembacaan sensor nyata.
3. Buat table Supabase, misalnya `vibration_fft_logs`, dengan kolom berikut:
   - `device_id` text
   - `sample_count` int4
   - `sampling_frequency_hz` float8
   - `motor_rpm` float8
   - `running_frequency_hz` float8
   - `overall_vibration_rms_mm_s` float8
   - `dominant_frequency_hz` float8
   - `rms_value` float8
   - `peak_magnitude` float8
   - `health_state` text
   - `health_score` int4
   - `fault_type` text
   - `fundamental_energy_ratio` float8
   - `second_harmonic_energy_ratio` float8
   - `high_frequency_energy_ratio` float8
   - `iso_standard` text
   - `iso_class` text
   - `signal_type` text
   - `created_at_ms` int8
   - `payload` jsonb, jika ingin simpan data mentah tambahan
   - Atau jalankan file [supabase/vibration_fft_logs.sql](supabase/vibration_fft_logs.sql) langsung di SQL Editor Supabase.
4. Pastikan policy insert Supabase mengizinkan token anon untuk menulis data test, atau pakai service role key saat testing lokal.

## Catatan

- Endpoint yang dipakai adalah REST API Supabase: `/rest/v1/<table>`.
- TLS dibuat dengan `setInsecure()` agar cepat untuk testing. Untuk produksi, ganti dengan certificate pinning atau root CA yang benar.
- ISO 10816 Class I dipakai sebagai baseline severity untuk mesin kecil, sehingga `health_state` dan `health_score` adalah indikator sederhana, bukan diagnosis final.
- Data vibrasi masih dummy, tetapi pola dan pipeline FFT dibuat mirip alur sensor asli.
- Perintah serial `fault ...` berfungsi sebagai hint/label skenario dummy yang sedang disimulasikan.

## Kontrol Serial

Hubungkan Serial Monitor pada `115200`, lalu kirim perintah berikut untuk mengubah target fault secara langsung:

- `start` untuk mulai pemrosesan dan upload data.
- `stop` untuk menghentikan pemrosesan dan upload data.
- `fault auto` untuk kembali ke mode siklus otomatis.
- `fault normal`
- `fault unbalance`
- `fault misalignment`
- `fault bearing`
- `motor auto` untuk RPM otomatis di 1500/2000/3000/3500.
- `motor 1500` atau `motor 2000` atau `motor 3000` atau `motor 3500`.
- `status` untuk melihat mode aktif saat ini.
- `help` untuk menampilkan daftar perintah.

Saat mode `auto` aktif, firmware akan mengubah skenario dummy secara bergantian seperti sebelumnya.
Saat ESP32 pertama kali menyala, sistem berada pada mode standby dan menunggu perintah `start`.