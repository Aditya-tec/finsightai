import { summarizeBulletsApi } from "./api";

export type ReportSectionLike = {
  title: string;
  body: string;
};

export function sectionKey(title: string): string {
  return title;
}

export async function ensureSectionBullets(
  section: ReportSectionLike,
  cache: Record<string, string[]>
): Promise<string[]> {
  const key = sectionKey(section.title);
  if (cache[key]?.length) return cache[key];

  const res = await summarizeBulletsApi({
    title: section.title,
    body: section.body,
  });
  return res.bullets;
}

export async function ensureAllBullets(
  sections: ReportSectionLike[],
  cache: Record<string, string[]>,
  onProgress?: (done: number, total: number) => void
): Promise<Record<string, string[]>> {
  const result = { ...cache };
  const total = sections.length;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const key = sectionKey(section.title);
    if (!result[key]?.length) {
      result[key] = await ensureSectionBullets(section, result);
    }
    onProgress?.(i + 1, total);
  }

  return result;
}

export function sectionsWithBullets(
  sections: Array<ReportSectionLike & { citations?: unknown[] }>,
  cache: Record<string, string[]>
): Array<{ title: string; body: string; bullets: string[]; citations: unknown[] }> {
  return sections.map((s) => ({
    title: s.title,
    body: s.body,
    bullets: cache[sectionKey(s.title)] ?? [],
    citations: s.citations ?? [],
  }));
}
