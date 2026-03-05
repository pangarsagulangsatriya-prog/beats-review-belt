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
      { label: "Kaleng thinner tanpa label di area penyimpanan bahan kimia", category: "Deviasi Prosedur", relevance: 82, reasoning: "Detected missing procedure compliance and unsafe chemical storage." },
      { label: "Bahan kimia tidak diamankan dengan baik", category: "Pengamanan", relevance: 65, reasoning: "Unlabeled chemicals pose security risk." },
      { label: "Thinner mudah terbakar tanpa penanganan", category: "Bahaya Kebakaran", relevance: 48, reasoning: "Thinner is flammable material." },
    ]),
    pspp: makeLabel("1. Deviasi Prosedur", 78, [
      { label: "Tidak memberi label pada bahan kimia sesuai prosedur", category: "Chemical Storage", relevance: 78, reasoning: "Non-compliance with labeling procedure." },
      { label: "Area penyimpanan tidak tertata rapi", category: "Housekeeping", relevance: 60, reasoning: "Poor material organization detected." },
      { label: "Bahan berbahaya tanpa pengamanan memadai", category: "Safety Compliance", relevance: 45, reasoning: "Unsecured hazardous materials." },
    ]),
    gr: makeLabel("1. Deviasi Prosedur", 75, [
      { label: "Prosedur penyimpanan bahan kimia tidak diikuti", category: "Deviasi Prosedur", relevance: 75, reasoning: "Procedure deviation in storage area." },
      { label: "Risiko kebakaran dari penyimpanan kimia", category: "Bahaya Kebakaran", relevance: 55, reasoning: "Fire hazard from chemical storage." },
      { label: "Area penyimpanan tidak terorganisir", category: "Housekeeping", relevance: 40, reasoning: "Storage area not well organized." },
    ]),
    status: "ai_pending", reporter: "Ahmad S.", sla_deadline: deadline(3),
  },
  {
    id: "7316406", timestamp: "2025-09-18 07:52", pic_perusahaan: "PT Serasi ...", site: "BMO 1",
    lokasi: pickLokasi(1),
    detail_location: "Office Cokelat", ketidaksesuaian: "DDP : Kelayakan da...", sub_ketidaksesuaian: "Tidak menggunakan ...",
    description: "Wilnat kurang 1 unit pada area kerja welding tanpa proteksi memadai.", image_url: img,
    tbc: makeLabel("10. Tools Tidak Layak", 62, [
      { label: "Peralatan welding tidak lengkap di area kerja", category: "Tools Tidak Layak", relevance: 62, reasoning: "Welding equipment missing proper tools." },
      { label: "Pekerja tanpa proteksi memadai", category: "Posisi Pekerja", relevance: 55, reasoning: "Worker positioned without adequate protection." },
      { label: "SOP APD tidak diikuti", category: "Deviasi Prosedur", relevance: 42, reasoning: "Procedure not followed for PPE." },
    ]),
    pspp: makeLabel("10. Tools Tidak Layak", 58, [
      { label: "Alat kerja welding tidak memenuhi standar", category: "Equipment Fitness", relevance: 58, reasoning: "Inadequate tooling in welding area." },
      { label: "Risiko paparan pekerja terdeteksi", category: "Worker Safety", relevance: 50, reasoning: "Worker exposure risk detected." },
      { label: "Barrier keselamatan tidak ada", category: "Safety Barrier", relevance: 38, reasoning: "Safety barrier missing." },
    ]),
    gr: makeLabel("10. Tools Tidak Layak", 64, [
      { label: "Kondisi alat di bawah standar kelayakan", category: "Tools Tidak Layak", relevance: 64, reasoning: "Tool condition below standard." },
      { label: "Prosedur pengecekan alat tidak dipatuhi", category: "Deviasi Prosedur", relevance: 48, reasoning: "Non-compliance with tool check procedure." },
      { label: "Risiko posisi pekerja", category: "Posisi Pekerja", relevance: 35, reasoning: "Worker position risk." },
    ]),
    status: "ai_pending", reporter: "Budi R.", sla_deadline: deadline(45),
  },
  {
    id: "7316563", timestamp: "2025-09-18 07:41", pic_perusahaan: "PT Pamapersad...", site: "BMO 2",
    lokasi: pickLokasi(2),
    detail_location: "Bays Champions", ketidaksesuaian: "Kelayakan/Penggun...", sub_ketidaksesuaian: "Kesesuaian ...",
    description: "Ditemukan Lock out tag out tidak terpasang dengan benar pada panel listrik.", image_url: img,
    tbc: makeLabel("7. LOTO", 91, [
      { label: "LOTO tidak terpasang dengan benar pada panel listrik", category: "LOTO", relevance: 91, reasoning: "LOTO device improperly installed on electrical panel." },
      { label: "Panel listrik terbuka tanpa pengaman", category: "Bahaya Elektrikal", relevance: 72, reasoning: "Electrical hazard from exposed panel." },
      { label: "Prosedur standar LOTO tidak diikuti", category: "Deviasi Prosedur", relevance: 55, reasoning: "Standard LOTO procedure not followed." },
    ]),
    pspp: makeLabel("7. LOTO", 88, [
      { label: "Kegagalan kepatuhan LOTO terdeteksi", category: "Lockout/Tagout", relevance: 88, reasoning: "LOTO compliance failure detected." },
      { label: "Risiko tersengat listrik", category: "Electrical Safety", relevance: 68, reasoning: "Risk of electrocution." },
      { label: "Kunci keselamatan tidak ada", category: "Safety Lock", relevance: 45, reasoning: "Safety lock missing." },
    ]),
    gr: makeLabel("7. LOTO", 85, [
      { label: "Ketidakpatuhan LOTO terkonfirmasi", category: "LOTO", relevance: 85, reasoning: "LOTO non-compliance confirmed." },
      { label: "Risiko keselamatan listrik", category: "Bahaya Elektrikal", relevance: 65, reasoning: "Electrical safety risk." },
      { label: "Deviasi prosedur terdeteksi", category: "Deviasi Prosedur", relevance: 50, reasoning: "Procedure deviation." },
    ]),
    status: "ai_pending", reporter: "Cahya M.", sla_deadline: deadline(95),
  },
  {
    id: "7316441", timestamp: "2025-09-18 07:33", pic_perusahaan: "PT Berau Coal", site: "BMO 2",
    lokasi: pickLokasi(3),
    detail_location: "Gudang Handa...", ketidaksesuaian: "Pengelolaan Sampah", sub_ketidaksesuaian: "[ENV] Sampah ...",
    description: "Sampah bertumpuk di area gudang tanpa penanganan sesuai SOP.", image_url: img,
    tbc: makeLabel("2. Housekeeping", 68, [
      { label: "Sampah menumpuk di area penyimpanan", category: "Housekeeping", relevance: 68, reasoning: "Waste accumulation detected in storage." },
      { label: "SOP pengelolaan limbah tidak diikuti", category: "Deviasi Prosedur", relevance: 55, reasoning: "SOP for waste management not followed." },
      { label: "Akses pekerja terhalang sampah", category: "Posisi Pekerja", relevance: 30, reasoning: "Worker access blocked by waste." },
    ]),
    pspp: makeLabel("2. Housekeeping", 65, [
      { label: "Housekeeping buruk di area gudang", category: "Warehouse Mgmt", relevance: 65, reasoning: "Poor housekeeping in warehouse." },
      { label: "Pelanggaran prosedur pembuangan limbah", category: "Waste Disposal", relevance: 52, reasoning: "Waste disposal procedure violation." },
      { label: "Risiko keamanan dari barang berantakan", category: "Security Risk", relevance: 35, reasoning: "Security risk from clutter." },
    ]),
    gr: makeLabel("2. Housekeeping", 60, [
      { label: "Standar housekeeping tidak terpenuhi", category: "Housekeeping", relevance: 60, reasoning: "Housekeeping standards not met." },
      { label: "Deviasi prosedur lingkungan", category: "Deviasi Prosedur", relevance: 48, reasoning: "Environmental procedure deviation." },
      { label: "Risiko kebakaran dari sampah menumpuk", category: "Bahaya Kebakaran", relevance: 32, reasoning: "Fire risk from accumulated waste." },
    ]),
    status: "ai_pending", reporter: "Dian P.", sla_deadline: deadline(8),
  },
  {
    id: "7316163", timestamp: "2025-09-18 07:20", pic_perusahaan: "PT Arcistec ...", site: "BMO 2",
    lokasi: pickLokasi(0),
    detail_location: "Sump/void", ketidaksesuaian: "Perlengkapan_Mesi...", sub_ketidaksesuaian: "Pelepasan komponen...",
    description: "Box battery tidak terpasang cover, kabel terbuka dan berpotensi short circuit.", image_url: img,
    tbc: makeLabel("11. Bahaya Elektrikal", 87, [
      { label: "Kabel terbuka dengan risiko short circuit", category: "Bahaya Elektrikal", relevance: 87, reasoning: "Exposed electrical cables with short circuit risk." },
      { label: "Cover box battery hilang", category: "Tools Tidak Layak", relevance: 62, reasoning: "Battery box cover missing." },
      { label: "Prosedur pemeliharaan tidak diikuti", category: "Deviasi Prosedur", relevance: 45, reasoning: "Maintenance procedure not followed." },
    ]),
    pspp: makeLabel("11. Bahaya Elektrikal", 84, [
      { label: "Bahaya listrik dari kabel terbuka", category: "Electrical Hazard", relevance: 84, reasoning: "Electrical hazard from exposed cables." },
      { label: "Kondisi peralatan di bawah standar", category: "Equipment Standard", relevance: 58, reasoning: "Equipment condition below standard." },
      { label: "Cover pengaman tidak ada", category: "Safety Cover", relevance: 40, reasoning: "Safety cover missing." },
    ]),
    gr: makeLabel("11. Bahaya Elektrikal", 80, [
      { label: "Risiko paparan tegangan tinggi", category: "Bahaya Elektrikal", relevance: 80, reasoning: "High voltage exposure risk." },
      { label: "Masalah integritas alat/peralatan", category: "Tools Tidak Layak", relevance: 55, reasoning: "Tool/equipment integrity issue." },
      { label: "Deviasi checklist pemeliharaan", category: "Deviasi Prosedur", relevance: 42, reasoning: "Maintenance checklist deviation." },
    ]),
    status: "ai_pending", reporter: "Eko W.", sla_deadline: deadline(72),
  },
  {
    id: "7316601", timestamp: "2025-09-18 07:11", pic_perusahaan: "PT Berau Coal", site: "LMO",
    lokasi: pickLokasi(1),
    detail_location: "Akses Masuk ...", ketidaksesuaian: "Kelengkapan tangg...", sub_ketidaksesuaian: "Alat Tanggap Darura...",
    description: "P2h unit dan alat tanggap darurat tidak lengkap di area loading.", image_url: img,
    tbc: makeLabel("15. Deviasi Lainnya", 55, [
      { label: "Alat tanggap darurat tidak lengkap", category: "Deviasi Lainnya", relevance: 55, reasoning: "Emergency equipment not complete." },
      { label: "Kesiapan keselamatan kurang", category: "Pengamanan", relevance: 50, reasoning: "Safety preparedness issue." },
      { label: "Checklist P2H tidak dilengkapi", category: "Deviasi Prosedur", relevance: 45, reasoning: "P2H checklist not completed." },
    ]),
    pspp: makeLabel("15. Deviasi Lainnya", 52, [
      { label: "Respons darurat tidak standar", category: "Emergency Response", relevance: 52, reasoning: "Non-standard emergency response." },
      { label: "Celah keamanan di area loading", category: "Loading Area Safety", relevance: 48, reasoning: "Security gap in loading area." },
      { label: "Deviasi pemeriksaan pra-operasi", category: "Pre-Op Check", relevance: 40, reasoning: "Pre-operation check deviation." },
    ]),
    gr: makeLabel("15. Deviasi Lainnya", 50, [
      { label: "Deviasi umum dalam kesiapan darurat", category: "Deviasi Lainnya", relevance: 50, reasoning: "General deviation in emergency prep." },
      { label: "Celah peralatan darurat", category: "Pengamanan", relevance: 46, reasoning: "Emergency equipment gap." },
      { label: "Celah kepatuhan prosedur", category: "Deviasi Prosedur", relevance: 38, reasoning: "Procedure compliance gap." },
    ]),
    status: "ai_pending", reporter: "Faisal K.", sla_deadline: deadline(25),
  },
  {
    id: "7315941", timestamp: "2025-09-18 06:55", pic_perusahaan: "PT Bukit Makmu...", site: "LMO",
    lokasi: pickLokasi(2),
    detail_location: "Area ...", ketidaksesuaian: "Perlengkapan_Mesi...", sub_ketidaksesuaian: "Penyesuaian/ ...",
    description: "Di temukan tyre aus melebihi batas pada unit HD785.", image_url: img,
    tbc: makeLabel("10. Tools Tidak Layak", 76, [
      { label: "Ban aus melebihi batas aman", category: "Tools Tidak Layak", relevance: 76, reasoning: "Tyre wear beyond safe limits." },
      { label: "Jadwal pemeliharaan tidak diikuti", category: "Deviasi Prosedur", relevance: 58, reasoning: "Maintenance schedule not followed." },
      { label: "Risiko keselamatan jalan dari ban aus", category: "Deviasi Road Safety", relevance: 52, reasoning: "Road safety risk from worn tyre." },
    ]),
    pspp: makeLabel("10. Tools Tidak Layak", 73, [
      { label: "Masalah kelayakan peralatan terdeteksi", category: "Equipment Fitness", relevance: 73, reasoning: "Equipment fitness issue." },
      { label: "Celah prosedur inspeksi", category: "Inspection Gap", relevance: 55, reasoning: "Inspection procedure gap." },
      { label: "Risiko keselamatan jalan hauling", category: "Haul Road Safety", relevance: 48, reasoning: "Haul road safety concern." },
    ]),
    gr: makeLabel("10. Tools Tidak Layak", 70, [
      { label: "Degradasi ban alat berat", category: "Tools Tidak Layak", relevance: 70, reasoning: "Heavy equipment tyre degradation." },
      { label: "Risiko keselamatan jalan", category: "Deviasi Road Safety", relevance: 52, reasoning: "Road safety risk." },
      { label: "Deviasi pemeliharaan", category: "Deviasi Prosedur", relevance: 45, reasoning: "Maintenance deviation." },
    ]),
    status: "ai_pending", reporter: "Gunawan T.", sla_deadline: deadline(110),
  },
  {
    id: "7316617", timestamp: "2025-09-18 06:40", pic_perusahaan: "PT Kaltim ...", site: "BMO 1",
    lokasi: pickLokasi(3),
    detail_location: "Red Zone Jalan ...", ketidaksesuaian: "Standar Road ...", sub_ketidaksesuaian: "Drainase tersumbat ...",
    description: "Windrow tersumbat material longsor, akses jalan hauling terganggu.", image_url: img,
    tbc: makeLabel("8. Deviasi Road Safety", 90, [
      { label: "Windrow tersumbat membuat bahaya jalan hauling", category: "Deviasi Road Safety", relevance: 90, reasoning: "Blocked windrow creating haul road hazard." },
      { label: "Material longsor terdeteksi", category: "Geotech & Geologi", relevance: 68, reasoning: "Landslide material detected." },
      { label: "Celah prosedur pemeliharaan jalan", category: "Deviasi Prosedur", relevance: 45, reasoning: "Road maintenance procedure gap." },
    ]),
    pspp: makeLabel("8. Deviasi Road Safety", 87, [
      { label: "Deviasi standar keselamatan jalan", category: "Road Safety Standard", relevance: 87, reasoning: "Road safety standard deviation." },
      { label: "Risiko ketidakstabilan geologis", category: "Geological Risk", relevance: 65, reasoning: "Geological instability risk." },
      { label: "Area jalan tidak terawat", category: "Road Maintenance", relevance: 40, reasoning: "Road area not maintained." },
    ]),
    gr: makeLabel("8. Deviasi Road Safety", 85, [
      { label: "Keselamatan jalan hauling terganggu", category: "Deviasi Road Safety", relevance: 85, reasoning: "Haul road safety compromised." },
      { label: "Masalah geoteknik menyebabkan sumbatan", category: "Geotech & Geologi", relevance: 62, reasoning: "Geotechnical issue contributing to blockage." },
      { label: "Deviasi standar pemeliharaan jalan", category: "Deviasi Prosedur", relevance: 42, reasoning: "Standard deviation in road maintenance." },
    ]),
    status: "ai_pending", reporter: "Hendra L.", sla_deadline: deadline(55),
  },
  {
    id: "7315805", timestamp: "2025-09-18 06:30", pic_perusahaan: "PT Bukit Makmu...", site: "BMO 2",
    lokasi: pickLokasi(0),
    detail_location: "(B7) Jl. Lavender", ketidaksesuaian: "Perawatan Jalan", sub_ketidaksesuaian: "Boulder",
    description: "Terdapat tumpahan material di jalan hauling tanpa warning sign.", image_url: img,
    tbc: makeLabel("9. Kesesuaian", 72, [
      { label: "Tumpahan material tanpa rambu peringatan", category: "Kesesuaian", relevance: 72, reasoning: "Material spillage without proper signage." },
      { label: "Risiko keselamatan jalan dari tumpahan", category: "Deviasi Road Safety", relevance: 66, reasoning: "Road safety risk from spilled material." },
      { label: "Area jalan tidak dibersihkan", category: "Housekeeping", relevance: 48, reasoning: "Road area not cleaned properly." },
    ]),
    pspp: makeLabel("9. Kesesuaian", 69, [
      { label: "Celah kepatuhan pemeliharaan jalan", category: "Road Compliance", relevance: 69, reasoning: "Compliance gap in road maintenance." },
      { label: "Bahaya jalan hauling terdeteksi", category: "Hauling Road Hazard", relevance: 62, reasoning: "Hauling road hazard detected." },
      { label: "Rambu peringatan tidak ada", category: "Warning Signs", relevance: 42, reasoning: "Missing warning signs." },
    ]),
    gr: makeLabel("9. Kesesuaian", 66, [
      { label: "Ketidaksesuaian dengan standar jalan", category: "Kesesuaian", relevance: 66, reasoning: "Non-conformance with road standards." },
      { label: "Deviasi keselamatan jalan", category: "Deviasi Road Safety", relevance: 60, reasoning: "Road safety deviation." },
      { label: "Kebersihan jalan tidak terjaga", category: "Housekeeping", relevance: 45, reasoning: "Road cleanliness not maintained." },
    ]),
    status: "ai_pending", reporter: "Irfan A.", sla_deadline: deadline(15),
  },
  {
    id: "7316608", timestamp: "2025-09-18 06:15", pic_perusahaan: "PT Multi Ardecon", site: "MARINE",
    lokasi: pickLokasi(1),
    detail_location: "INTAN MEGAH ...", ketidaksesuaian: "Bahaya Eletrikal", sub_ketidaksesuaian: "Pengamanan ...",
    description: "Kabel belum di rapikan dan berpotensi tersandung di area workshop.", image_url: img,
    tbc: makeLabel("11. Bahaya Elektrikal", 78, [
      { label: "Kabel terbuka membuat bahaya tersandung dan listrik", category: "Bahaya Elektrikal", relevance: 78, reasoning: "Exposed cables creating trip and electrical hazard." },
      { label: "Manajemen kabel buruk di workshop", category: "Housekeeping", relevance: 65, reasoning: "Cable management issue in workshop." },
      { label: "Bahaya keselamatan dari kabel longgar", category: "Pengamanan", relevance: 50, reasoning: "Safety hazard from loose cables." },
    ]),
    pspp: makeLabel("11. Bahaya Elektrikal", 74, [
      { label: "Risiko keselamatan kabel listrik", category: "Cable Safety", relevance: 74, reasoning: "Electrical cable safety risk." },
      { label: "Area workshop tidak terorganisir", category: "Workshop Mgmt", relevance: 62, reasoning: "Workshop area not organized." },
      { label: "Bahaya tersandung dari kabel", category: "Trip Hazard", relevance: 48, reasoning: "Trip hazard from cables." },
    ]),
    gr: makeLabel("11. Bahaya Elektrikal", 71, [
      { label: "Bahaya listrik di area workshop", category: "Bahaya Elektrikal", relevance: 71, reasoning: "Electrical hazard in workshop area." },
      { label: "Masalah housekeeping kabel", category: "Housekeeping", relevance: 58, reasoning: "Cable housekeeping issue." },
      { label: "Risiko keselamatan fisik", category: "Pengamanan", relevance: 44, reasoning: "Physical safety risk." },
    ]),
    status: "ai_pending", reporter: "Joko S.", sla_deadline: deadline(35),
  },
];
