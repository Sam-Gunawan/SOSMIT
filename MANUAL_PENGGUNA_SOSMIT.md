# Manual Pengguna SOSMIT
## (Stock Opname Management Information Technology)

---

### 📋 Daftar Isi

1. [Pengenalan Aplikasi](#1-pengenalan-aplikasi)
2. [Persyaratan Sistem](#2-persyaratan-sistem)
3. [Login dan Autentikasi](#3-login-dan-autentikasi)
4. [Dashboard Utama](#4-dashboard-utama)
5. [Manajemen Lokasi](#5-manajemen-lokasi)
6. [Proses Stock Opname](#6-proses-stock-opname)
7. [Review dan Persetujuan](#7-review-dan-persetujuan)
8. [Laporan dan Dokumentasi](#8-laporan-dan-dokumentasi)
9. [Fitur Pencarian](#9-fitur-pencarian)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Pengenalan Aplikasi

**SOSMIT** adalah aplikasi manajemen stock opname yang dirancang untuk memudahkan proses inventaris aset perusahaan. Aplikasi ini memungkinkan pengguna untuk:

- ✅ Melakukan stock opname secara digital dan real-time
- ✅ Mengelola data aset berdasarkan lokasi dan departemen
- ✅ Mengikuti workflow persetujuan bertingkat
- ✅ Menghasilkan laporan komprehensif dengan tanda tangan digital
- ✅ Melacak status dan progres opname secara akurat

### Fitur Utama:
- **Multi-Level Approval**: Area Manager → L1 Support
- **Real-time Status Tracking**: Pemantauan status opname secara langsung
- **Photo Documentation**: Dokumentasi kondisi aset dengan foto
- **CSV Export**: Ekspor data untuk analisis lebih lanjut
- **Email Notifications**: Notifikasi otomatis untuk setiap tahap proses
- **Mobile-Responsive**: Dapat diakses melalui perangkat mobile

---

## 2. Persyaratan Sistem

### Browser yang Didukung:
- Google Chrome (Versi 90+)
- Mozilla Firefox (Versi 88+)
- Microsoft Edge (Versi 90+)
- Safari (Versi 14+)

### Perangkat:
- **Desktop/Laptop**: Resolusi minimum 1024x768
- **Tablet**: iOS 12+ / Android 8+
- **Mobile**: iOS 12+ / Android 8+

### Koneksi Internet:
- Minimum: 1 Mbps untuk fungsi dasar
- Rekomendasi: 5 Mbps untuk performa optimal

---

## 3. Login dan Autentikasi

### 3.1 Cara Login

1. **Akses Aplikasi**: Buka browser dan masukkan URL aplikasi SOSMIT
2. **Input Kredensial**:
   - **Username**: Masukkan username yang telah diberikan oleh administrator
   - **Password**: Masukkan password yang sesuai
3. **Klik Login**: Tekan tombol "Login" untuk masuk ke sistem

### 3.2 Keamanan Akun

- ⚠️ **Jangan bagikan kredensial** login Anda kepada orang lain
- 🔄 **Logout otomatis** akan terjadi setelah periode tidak aktif
- 🔒 **Session token** akan berakhir untuk menjaga keamanan

### 3.3 Troubleshooting Login

**Masalah**: Login gagal
- ✅ Periksa username dan password
- ✅ Pastikan koneksi internet stabil
- ✅ Hubungi administrator jika masalah berlanjut

---

## 4. Dashboard Utama

### 4.1 Komponen Dashboard

Dashboard menampilkan informasi profil pengguna dan akses cepat ke lokasi kerja:

#### **Panel Profil**
- **Foto Profil**: Avatar pengguna (jika tersedia)
- **Nama Lengkap**: Nama depan dan belakang
- **Jabatan**: Posisi dalam perusahaan
- **Departemen & Divisi**: Unit kerja
- **Lokasi Kerja**: Site assignment dan wilayah

#### **Panel Lokasi**
- **Site Card**: Menampilkan lokasi kerja dengan status opname
- **Quick Access**: Tombol akses langsung ke halaman lokasi
- **Status Indicator**: Visual status opname terkini

### 4.2 Navigasi Utama

- **🏠 Dashboard**: Halaman utama
- **🔍 Search**: Pencarian aset dan lokasi
- **📍 Location**: Manajemen lokasi dan opname
- **👤 Profile**: Logout dan pengaturan akun

---

## 5. Manajemen Lokasi

### 5.1 Struktur Hierarki

```
Region → Site Group → Site → Department → Sub-Site
```

### 5.2 Halaman Site

#### **Informasi Site**
- **Nama Site**: Identifikasi lokasi
- **Site Group**: Kelompok site
- **Region**: Wilayah geografis
- **Status Pill**: Indikator status opname real-time

#### **Status Opname yang Tersedia**:
- 🟡 **Outdated**: Opname sudah kadaluarsa
- 🟢 **Active**: Sedang berlangsung
- 🔵 **Submitted**: Sudah diserahkan menunggu review
- 🟠 **Escalated**: Disetujui manager, menunggu L1 Support
- ✅ **Verified**: Sudah diverifikasi dan selesai
- ❌ **Rejected**: Ditolak dan perlu perbaikan

### 5.3 Aksi pada Site

#### **Tombol Start Opname**
- Memulai sesi opname baru
- Otomatis membuat session ID
- Redirect ke halaman opname

#### **Tombol View Report**
- Melihat laporan opname terakhir
- Mengunduh dokumen BAP (Berita Acara Pemeriksaan)
- Tersedia untuk sesi yang sudah selesai

### 5.4 Auto-Refresh Status

Halaman site secara otomatis memperbarui status setiap:
- **30 detik** secara periodic
- **Saat window focus** kembali ke tab
- **Manual refresh** dengan pull-to-refresh gesture

---

## 6. Proses Stock Opname

### 6.1 Memulai Sesi Opname

1. **Navigasi ke Site**: Pilih site yang akan di-opname
2. **Klik "Start Opname"**: Mulai sesi baru
3. **Dialog Reminder**: Baca pengingat durasi opname
4. **Konfirmasi**: Lanjutkan ke halaman opname

### 6.2 Interface Opname

#### **Header Informasi**
- **Site Name**: Nama lokasi yang sedang di-opname
- **Session ID**: ID unik untuk sesi ini
- **Progress Bar**: Indikator kemajuan

#### **Komponen Utama**
- **Asset Scanner**: Scan barcode/QR code aset
- **Asset List**: Daftar aset yang sudah dipindai
- **Action Buttons**: Tombol finish dan cancel

### 6.3 Scanning Aset

#### **Metode Input**:
1. **Barcode Scanner**: Gunakan kamera untuk scan
2. **Manual Input**: Ketik asset tag secara manual
3. **Search & Select**: Cari dari database aset

#### **Data Aset yang Ditampilkan**:
- **Asset Tag & Serial Number**
- **Nama & Kategori Aset**
- **Lokasi & Owner**
- **Status & Kondisi**
- **Foto Kondisi** (jika tersedia)

### 6.4 Pengeditan Data Aset

#### **Field yang Dapat Diedit**:
- ✏️ **Kondisi**: Baik / Rusak / Hilang
- ✏️ **Catatan Kondisi**: Deskripsi detail
- ✏️ **Catatan Kehilangan**: Jika aset hilang
- ✏️ **Lokasi**: Pemindahan lokasi
- ✏️ **Owner**: Perubahan kepemilikan
- ✏️ **Sub-Site**: Perubahan sub-lokasi

#### **Upload Foto**:
- Foto kondisi aset (opsional)
- Format: JPEG, PNG
- Ukuran maksimal: 5MB

### 6.5 Validasi Sebelum Finish

#### **Kondisi Wajib**:
- ✅ Minimal 1 aset ter-scan
- ✅ Semua aset sudah di-review
- ✅ Tidak ada pending items

#### **Pesan Error**:
- "Tidak ada asset yang dipindai"
- "Masih ada asset yang belum diproses"

### 6.6 Menyelesaikan Opname

1. **Klik "Finish Opname"**
2. **Konfirmasi dalam Modal**
3. **Sistem akan**:
   - Generate BAP PDF dengan tanda tangan submitter
   - Kirim email notifikasi ke Area Manager
   - Update status menjadi "Submitted"
   - Redirect ke halaman report

### 6.7 Pembatalan Opname

1. **Klik "Cancel Opname"**
2. **Konfirmasi pembatalan**
3. **Sistem akan**:
   - Hapus sesi opname
   - Hapus semua perubahan
   - Kembali ke halaman site

---

## 7. Review dan Persetujuan

### 7.1 Workflow Persetujuan

```
Submitted → Area Manager Review → Escalated → L1 Support Review → Verified
         ↘                     ↗                              ↘
          Rejected ←──────────────────────────────────────── Rejected
```

### 7.2 Halaman Review

#### **Informasi Sesi**:
- **Submitter**: Nama pengguna yang submit
- **Site**: Lokasi opname
- **Tanggal Submit**: Waktu pengiriman
- **Status**: Status terkini

#### **Data Reviewer**:
- **Manager Reviewer**: Nama area manager (jika ada)
- **L1 Reviewer**: Nama L1 support (jika ada)
- **Review Dates**: Tanggal review masing-masing

### 7.3 Aksi Review (untuk Reviewer)

#### **Tombol yang Tersedia**:
- 🟢 **Approve**: Setujui opname
- 🔴 **Reject**: Tolak opname
- 📋 **View Report**: Lihat detail laporan
- 📄 **Download PDF**: Unduh BAP

#### **Hasil Approval oleh Area Manager**:
- Status berubah ke "Escalated"
- Email dikirim ke submitter dan L1 Support
- PDF diperbarui dengan tanda tangan manager

#### **Hasil Approval oleh L1 Support**:
- Status berubah ke "Verified"
- Email konfirmasi ke submitter
- PDF final dengan semua tanda tangan

#### **Hasil Rejection**:
- Status berubah ke "Rejected"
- Email notifikasi ke submitter
- Opname harus diulang dari awal

### 7.4 Email Notifications

#### **Template Email yang Dikirim**:

1. **opname_submitted.html**: Ke submitter saat selesai opname
2. **opname_review_manager.html**: Ke area manager untuk review
3. **opname_escalated.html**: Ke submitter saat disetujui manager
4. **opname_verification_needed.html**: Ke L1 support untuk verifikasi
5. **opname_verified.html**: Ke submitter saat opname diverifikasi
6. **opname_rejected.html**: Ke submitter saat opname ditolak

#### **Komponen Email**:
- **Logo Perusahaan**
- **Nama Penerima**
- **Informasi Site**
- **Status Update**
- **Link Aksi** (View Progress, Verification Link)
- **Attachment BAP PDF**

---

## 8. Laporan dan Dokumentasi

### 8.1 Halaman Report

#### **Header Report**:
- **Site Information**: Nama, group, region
- **Session Details**: ID, status, tanggal
- **Export Options**: CSV download

#### **Filter dan Pencarian**:
- 🔍 **Search Bar**: Cari berdasarkan asset tag/nama
- 📋 **Category Filter**: Filter berdasarkan kategori
- 📍 **Location Filter**: Filter berdasarkan lokasi
- 👤 **Owner Filter**: Filter berdasarkan pemilik

### 8.2 Asset Cards

#### **Informasi pada Card**:
- **Asset Tag & Icon**: Identifikasi visual
- **Asset Name**: Nama aset
- **Serial Number**: Nomor seri
- **Category**: Kategori aset
- **Condition**: Status kondisi dengan indikator warna
- **Location**: Lokasi dan ruangan
- **Owner**: Nama pemilik
- **Photos**: Foto kondisi (jika ada)

#### **Color Coding Kondisi**:
- 🟢 **Hijau**: Kondisi Baik
- 🟡 **Kuning**: Kondisi Rusak
- 🔴 **Merah**: Aset Hilang

### 8.3 CSV Export

#### **Fitur Export**:
- **Tombol "Download CSV"**: Export semua data
- **Comprehensive Data**: Semua field aset disertakan
- **Proper Escaping**: Data di-escape untuk Excel compatibility

#### **Kolom dalam CSV**:
```
Asset Tag, Asset Name, Serial Number, Category, Sub Category, 
Product Variety, Brand, Status, Condition, Condition Notes, 
Loss Notes, Location, Room, Equipment, Total Cost, Owner Name, 
Owner Position, Owner Department, Owner Division, Owner Cost Center, 
Sub Site Name, Site Name, Site Group, Region, Change Reason
```

### 8.4 BAP (Berita Acara Pemeriksaan)

#### **Komponen BAP PDF**:
- **Header**: Logo perusahaan dan judul
- **Site Information**: Detail lokasi
- **Asset Summary**: Ringkasan jumlah aset
- **Asset Details**: Tabel detail semua aset
- **Digital Signatures**: 
  - Submitter + timestamp
  - Area Manager + timestamp (jika escalated)
  - L1 Support + timestamp (jika verified)

#### **Status Tanda Tangan**:
- **Submitted**: Hanya tanda tangan submitter
- **Escalated**: Submitter + Manager
- **Verified**: Submitter + Manager + L1 Support

---

## 9. Fitur Pencarian

### 9.1 Halaman Search

#### **Search Options**:
- 🔍 **Global Search**: Cari di seluruh database
- 📋 **Filter by Category**: Filter berdasarkan kategori aset
- 📍 **Filter by Location**: Filter berdasarkan site/region
- 👤 **Filter by Owner**: Filter berdasarkan pemilik

#### **Search Results**:
- **Asset Cards**: Tampilan kartu dengan informasi lengkap
- **Location Cards**: Informasi site dan department
- **Pagination**: Navigasi halaman hasil
- **Sort Options**: Pengurutan berdasarkan berbagai kriteria

### 9.2 Advanced Filtering

#### **Category Filters**:
- Desktop Computer
- Laptop
- Handheld Device
- Network Equipment
- Other Equipment

#### **Location Hierarchy**:
- Region → Site Group → Site → Department

#### **Owner Department**:
- IT Department
- Finance Department
- HR Department
- Operations Department
- Dan lainnya...

---

## 10. Troubleshooting

### 10.1 Masalah Umum

#### **Problem**: Halaman tidak load
**Solusi**:
- ✅ Refresh browser (Ctrl + F5)
- ✅ Clear cache dan cookies
- ✅ Periksa koneksi internet
- ✅ Gunakan browser lain

#### **Problem**: Status tidak update
**Solusi**:
- ✅ Tunggu auto-refresh (30 detik)
- ✅ Klik di area lain lalu kembali
- ✅ Manual refresh halaman
- ✅ Logout dan login kembali

#### **Problem**: Tidak bisa upload foto
**Solusi**:
- ✅ Periksa ukuran file (max 5MB)
- ✅ Gunakan format JPEG/PNG
- ✅ Periksa permission kamera browser
- ✅ Coba gunakan browser lain

#### **Problem**: CSV tidak ter-download
**Solusi**:
- ✅ Periksa browser popup blocker
- ✅ Periksa folder download
- ✅ Coba browser lain
- ✅ Disable ad-blocker sementara

### 10.2 Error Messages

#### **"Tidak ditemukan sesi opname"**
- Sesi expired atau tidak valid
- Mulai sesi opname baru

#### **"Masih ada asset yang belum diproses"**
- Ada aset dengan status pending
- Review semua aset sebelum finish

#### **"Gagal memuat data"**
- Masalah koneksi atau server
- Refresh halaman atau coba lagi nanti

### 10.3 Performance Tips

#### **Untuk Performa Optimal**:
- 🚀 Gunakan Chrome atau Edge
- 🚀 Tutup tab browser yang tidak perlu
- 🚀 Pastikan koneksi internet stabil
- 🚀 Update browser ke versi terbaru

#### **Untuk Mobile**:
- 📱 Gunakan mode landscape untuk opname
- 📱 Pastikan battery tidak low
- 📱 Gunakan WiFi jika available

### 10.4 Dukungan Teknis

#### **Hubungi Administrator jika**:
- Login tidak bisa akses
- Data tidak sesuai
- Error yang berulang
- Permission issue

#### **Informasi yang Diperlukan**:
- Username dan role
- Browser dan versi
- Screenshot error (jika ada)
- Langkah-langkah yang dilakukan

---

## 📞 Kontak dan Dukungan

Untuk bantuan teknis lebih lanjut, silakan hubungi:

**IT Support Team**
- 📧 Email: support@sosmit.company.com
- 📞 Phone: +62-xxx-xxx-xxxx
- 🕒 Jam Operasional: Senin - Jumat, 08:00 - 17:00 WIB

**Emergency Support**
- 📧 Email: emergency@sosmit.company.com
- 📞 Phone: +62-xxx-xxx-xxxx (24/7)

---

*Manual ini berlaku untuk SOSMIT versi 1.0. Untuk update dan perubahan fitur, silakan cek dokumentasi terbaru atau hubungi administrator sistem.*

**Last Updated**: December 2024  
**Version**: 1.0  
**Language**: Bahasa Indonesia
