import { format, subDays, startOfDay } from "date-fns";

export interface DailyRecapLabel {
  name: string;
  count: number;
  percentage: number;
}

export interface DailyRecap {
  date: string; // ISO string
  total: number;
  humanAnnotated: number;
  finalByAI: number;
  tbc: DailyRecapLabel[];
  gr: DailyRecapLabel[];
  pspp: DailyRecapLabel[];
}

const labelsTBC = ["Deviasi Prosedur", "Housekeeping", "Road Safety", "Tools Tidak Layak", "Lainnya"];
const labelsGR = ["Geotech", "Posisi Pekerja", "LOTO", "Elektrikal", "Lainnya"];
const labelsPSPP = ["Kebakaran", "Technology", "Deviasi Lainnya", "Housekeeping"];

const generateMockLabels = (labels: string[], total: number): DailyRecapLabel[] => {
  let remaining = total;
  return labels.map((name, i) => {
    const count = i === labels.length - 1 ? remaining : Math.floor(Math.random() * (remaining / 1.5));
    remaining -= count;
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return { name, count, percentage };
  }).sort((a, b) => b.count - a.count);
};

export const mockDailyRecaps: DailyRecap[] = Array.from({ length: 30 }).map((_, i) => {
  const date = subDays(startOfDay(new Date()), i);
  const total = Math.floor(Math.random() * 100) + 50;
  const humanAnnotated = Math.floor(total * (Math.random() * 0.4 + 0.3));
  const finalByAI = total - humanAnnotated;
  
  const tbcTotal = Math.floor(total * 0.6);
  const grTotal = Math.floor(total * 0.25);
  const psppTotal = total - tbcTotal - grTotal;

  return {
    date: date.toISOString(),
    total,
    humanAnnotated,
    finalByAI,
    tbc: generateMockLabels(labelsTBC, tbcTotal),
    gr: generateMockLabels(labelsGR, grTotal),
    pspp: generateMockLabels(labelsPSPP, psppTotal),
  };
});
