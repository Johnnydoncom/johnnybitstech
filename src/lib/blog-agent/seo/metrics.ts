import { normalizeKeyword } from "../tools/types";

/** Rough English syllable count (vowel groups, silent trailing e, minimum 1). */
export function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const trimmed = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  return Math.max(1, (trimmed.match(/[aeiouy]{1,2}/g) ?? []).length);
}

export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“(₦$])/)
    .map((s) => s.trim())
    .filter((s) => /[\p{L}\p{N}]/u.test(s));
}

function words(text: string): string[] {
  return text.split(/\s+/u).filter((t) => /[\p{L}\p{N}]/u.test(t));
}

/** Flesch reading ease (0–100+, higher is easier; 60–70 is plain English). */
export function fleschReadingEase(text: string): number {
  const w = words(text);
  const s = Math.max(1, sentences(text).length);
  if (w.length === 0) return 0;
  const syl = w.reduce((n, word) => n + syllables(word), 0);
  return Math.round((206.835 - 1.015 * (w.length / s) - 84.6 * (syl / w.length)) * 10) / 10;
}

/** Share of words taken up by exact (normalised) occurrences of the keyword phrase, in percent. */
export function keywordDensity(text: string, keyword: string): { occurrences: number; densityPercent: number } {
  const phrase = normalizeKeyword(keyword).split(" ").filter(Boolean);
  const tokens = normalizeKeyword(text).split(" ").filter(Boolean);
  if (!phrase.length || !tokens.length) return { occurrences: 0, densityPercent: 0 };
  let occurrences = 0;
  for (let i = 0; i + phrase.length <= tokens.length; i++) {
    if (phrase.every((p, j) => tokens[i + j] === p)) occurrences++;
  }
  return { occurrences, densityPercent: Math.round(((occurrences * phrase.length) / tokens.length) * 1000) / 10 };
}

/** True when every word of the keyword (ignoring stop words) appears in the text. */
export function containsKeyword(text: string, keyword: string): boolean {
  const stop = new Set(["a", "an", "the", "in", "of", "for", "to", "and", "on", "how", "what", "is", "does", "much", "do"]);
  const have = new Set(normalizeKeyword(text).split(" "));
  return normalizeKeyword(keyword).split(" ").filter((w) => !stop.has(w)).every((w) => have.has(w));
}

export const LIMITS = {
  metaTitle: { min: 20, max: 60 },
  metaDescription: { min: 120, max: 160 },
  keywordDensity: { warnBelow: 0.3, warnAbove: 2.5, failAbove: 3.5 },
  fleschWarnBelow: 45,
};
