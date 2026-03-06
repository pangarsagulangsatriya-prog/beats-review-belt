/** Condense a long reasoning string into ≤3 short bullet points */
export function summarizeReasoning(reasoning: string): string[] {
  if (!reasoning) return [];
  // Split by sentence-ending punctuation or period-space
  const sentences = reasoning
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (sentences.length <= 3) {
    return sentences.map(s => s.length > 80 ? s.slice(0, 77) + "…" : s);
  }

  // Take first, a middle, and last sentence, truncated
  const pick = [sentences[0], sentences[Math.floor(sentences.length / 2)], sentences[sentences.length - 1]];
  return pick.map(s => s.length > 80 ? s.slice(0, 77) + "…" : s);
}

export interface AICandidate {
  label: string;
  category?: string;
  relevance: number; // 0-100
  reasoning: string;
}

/** Get primary/secondary text for a candidate based on field type */
export function getCandidateLines(
  candidate: AICandidate,
  fieldType: "tbc" | "pspp" | "gr"
): { primary: string; secondary: string | null } {
  if (fieldType === "pspp") {
    return {
      primary: candidate.label,
      secondary: candidate.category || null,
    };
  }
  // GR and TBC: category first, label second
  return {
    primary: candidate.category || candidate.label,
    secondary: candidate.category ? candidate.label : null,
  };
}

export interface AILabel {
  ai_label: string | null;
  human_label: string | null;
  annotation_note: string | null;
  annotated_by: string | null;
  annotated_at: string | null;
  candidates: AICandidate[];
  locked: boolean;
  auto_confirmed: boolean;
}

export type EvaluationStatus = "ai_pending" | "in_progress" | "human_locked" | "auto_confirmed" | "completed";

export interface HazardTask {
  id: string;
  timestamp: string;
  pic_perusahaan: string;
  pic_name: string;
  site: string;
  lokasi: string;
  detail_location: string;
  ketidaksesuaian: string;
  sub_ketidaksesuaian: string;
  description: string;
  image_url: string;
  tbc: AILabel;
  pspp: AILabel;
  gr: AILabel;
  status: EvaluationStatus;
  reporter?: string;
  final_justification?: string;
  submitted_at?: string;
  submitted_by?: string;
  sla_deadline: string; // ISO date string, 48h from creation
}

export const TBC_OPTIONS = [
  "1. Deviasi Prosedur",
  "2. Housekeeping",
  "3. Geotech & Geologi",
  "4. Posisi Pekerja",
  "5. Deviasi Prosedur",
  "6. Pengamanan",
  "7. LOTO",
  "8. Deviasi Road Safety",
  "9. Kesesuaian",
  "10. Tools Tidak Layak",
  "11. Bahaya Elektrikal",
  "12. Bahaya Kebakaran",
  "13. Aktivitas Drilling",
  "14. Technology",
  "15. Deviasi Lainnya",
];

export const PSPP_OPTIONS = TBC_OPTIONS;
export const GR_OPTIONS = TBC_OPTIONS;
