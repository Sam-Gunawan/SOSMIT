# Manual Pengguna SOSMIT
## (Stock Opname Management Information Technology)

---

### 📋 Daftar Isi

1. [Pengenalan Aplikasi](#1-pengenalan-aplikasi)
2. [Persyaratan Sistem](#2-persyaratan-sistem)
3. [Login dan Autentikasi](#3-login-dan-autentikasi)
4. [Dashboard Utama](#4-dashboard-utama)
5. [Pusat Notifikasi](#5-pusat-notifikasi)
6. [Manajemen Lokasi](#6-manajemen-lokasi)
7. [Proses Stock Opname](#7-proses-stock-opname)
8. [Review dan Persetujuan](#8-review-dan-persetujuan)
9. [Laporan dan Dokumentasi](#9-laporan-dan-dokumentasi)
10. [Fitur Pencarian](#10-fitur-pencarian)
11. [Troubleshooting](#11-troubleshooting)

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

---

## 3. Login dan Autentikasi

### 3.1 Cara Login

1. **Input Kredensial**:
   - **Username**: Masukkan username yang telah diberikan oleh administrator
   - **Password**: Masukkan password yang sesuai
2. **Klik Login**: Tekan tombol "Login" untuk masuk ke sistem

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

### 4. Header

- **Dashboard**: Halaman utama
- **Search**: Pencarian aset dan lokasi
- **Notification**: Pusat notifikasi dan pesan sistem
- **Profile**: Logout dan pengaturan akun

---

## 5. Dashboard

### 5.1 Komponen Dashboard

Dashboard menampilkan nama pengguna dan akses cepat ke lokasi kerja:

#### **Panel Profil**
- **Nama Lengkap**: Nama depan dan belakang

### **Panel Search**
- **Opname Location Search**: memungkinkan pengguna untuk dengan cepat menemukan dan mengakses lokasi untuk melakukan stock opname:

**🔍 Cara Menggunakan**:
1. **Input Search**: Ketik nama site, region, site group, department, nama user, atau tanggal
2. **Auto-complete**: Sistem akan menampilkan saran lokasi yang sesuai
3. **Select Location**: Pilih lokasi dari dropdown hasil pencarian
4. **Quick Access**: Klik hasil untuk langsung ke halaman site tersebut

**📍 Jenis Pencarian**:
- **Site Name**: Cari berdasarkan nama lokasi spesifik
- **Site Group**: Cari berdasarkan kelompok site
- **Region**: Cari berdasarkan wilayah geografis
- **Department**: Cari department dalam site tertentu
- **User Name**: Cari berdasarkan nama pengguna yang membuat sesi opname
- **Start Date**: Cari berdasarkan tanggal mulai opname (format: DD/MM/YYYY)
- **End Date**: Cari berdasarkan tanggal selesai opname (format: DD/MM/YYYY)

**🎯 Filter Opname Status**:
- **Show All**: Tampilkan semua lokasi
- **Active**: Sedang berlangsung (sesi opname aktif)
- **Submitted**: Sudah diserahkan menunggu review dari Area Manager
- **Escalated**: Disetujui Area Manager, menunggu verifikasi L1 Support
- **Verified**: Sudah diverifikasi dan selesai (approved oleh L1 Support)
- **Rejected**: Ditolak dan perlu perbaikan (ditolak oleh Area Manager atau L1 Support)
- **Outdated**: Lokasi yang perlu opname baru (opname sudah kadaluarsa)

**👤 Filter berdasarkan User**:
- **Created By**: Pencarian berdasarkan nama user yang membuat sesi
- **Username**: Cari berdasarkan username sistem

**📅 Filter berdasarkan Tanggal**:
- **Date Range**: Pilih rentang tanggal dengan date picker
- **Start Date**: Filter sesi yang dimulai pada tanggal tertentu
- **End Date**: Filter sesi yang selesai pada tanggal tertentu

**🔍 Contoh Pencarian Lanjutan**:
- `Jakarta + John Doe`: Site Jakarta dengan opname oleh John Doe
- `01/01/2024 - 31/01/2024`: Semua opname dalam rentang Januari 2024
- `Active + IT Department`: Department IT dengan status opname aktif
- `Surabaya + Completed + 15/12/2024`: Site Surabaya yang selesai pada 15 Desember 2024

#### **Panel Lokasi**
- **Site Card**: Menampilkan lokasi kerja dengan status opname
- **Quick Access**: Tombol akses langsung ke halaman lokasi
- **Status Indicator**: Visual status opname terkini

---

## 6. Manajemen Lokasi

### 6.1 Struktur Hierarki

```
Region → Site Group → Site → Department → Sub-Site
```

### 6.2 Halaman Site

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

### 6.3 Aksi pada Site

#### **Tombol Start Opname**
- Memulai sesi opname baru
- Otomatis membuat session ID
- Redirect ke halaman opname

#### **Tombol Continue Opname **
- Melanjutkan sesi opname yang belum selesai

#### **Tombol View Report**
- Melihat laporan opname terakhir
- Mengunduh dokumen BAP (Berita Acara Pemeriksaan)
- Tersedia untuk sesi yang sudah selesai

---

## 7. Proses Stock Opname

### 7.1 Memulai Sesi Opname

1. **Navigasi ke Site**: Pilih site yang akan di-opname
2. **Klik "Start Opname"**: Mulai sesi baru
3. **Dialog Reminder**: Baca pengingat durasi opname
4. **Konfirmasi**: Lanjutkan ke halaman opname

### 7.2 Interface Opname

#### **Header Informasi**
- **Site Name**: Nama lokasi yang sedang di-opname
- **Start Date**: Tanggal sesi opname dibuat
- **Progress Bar**: Indikator opname sudah berjalan berapa lama

#### **Komponen Utama**
- **Asset Scanner**: Scan barcode/QR code aset
- **Asset List**: Daftar aset yang sudah dipindai
- **Action Buttons**: Tombol finish dan cancel

### 7.3 Scanning Aset

#### **Metode Input**:
1. **Barcode Scanner**: Gunakan kamera untuk scan
2. **Manual Input**: Ketik asset tag secara manual

#### **Data Aset yang Ditampilkan**:
- **Asset Tag & Nama & Serial Number**
- **User & Cost Center**
- **Kondisi & Status**
- **Process & Action**

### 7.4 Pengeditan Data Aset

#### **Field yang Dapat Diedit**:
- ✏️ **Serial Number**: Perubahan serial number
- ✏️ **Kondisi**: Baik / Rusak / Hilang
- ✏️ **Catatan Kondisi**: Deskripsi detail
- ✏️ **Catatan Kehilangan**: Jika aset hilang
- ✏️ **Lokasi**: Pemindahan lokasi
- ✏️ **User**: Perubahan kepemilikan

#### **Upload Foto**:
- Foto kondisi aset (jika rusak)
- Format: JPEG, PNG
- Ukuran maksimal: 5MB

### 7.5 Validasi Sebelum Finish

#### **Kondisi Wajib**:
- ✅ Minimal 1 aset ter-scan
- ✅ Semua aset sudah di-review
- ✅ Tidak ada pending items

### 7.6 Menyelesaikan Opname

1. **Klik "Finish Opname"**
2. **Konfirmasi dalam Modal**
3. **Sistem akan**:
   - Generate BAP PDF dengan tanda tangan submitter
   - Kirim email notifikasi ke Area Manager
   - Update status menjadi "Submitted"
   - Redirect ke halaman report

### 7.7 Pembatalan Opname

1. **Klik "Cancel Opname"**
2. **Konfirmasi pembatalan**
3. **Sistem akan**:
   - Hapus sesi opname
   - Hapus semua perubahan
   - Kembali ke halaman site

---

## 8. Review dan Persetujuan

### 8.1 Workflow Persetujuan

```
Submitted → Area Manager Review → Escalated → L1 Support Review → Verified
         ↘                     ↗                              ↘
          Rejected ←──────────────────────────────────────── Rejected
```

### 8.2 Halaman Review

#### **Informasi Sesi**:
- **Submitter**: Nama pengguna yang submit
- **Site**: Lokasi opname
- **Tanggal Submit**: Waktu pengiriman
- **Status**: Status terkini

#### **Data Reviewer**:
- **Manager Reviewer**: Nama area manager (jika ada)
- **L1 Reviewer**: Nama L1 support (jika ada)
- **Review Dates**: Tanggal review masing-masing

### 8.3 Aksi Review (untuk Reviewer)

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

### 8.4 Email Notifications

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

## 9. Laporan dan Dokumentasi

### 9.1 Halaman Report

#### **Header Report**:
- **Site Information**: Nama site
- **Session Details**: Status opname
- **Date Picker**: Pemilihan tanggal opname
- **Export Options**: PDF atau CSV

#### **Filter dan Pencarian**:
- **Search Bar**: Cari berdasarkan asset tag/nama/serial number/user/cost center
- **Condition Filter**: Filter berdasarkan kondisi
- **Status Filter**: Filter berdasarkan status
- **Process Filter**: Filter berdasarkan process

### 9.2 Asset Cards

#### **Informasi pada Card**:
- **Asset Name**: Nama aset
- **Asset Tag**: Identifikasi aset
- **Serial Number**: Nomor seri
- **Status**: Status aset
- **Total Cost**
- **Kelengkapan**: Kelengkapan dari aset
- **Condition**: Status kondisi dengan indikator warna
- **User Info**: Nama pemilik, posisi, dan cost center
- **User Organization**: Divisi dan department
- **Location**: Lokasi dan ruangan

#### **Color Coding Kondisi**:
- **Hijau**: Kondisi Baik
- **Merah**: Kondisi Rusak
- **Hitam**: Aset Hilang

### 9.3 CSV Export

#### **Fitur Export**:
- **Tombol "Download CSV"**: Export semua data
- **Comprehensive Data**: Semua field aset disertakan
- **Proper Escaping**: Data di-escape untuk Excel compatibility

### 9.4 BAP (Berita Acara Pemeriksaan)

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

## 10. Fitur Pencarian

### 10.1 Halaman Search

#### **Search Options**:
- 🔍 **Global Search**: Cari di seluruh database
- 📋 **Filter by Category**: Filter berdasarkan kategori aset
- 📍 **Filter by Location**: Filter berdasarkan site/region
- 👤 **Filter by Owner**: Filter berdasarkan pemilik

### 10.2 Advanced Filtering

#### **Category Filters**:
- Desktop Computer
- Laptop
- Handheld Device
- Network Equipment
- Other Equipment

#### **Location Hierarchy**:
- Region → Site Group → Site → Department

#### **Owner Department**:
- IT Services Department
- Finance & Accounting Department

---

## 11. Troubleshooting

### 11.1 Masalah Umum

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

#### **Problem**: File tidak ter-download
**Solusi**:
- ✅ Periksa browser popup blocker
- ✅ Periksa folder download
- ✅ Coba browser lain
- ✅ Disable ad-blocker sementara

### 11.2 Error Messages

#### **"Tidak ditemukan sesi opname"**
- Sesi expired atau tidak valid
- Mulai sesi opname baru

#### **"Masih ada asset yang belum diproses"**
- Ada aset dengan status pending
- Review semua aset sebelum finish

#### **"Gagal memuat data"**
- Masalah koneksi atau server
- Refresh halaman atau coba lagi nanti

### 11.3 Performance Tips

#### **Untuk Performa Optimal**:
- 🚀 Gunakan Chrome atau Edge
- 🚀 Tutup tab browser yang tidak perlu
- 🚀 Pastikan koneksi internet stabil
- 🚀 Update browser ke versi terbaru

#### **Untuk Mobile**:
- 📱 Gunakan mode landscape untuk opname
- 📱 Pastikan battery tidak low
- 📱 Gunakan WiFi jika available

### 11.4 Dukungan Teknis

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
