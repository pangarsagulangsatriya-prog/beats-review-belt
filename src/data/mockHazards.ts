import { HazardTask, AILabel } from "@/types/hazard";

const img = "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=100&h=100&fit=crop";

function makeLabel(primary: string, relevance: number, candidates: { label: string; category?: string; relevance: number; reasoning: string }[]): AILabel {
  return {
    ai_label: primary,
    human_label: null,
    annotation_note: null,
    annotated_by: null,
    annotated_at: null,
    candidates,
    locked: false,
    auto_confirmed: false,
  };
}

function deadline(minutesFromNow: number): string {
  return new Date(Date.now() + minutesFromNow * 60000).toISOString();
}

const LOKASI_VALUES = ["Marine", "Office", "Workshop", "Warehouse"];
function pickLokasi(i: number) { return LOKASI_VALUES[i % LOKASI_VALUES.length]; }

export const mockHazards: HazardTask[] = [
  {
    id: "7316822", timestamp: "2025-09-18 08:14", pic_perusahaan: "PT Multi Ardecon", site: "BMO 2",
    lokasi: pickLokasi(0),
    detail_location: "Pembangunan ...", ketidaksesuaian: "Pembelian, ...", sub_ketidaksesuaian: "Penyimpanan bahan ...",
    description: "Kaleng Thiner ditemukan tanpa label di area penyimpanan bahan kimia.", image_url: img,
    tbc: makeLabel("1. Deviasi Prosedur", 82, [
      { label: "Kaleng thinner tanpa label di area penyimpanan bahan kimia", category: "Deviasi Prosedur", relevance: 82, reasoning: "Kaleng thinner tanpa label identifikasi ditemukan. Melanggar SOP penyimpanan bahan kimia. Perlu pemasangan label dan audit ulang area." },
      { label: "Bahan kimia tidak diamankan dengan baik", category: "Pengamanan", relevance: 65, reasoning: "Bahan kimia tanpa label berisiko salah penanganan. Tidak ada pengamanan khusus di lokasi. Rekomendasikan penambahan barrier dan signage." },
      { label: "Thinner mudah terbakar tanpa penanganan", category: "Bahaya Kebakaran", relevance: 48, reasoning: "Thinner adalah bahan mudah terbakar. Penyimpanan tanpa ventilasi memadai. Perlu APAR dan zona aman di sekitar penyimpanan." },
    ]),
    pspp: makeLabel("1. Deviasi Prosedur", 78, [
      { label: "Tidak memberi label pada bahan kimia sesuai prosedur", category: "Chemical Storage", relevance: 78, reasoning: "Label bahan kimia tidak terpasang sesuai prosedur. Risiko kontaminasi silang material. Tindakan korektif: labeling ulang seluruh kontainer." },
      { label: "Area penyimpanan tidak tertata rapi", category: "Housekeeping", relevance: 60, reasoning: "Material tidak terorganisir di rak penyimpanan. Akses darurat terhalang. Perlu penataan ulang sesuai standar housekeeping." },
      { label: "Bahan berbahaya tanpa pengamanan memadai", category: "Safety Compliance", relevance: 45, reasoning: "Bahan B3 tanpa secondary containment. Tidak ada MSDS terpampang. Perlu perbaikan sistem pengamanan bahan berbahaya." },
    ]),
    gr: makeLabel("1. Deviasi Prosedur", 75, [
      { label: "Prosedur penyimpanan bahan kimia tidak diikuti", category: "Deviasi Prosedur", relevance: 75, reasoning: "SOP penyimpanan kimia tidak dipatuhi. Tidak ada checklist inspeksi harian. Rekomendasikan training ulang petugas gudang." },
      { label: "Risiko kebakaran dari penyimpanan kimia", category: "Bahaya Kebakaran", relevance: 55, reasoning: "Bahan mudah terbakar dekat sumber panas. APAR terdekat belum dicek. Perlu evaluasi layout penyimpanan." },
      { label: "Area penyimpanan tidak terorganisir", category: "Housekeeping", relevance: 40, reasoning: "Barang campur tanpa pemisahan kategori. Jalur evakuasi sempit. Segera lakukan 5S di area gudang." },
    ]),
    status: "ai_pending", reporter: "Ahmad S.", sla_deadline: deadline(3),
  },
  {
    id: "7316406", timestamp: "2025-09-18 07:52", pic_perusahaan: "PT Serasi ...", site: "BMO 1",
    lokasi: pickLokasi(1),
    detail_location: "Office Cokelat", ketidaksesuaian: "DDP : Kelayakan da...", sub_ketidaksesuaian: "Tidak menggunakan ...",
    description: "Wilnat kurang 1 unit pada area kerja welding tanpa proteksi memadai.", image_url: img,
    tbc: makeLabel("10. Tools Tidak Layak", 62, [
      { label: "Peralatan welding tidak lengkap di area kerja", category: "Tools Tidak Layak", relevance: 62, reasoning: "Wilnat kurang 1 unit di area welding. Pekerja tetap bekerja tanpa alat lengkap. Hentikan pekerjaan sampai alat tersedia." },
      { label: "Pekerja tanpa proteksi memadai", category: "Posisi Pekerja", relevance: 55, reasoning: "APD welding tidak lengkap digunakan. Paparan percikan api langsung ke kulit. Pastikan APD sesuai JSA sebelum kerja." },
      { label: "SOP APD tidak diikuti", category: "Deviasi Prosedur", relevance: 42, reasoning: "Checklist APD tidak diisi sebelum kerja. Pengawas tidak melakukan verifikasi. Perlu enforcement prosedur APD." },
    ]),
    pspp: makeLabel("10. Tools Tidak Layak", 58, [
      { label: "Alat kerja welding tidak memenuhi standar", category: "Equipment Fitness", relevance: 58, reasoning: "Kondisi alat welding di bawah standar kelayakan. Inspeksi berkala tidak dilakukan. Segera lakukan pengecekan dan penggantian." },
      { label: "Risiko paparan pekerja terdeteksi", category: "Worker Safety", relevance: 50, reasoning: "Pekerja terpapar bahaya tanpa proteksi cukup. Area kerja tidak diberi barrier. Tambahkan welding screen dan ventilasi." },
      { label: "Barrier keselamatan tidak ada", category: "Safety Barrier", relevance: 38, reasoning: "Tidak ada pembatas di zona welding. Pekerja lain bisa terpapar UV. Pasang barrier dan rambu peringatan." },
    ]),
    gr: makeLabel("10. Tools Tidak Layak", 64, [
      { label: "Kondisi alat di bawah standar kelayakan", category: "Tools Tidak Layak", relevance: 64, reasoning: "Alat welding aus dan tidak dikalibrasi. Terakhir dicek lebih dari 3 bulan lalu. Jadwalkan rekalibrasi segera." },
      { label: "Prosedur pengecekan alat tidak dipatuhi", category: "Deviasi Prosedur", relevance: 48, reasoning: "Form pengecekan harian kosong. Tidak ada tanda tangan pengawas. Terapkan sistem checklist digital." },
      { label: "Risiko posisi pekerja", category: "Posisi Pekerja", relevance: 35, reasoning: "Pekerja berada di posisi rawan percikan. Jarak kerja terlalu dekat. Atur ulang layout area welding." },
    ]),
    status: "ai_pending", reporter: "Budi R.", sla_deadline: deadline(45),
  },
  {
    id: "7316563", timestamp: "2025-09-18 07:41", pic_perusahaan: "PT Pamapersad...", site: "BMO 2",
    lokasi: pickLokasi(2),
    detail_location: "Bays Champions", ketidaksesuaian: "Kelayakan/Penggun...", sub_ketidaksesuaian: "Kesesuaian ...",
    description: "Ditemukan Lock out tag out tidak terpasang dengan benar pada panel listrik.", image_url: img,
    tbc: makeLabel("7. LOTO", 91, [
      { label: "LOTO tidak terpasang dengan benar pada panel listrik", category: "LOTO", relevance: 91, reasoning: "Gembok LOTO terpasang longgar di panel utama. Tag identifikasi pekerja tidak ada. Hentikan kerja dan pasang ulang LOTO sesuai SOP." },
      { label: "Panel listrik terbuka tanpa pengaman", category: "Bahaya Elektrikal", relevance: 72, reasoning: "Cover panel terbuka saat LOTO aktif. Risiko kontak langsung dengan terminal. Pasang cover dan verifikasi isolasi energi." },
      { label: "Prosedur standar LOTO tidak diikuti", category: "Deviasi Prosedur", relevance: 55, reasoning: "Langkah LOTO tidak sesuai SOP 7 langkah. Pekerja tidak terlatih prosedur terbaru. Jadwalkan refresher training LOTO." },
    ]),
    pspp: makeLabel("7. LOTO", 88, [
      { label: "Kegagalan kepatuhan LOTO terdeteksi", category: "Lockout/Tagout", relevance: 88, reasoning: "Sistem LOTO tidak mengikuti standar perusahaan. Ditemukan saat inspeksi rutin. Eskalasi ke supervisor keselamatan." },
      { label: "Risiko tersengat listrik", category: "Electrical Safety", relevance: 68, reasoning: "Tegangan masih aktif saat LOTO dipasang. Pengukuran zero energy belum dilakukan. Lakukan pengujian voltage sebelum kerja." },
      { label: "Kunci keselamatan tidak ada", category: "Safety Lock", relevance: 45, reasoning: "Personal lock pekerja tidak digunakan. Hanya mengandalkan group lock. Setiap pekerja wajib punya personal lock." },
    ]),
    gr: makeLabel("7. LOTO", 85, [
      { label: "Ketidakpatuhan LOTO terkonfirmasi", category: "LOTO", relevance: 85, reasoning: "Prosedur LOTO dilanggar di panel listrik. Sudah terjadi 2x di lokasi sama. Perlu tindakan disipliner dan perbaikan sistem." },
      { label: "Risiko keselamatan listrik", category: "Bahaya Elektrikal", relevance: 65, reasoning: "Panel 380V tanpa proteksi memadai. Arc flash risk tinggi. Pasang label bahaya dan APD arc flash." },
      { label: "Deviasi prosedur terdeteksi", category: "Deviasi Prosedur", relevance: 50, reasoning: "SOP LOTO tidak diupdate 6 bulan. Versi lama masih digunakan lapangan. Distribusikan SOP terbaru ke semua tim." },
    ]),
    status: "ai_pending", reporter: "Cahya M.", sla_deadline: deadline(95),
  },
  {
    id: "7316441", timestamp: "2025-09-18 07:33", pic_perusahaan: "PT Berau Coal", site: "BMO 2",
    lokasi: pickLokasi(3),
    detail_location: "Gudang Handa...", ketidaksesuaian: "Pengelolaan Sampah", sub_ketidaksesuaian: "[ENV] Sampah ...",
    description: "Sampah bertumpuk di area gudang tanpa penanganan sesuai SOP.", image_url: img,
    tbc: makeLabel("2. Housekeeping", 68, [
      { label: "Sampah menumpuk di area penyimpanan", category: "Housekeeping", relevance: 68, reasoning: "Sampah organik dan anorganik bercampur di gudang. Tidak ada jadwal pembersihan rutin. Terapkan sistem 5S dan jadwal piket." },
      { label: "SOP pengelolaan limbah tidak diikuti", category: "Deviasi Prosedur", relevance: 55, reasoning: "Limbah B3 dicampur dengan limbah umum. Petugas tidak mengikuti prosedur segregasi. Lakukan training waste management." },
      { label: "Akses pekerja terhalang sampah", category: "Posisi Pekerja", relevance: 30, reasoning: "Jalur akses tertutup tumpukan sampah. Evakuasi darurat terhambat. Bersihkan jalur dan pasang marka lantai." },
    ]),
    pspp: makeLabel("2. Housekeeping", 65, [
      { label: "Housekeeping buruk di area gudang", category: "Warehouse Mgmt", relevance: 65, reasoning: "Standar kebersihan gudang tidak terpenuhi. Inspeksi terakhir menunjukkan skor rendah. Perlu program perbaikan berkelanjutan." },
      { label: "Pelanggaran prosedur pembuangan limbah", category: "Waste Disposal", relevance: 52, reasoning: "Tempat sampah tidak sesuai kode warna. Limbah dibuang sembarangan. Sediakan bin sesuai standar di setiap zona." },
      { label: "Risiko keamanan dari barang berantakan", category: "Security Risk", relevance: 35, reasoning: "Barang berserakan bisa jadi tempat sembunyi hewan. Risiko kecelakaan dari benda jatuh. Rapikan dan amankan barang." },
    ]),
    gr: makeLabel("2. Housekeeping", 60, [
      { label: "Standar housekeeping tidak terpenuhi", category: "Housekeeping", relevance: 60, reasoning: "Audit 5S menunjukkan skor merah. Area gudang belum pernah di-audit 3 bulan. Jadwalkan audit dan tindakan korektif." },
      { label: "Deviasi prosedur lingkungan", category: "Deviasi Prosedur", relevance: 48, reasoning: "Prosedur pengelolaan lingkungan tidak dipatuhi. Dokumen izin limbah belum diperbarui. Update dokumen dan sosialisasi ulang." },
      { label: "Risiko kebakaran dari sampah menumpuk", category: "Bahaya Kebakaran", relevance: 32, reasoning: "Sampah kering menumpuk dekat instalasi listrik. Tidak ada APAR di radius 10m. Segera bersihkan dan tambah APAR." },
    ]),
    status: "ai_pending", reporter: "Dian P.", sla_deadline: deadline(8),
  },
  {
    id: "7316163", timestamp: "2025-09-18 07:20", pic_perusahaan: "PT Arcistec ...", site: "BMO 2",
    lokasi: pickLokasi(0),
    detail_location: "Sump/void", ketidaksesuaian: "Perlengkapan_Mesi...", sub_ketidaksesuaian: "Pelepasan komponen...",
    description: "Box battery tidak terpasang cover, kabel terbuka dan berpotensi short circuit.", image_url: img,
    tbc: makeLabel("11. Bahaya Elektrikal", 87, [
      { label: "Kabel terbuka dengan risiko short circuit", category: "Bahaya Elektrikal", relevance: 87, reasoning: "Kabel power terbuka tanpa isolasi di box battery. Risiko short circuit dan kebakaran tinggi. Segera isolasi dan pasang cover." },
      { label: "Cover box battery hilang", category: "Tools Tidak Layak", relevance: 62, reasoning: "Cover pelindung box battery tidak terpasang. Terminal positif terekspos ke lingkungan. Ganti cover dan cek kondisi terminal." },
      { label: "Prosedur pemeliharaan tidak diikuti", category: "Deviasi Prosedur", relevance: 45, reasoning: "Checklist pemeliharaan battery tidak diisi. Jadwal pengecekan terlewat 2 minggu. Perbarui jadwal dan assigned PIC." },
    ]),
    pspp: makeLabel("11. Bahaya Elektrikal", 84, [
      { label: "Bahaya listrik dari kabel terbuka", category: "Electrical Hazard", relevance: 84, reasoning: "Kabel tanpa pelindung di area operasional. Potensi tersengat saat hujan meningkat. Pasang conduit dan grounding tambahan." },
      { label: "Kondisi peralatan di bawah standar", category: "Equipment Standard", relevance: 58, reasoning: "Battery box sudah korosi dan retak. Umur pakai melebihi batas rekomendasi. Ajukan penggantian unit baru." },
      { label: "Cover pengaman tidak ada", category: "Safety Cover", relevance: 40, reasoning: "Cover pengaman hilang sejak maintenance terakhir. Tidak ada pengganti sementara dipasang. Sediakan cover cadangan di gudang." },
    ]),
    gr: makeLabel("11. Bahaya Elektrikal", 80, [
      { label: "Risiko paparan tegangan tinggi", category: "Bahaya Elektrikal", relevance: 80, reasoning: "Tegangan 24V DC terekspos tanpa proteksi. Pekerja bisa kontak saat inspeksi rutin. Pasang guard dan label bahaya." },
      { label: "Masalah integritas alat/peralatan", category: "Tools Tidak Layak", relevance: 55, reasoning: "Komponen battery box sudah usang. Bracket penahan longgar dan berkarat. Lakukan penggantian komponen segera." },
      { label: "Deviasi checklist pemeliharaan", category: "Deviasi Prosedur", relevance: 42, reasoning: "Form P2H battery tidak pernah diisi. Mekanik tidak terlatih prosedur. Jadwalkan training dan update checklist." },
    ]),
    status: "ai_pending", reporter: "Eko W.", sla_deadline: deadline(72),
  },
  {
    id: "7316601", timestamp: "2025-09-18 07:11", pic_perusahaan: "PT Berau Coal", site: "LMO",
    lokasi: pickLokasi(1),
    detail_location: "Akses Masuk ...", ketidaksesuaian: "Kelengkapan tangg...", sub_ketidaksesuaian: "Alat Tanggap Darura...",
    description: "P2h unit dan alat tanggap darurat tidak lengkap di area loading.", image_url: img,
    tbc: makeLabel("15. Deviasi Lainnya", 55, [
      { label: "Alat tanggap darurat tidak lengkap", category: "Deviasi Lainnya", relevance: 55, reasoning: "APAR dan kotak P3K tidak tersedia di unit. P2H menunjukkan item emergency kosong. Lengkapi alat darurat sebelum unit beroperasi." },
      { label: "Kesiapan keselamatan kurang", category: "Pengamanan", relevance: 50, reasoning: "Unit beroperasi tanpa emergency kit lengkap. Potensi keterlambatan respons darurat. Sediakan kit standar di setiap unit." },
      { label: "Checklist P2H tidak dilengkapi", category: "Deviasi Prosedur", relevance: 45, reasoning: "Kolom emergency equipment pada P2H kosong. Operator tidak mengecek sebelum jalan. Terapkan verifikasi P2H oleh pengawas." },
    ]),
    pspp: makeLabel("15. Deviasi Lainnya", 52, [
      { label: "Respons darurat tidak standar", category: "Emergency Response", relevance: 52, reasoning: "Prosedur tanggap darurat tidak diikuti operator. Titik kumpul evakuasi tidak diketahui. Sosialisasi ulang prosedur ERP." },
      { label: "Celah keamanan di area loading", category: "Loading Area Safety", relevance: 48, reasoning: "Area loading tanpa rambu keselamatan memadai. Kendaraan masuk tanpa escort. Tambahkan signage dan atur traffic management." },
      { label: "Deviasi pemeriksaan pra-operasi", category: "Pre-Op Check", relevance: 40, reasoning: "Pre-use inspection tidak dilakukan operator. Form P2H diisi asal tanpa pengecekan fisik. Lakukan spot check oleh foreman." },
    ]),
    gr: makeLabel("15. Deviasi Lainnya", 50, [
      { label: "Deviasi umum dalam kesiapan darurat", category: "Deviasi Lainnya", relevance: 50, reasoning: "Kesiapan darurat unit di bawah standar minimum. Temuan serupa sudah 3x dalam sebulan. Eskalasi ke level management." },
      { label: "Celah peralatan darurat", category: "Pengamanan", relevance: 46, reasoning: "Stok APAR habis dan belum di-refill. P3K kadaluarsa belum diganti. Buat jadwal inspeksi bulanan alat darurat." },
      { label: "Celah kepatuhan prosedur", category: "Deviasi Prosedur", relevance: 38, reasoning: "Operator tidak paham prosedur terbaru. Training terakhir lebih dari 6 bulan. Jadwalkan refresher training wajib." },
    ]),
    status: "ai_pending", reporter: "Faisal K.", sla_deadline: deadline(25),
  },
  {
    id: "7315941", timestamp: "2025-09-18 06:55", pic_perusahaan: "PT Bukit Makmu...", site: "LMO",
    lokasi: pickLokasi(2),
    detail_location: "Area ...", ketidaksesuaian: "Perlengkapan_Mesi...", sub_ketidaksesuaian: "Penyesuaian/ ...",
    description: "Di temukan tyre aus melebihi batas pada unit HD785.", image_url: img,
    tbc: makeLabel("10. Tools Tidak Layak", 76, [
      { label: "Ban aus melebihi batas aman", category: "Tools Tidak Layak", relevance: 76, reasoning: "Kedalaman alur ban HD785 di bawah 5mm. Melebihi batas aus yang diizinkan. Ganti ban dan stop operasi unit." },
      { label: "Jadwal pemeliharaan tidak diikuti", category: "Deviasi Prosedur", relevance: 58, reasoning: "Penggantian ban terjadwal sudah terlewat 2 minggu. Tidak ada work order penggantian. Buat WO darurat dan eskalasi ke planner." },
      { label: "Risiko keselamatan jalan dari ban aus", category: "Deviasi Road Safety", relevance: 52, reasoning: "Ban aus mengurangi traksi di jalan hauling. Risiko tergelincir saat hujan tinggi. Batasi kecepatan unit sampai ban diganti." },
    ]),
    pspp: makeLabel("10. Tools Tidak Layak", 73, [
      { label: "Masalah kelayakan peralatan terdeteksi", category: "Equipment Fitness", relevance: 73, reasoning: "Kondisi ban tidak layak untuk operasi normal. Inspeksi visual menunjukkan keretakan sidewall. Tarik unit dari operasi untuk perbaikan." },
      { label: "Celah prosedur inspeksi", category: "Inspection Gap", relevance: 55, reasoning: "Inspeksi ban rutin tidak tercatat di logbook. Interval pengecekan tidak konsisten. Terapkan digital inspection system." },
      { label: "Risiko keselamatan jalan hauling", category: "Haul Road Safety", relevance: 48, reasoning: "Unit dengan ban aus beroperasi di grade >8%. Jarak pengereman bertambah signifikan. Batasi unit ke rute flat saja." },
    ]),
    gr: makeLabel("10. Tools Tidak Layak", 70, [
      { label: "Degradasi ban alat berat", category: "Tools Tidak Layak", relevance: 70, reasoning: "Tread depth ban sudah kritis di semua posisi. Potensi blowout saat beban penuh. Prioritaskan penggantian dalam 24 jam." },
      { label: "Risiko keselamatan jalan", category: "Deviasi Road Safety", relevance: 52, reasoning: "Kondisi ban mempengaruhi stabilitas unit. Risiko meningkat di tikungan dan turunan. Pasang speed limiter sementara." },
      { label: "Deviasi pemeliharaan", category: "Deviasi Prosedur", relevance: 45, reasoning: "PM schedule ban tidak diupdate di sistem. Data historis penggantian hilang. Perbaiki sistem tracking maintenance." },
    ]),
    status: "ai_pending", reporter: "Gunawan T.", sla_deadline: deadline(110),
  },
  {
    id: "7316617", timestamp: "2025-09-18 06:40", pic_perusahaan: "PT Kaltim ...", site: "BMO 1",
    lokasi: pickLokasi(3),
    detail_location: "Red Zone Jalan ...", ketidaksesuaian: "Standar Road ...", sub_ketidaksesuaian: "Drainase tersumbat ...",
    description: "Windrow tersumbat material longsor, akses jalan hauling terganggu.", image_url: img,
    tbc: makeLabel("8. Deviasi Road Safety", 90, [
      { label: "Windrow tersumbat membuat bahaya jalan hauling", category: "Deviasi Road Safety", relevance: 90, reasoning: "Windrow tersumbat material longsor sepanjang 50m. Akses jalan hauling menyempit drastis. Kerahkan dozer untuk pembersihan segera." },
      { label: "Material longsor terdeteksi", category: "Geotech & Geologi", relevance: 68, reasoning: "Longsoran dari lereng potong di sisi jalan. Kondisi tanah jenuh air setelah hujan. Evaluasi stabilitas lereng dan pasang perkuatan." },
      { label: "Celah prosedur pemeliharaan jalan", category: "Deviasi Prosedur", relevance: 45, reasoning: "Inspeksi jalan harian tidak mendeteksi masalah. Laporan kondisi jalan tidak diupdate. Tingkatkan frekuensi patroli jalan." },
    ]),
    pspp: makeLabel("8. Deviasi Road Safety", 87, [
      { label: "Deviasi standar keselamatan jalan", category: "Road Safety Standard", relevance: 87, reasoning: "Lebar jalan efektif berkurang 40% dari standar. Kendaraan tidak bisa berpapasan dengan aman. Buat jalur satu arah sementara." },
      { label: "Risiko ketidakstabilan geologis", category: "Geological Risk", relevance: 65, reasoning: "Formasi batuan di area longsor tidak stabil. Potensi longsor susulan masih ada. Pasang monitoring geoteknik dan warning system." },
      { label: "Area jalan tidak terawat", category: "Road Maintenance", relevance: 40, reasoning: "Drainase jalan tersumbat material longsor. Genangan air memperburuk kondisi. Bersihkan drainase dan perbaiki cross-fall." },
    ]),
    gr: makeLabel("8. Deviasi Road Safety", 85, [
      { label: "Keselamatan jalan hauling terganggu", category: "Deviasi Road Safety", relevance: 85, reasoning: "Jalan hauling utama terganggu akibat sumbatan. Produktivitas hauling turun 30%. Buka jalur alternatif dan percepat perbaikan." },
      { label: "Masalah geoteknik menyebabkan sumbatan", category: "Geotech & Geologi", relevance: 62, reasoning: "Material longsor mengandung lempung sensitif. Risiko pergerakan tanah lanjutan. Konsultasikan dengan ahli geoteknik." },
      { label: "Deviasi standar pemeliharaan jalan", category: "Deviasi Prosedur", relevance: 42, reasoning: "Standar pemeliharaan jalan tidak dipatuhi tim. Checklist inspeksi jalan tidak lengkap. Review dan update SOP pemeliharaan jalan." },
    ]),
    status: "ai_pending", reporter: "Hendra L.", sla_deadline: deadline(55),
  },
  {
    id: "7315805", timestamp: "2025-09-18 06:30", pic_perusahaan: "PT Bukit Makmu...", site: "BMO 2",
    lokasi: pickLokasi(0),
    detail_location: "(B7) Jl. Lavender", ketidaksesuaian: "Perawatan Jalan", sub_ketidaksesuaian: "Boulder",
    description: "Terdapat tumpahan material di jalan hauling tanpa warning sign.", image_url: img,
    tbc: makeLabel("9. Kesesuaian", 72, [
      { label: "Tumpahan material tanpa rambu peringatan", category: "Kesesuaian", relevance: 72, reasoning: "Material tumpah di badan jalan hauling tanpa tanda. Kendaraan melintas tanpa peringatan bahaya. Pasang rambu dan bersihkan tumpahan segera." },
      { label: "Risiko keselamatan jalan dari tumpahan", category: "Deviasi Road Safety", relevance: 66, reasoning: "Tumpahan membuat permukaan jalan licin. Risiko tergelincir untuk HD dan LV. Taburi material anti-slip dan bersihkan." },
      { label: "Area jalan tidak dibersihkan", category: "Housekeeping", relevance: 48, reasoning: "Pembersihan jalan rutin tidak dilakukan. Tumpahan sudah ada lebih dari 1 shift. Tegur tim maintenance jalan dan bersihkan." },
    ]),
    pspp: makeLabel("9. Kesesuaian", 69, [
      { label: "Celah kepatuhan pemeliharaan jalan", category: "Road Compliance", relevance: 69, reasoning: "Standar pemeliharaan jalan tidak terpenuhi. Inspeksi berkala menemukan banyak deviasi. Perbaiki sistem monitoring kondisi jalan." },
      { label: "Bahaya jalan hauling terdeteksi", category: "Hauling Road Hazard", relevance: 62, reasoning: "Boulder dan material lepas di jalur hauling. Kecepatan kendaraan tidak dikurangi. Pasang speed bump dan warning sign." },
      { label: "Rambu peringatan tidak ada", category: "Warning Signs", relevance: 42, reasoning: "Tidak ada rambu di titik bahaya tumpahan. Signage standar tidak tersedia di gudang. Pesan dan pasang rambu sesuai standar." },
    ]),
    gr: makeLabel("9. Kesesuaian", 66, [
      { label: "Ketidaksesuaian dengan standar jalan", category: "Kesesuaian", relevance: 66, reasoning: "Kondisi jalan tidak sesuai standar operasi. Super elevation dan cross-fall tidak memenuhi spec. Lakukan perbaikan grading segera." },
      { label: "Deviasi keselamatan jalan", category: "Deviasi Road Safety", relevance: 60, reasoning: "Beberapa titik bahaya belum ditandai. Riwayat insiden di lokasi serupa ada. Tambahkan barrier dan reflector di titik rawan." },
      { label: "Kebersihan jalan tidak terjaga", category: "Housekeeping", relevance: 45, reasoning: "Material lepas tersebar di jalan hauling. Jadwal pembersihan jalan tidak dijalankan. Assign grader untuk pembersihan rutin." },
    ]),
    status: "ai_pending", reporter: "Irfan A.", sla_deadline: deadline(15),
  },
  {
    id: "7316608", timestamp: "2025-09-18 06:15", pic_perusahaan: "PT Multi Ardecon", site: "MARINE",
    lokasi: pickLokasi(1),
    detail_location: "INTAN MEGAH ...", ketidaksesuaian: "Bahaya Eletrikal", sub_ketidaksesuaian: "Pengamanan ...",
    description: "Kabel belum di rapikan dan berpotensi tersandung di area workshop.", image_url: img,
    tbc: makeLabel("11. Bahaya Elektrikal", 78, [
      { label: "Kabel terbuka membuat bahaya tersandung dan listrik", category: "Bahaya Elektrikal", relevance: 78, reasoning: "Kabel listrik berserakan di lantai workshop. Risiko tersandung dan tersengat bersamaan. Rapikan kabel dan pasang cable tray." },
      { label: "Manajemen kabel buruk di workshop", category: "Housekeeping", relevance: 65, reasoning: "Kabel tidak tertata sesuai standar workshop. Sulit membedakan kabel aktif dan mati. Beri label dan kelompokkan kabel per fungsi." },
      { label: "Bahaya keselamatan dari kabel longgar", category: "Pengamanan", relevance: 50, reasoning: "Kabel longgar bisa tertarik alat berat. Konektor bisa lepas dan menimbulkan arc. Amankan semua kabel dengan clamp dan protector." },
    ]),
    pspp: makeLabel("11. Bahaya Elektrikal", 74, [
      { label: "Risiko keselamatan kabel listrik", category: "Cable Safety", relevance: 74, reasoning: "Isolasi kabel sudah mengelupas di beberapa titik. Terpapar cairan workshop dan oli. Ganti kabel rusak dan pasang pelindung." },
      { label: "Area workshop tidak terorganisir", category: "Workshop Mgmt", relevance: 62, reasoning: "Layout workshop tidak mendukung keselamatan kerja. Alat dan kabel bercampur di lantai. Redesign layout sesuai standar 5S." },
      { label: "Bahaya tersandung dari kabel", category: "Trip Hazard", relevance: 48, reasoning: "Kabel melintang di jalur pejalan kaki. Sudah ada 1 insiden tersandung bulan ini. Pasang cable cover di semua crossing point." },
    ]),
    gr: makeLabel("11. Bahaya Elektrikal", 71, [
      { label: "Bahaya listrik di area workshop", category: "Bahaya Elektrikal", relevance: 71, reasoning: "Instalasi listrik workshop tidak sesuai standar. Grounding beberapa outlet rusak. Lakukan audit instalasi listrik menyeluruh." },
      { label: "Masalah housekeeping kabel", category: "Housekeeping", relevance: 58, reasoning: "Kabel berserakan menunjukkan housekeeping buruk. Area kerja terlihat tidak aman dan tidak rapi. Terapkan daily cleaning checklist." },
      { label: "Risiko keselamatan fisik", category: "Pengamanan", relevance: 44, reasoning: "Pekerja berisiko cedera dari kabel tidak tertata. Jalur evakuasi terhalang kabel. Bersihkan jalur dan pasang emergency route sign." },
    ]),
    status: "ai_pending", reporter: "Joko S.", sla_deadline: deadline(35),
  },
];
