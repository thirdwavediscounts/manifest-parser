/**
 * Filename utility functions for smart title truncation.
 *
 * Provides functions to optimize auction listing titles for filenames:
 * - Abbreviate common retail/category words
 * - Truncate at word boundaries (never mid-word)
 * - Deduplicate repeated category words in multi-category titles
 * - Smart truncation combining all optimizations
 */

/**
 * Map of common words to their abbreviations.
 * Used for shortening verbose auction listing titles.
 */
const ABBREVIATION_MAP: Record<string, string> = {
  accessories: 'Acc',
  electronics: 'Elec',
  appliances: 'Appl',
  computer: 'Comp',
  technology: 'Tech',
  hardware: 'HW',
  software: 'SW',
  furniture: 'Furn',
  equipment: 'Equip',
  warehouse: 'WH',
  household: 'HH',
};

/**
 * Abbreviates common retail/category words in a title.
 * Case-insensitive matching, preserves first letter case of abbreviation.
 *
 * @param title - The title to abbreviate
 * @returns Title with common words abbreviated
 *
 * @example
 * abbreviateCommonWords('PC Gaming Accessories') // 'PC Gaming Acc'
 * abbreviateCommonWords('Electronics & Appliances') // 'Elec & Appl'
 */
export function abbreviateCommonWords(title: string): string {
  if (!title) return '';

  // Build regex pattern for all abbreviatable words
  const pattern = new RegExp(
    `\\b(${Object.keys(ABBREVIATION_MAP).join('|')})\\b`,
    'gi'
  );

  return title.replace(pattern, (match) => {
    const abbrev = ABBREVIATION_MAP[match.toLowerCase()];
    return abbrev;
  });
}

/**
 * Truncates a title at a word boundary (dash-separated for filenames).
 * Never cuts mid-word; returns the longest prefix that ends at a word boundary.
 *
 * @param title - The title to truncate (dash-separated words)
 * @param maxLen - Maximum allowed length
 * @returns Truncated title at word boundary, never exceeding maxLen
 *
 * @example
 * truncateAtWordBoundary('Electronics-And-More', 15) // 'Electronics-And'
 * truncateAtWordBoundary('Electronics-And-More', 14) // 'Electronics'
 */
export function truncateAtWordBoundary(title: string, maxLen: number): string {
  if (!title || maxLen <= 0) return '';
  if (title.length <= maxLen) return title;

  // Find the last dash that would fit within maxLen
  const truncated = title.substring(0, maxLen);
  const lastDash = truncated.lastIndexOf('-');

  // If no dash found, we have a single word longer than maxLen
  // In this case, we must hard-truncate
  if (lastDash === -1) {
    return truncated;
  }

  // Check if cutting at maxLen lands exactly at word end
  // (i.e., next char would be a dash or we're at exact end)
  if (title.length === maxLen || title[maxLen] === '-') {
    return truncated;
  }

  // Otherwise, truncate at last dash
  return title.substring(0, lastDash);
}

/**
 * Optimizes multi-category titles by removing duplicate category words.
 * Keeps the last occurrence abbreviated.
 *
 * @param title - The title with potential category duplication
 * @returns Optimized title with deduplicated category words
 *
 * @example
 * optimizeMultiCategory('PC Gaming Accessories & Tablet Accessories')
 * // 'PC Gaming & Tablet Acc'
 */
export function optimizeMultiCategory(title: string): string {
  if (!title || !title.includes('&')) return title;

  // Split by ' & ' to get category segments
  const segments = title.split(/\s*&\s*/);
  if (segments.length < 2) return title;

  // Find words that appear in multiple segments (potential category words)
  const wordCounts: Record<string, number> = {};

  for (const segment of segments) {
    const words = segment.split(/\s+/);
    for (const word of words) {
      const lower = word.toLowerCase();
      wordCounts[lower] = (wordCounts[lower] || 0) + 1;
    }
  }

  // Find duplicated words that appear in multiple segments
  const duplicatedWords = Object.keys(wordCounts).filter(
    (word) => wordCounts[word] > 1 && word.length > 2
  );

  if (duplicatedWords.length === 0) return title;

  // For each duplicated word, remove from all segments except the last
  // and abbreviate in the last segment
  let result = title;

  for (const dupWord of duplicatedWords) {
    // Create pattern to match the word (case-insensitive)
    const wordPattern = new RegExp(`\\b${dupWord}\\b`, 'gi');

    // Find all matches and their positions
    const matches: { index: number; match: string }[] = [];
    let match: RegExpExecArray | null;
    while ((match = wordPattern.exec(result)) !== null) {
      matches.push({ index: match.index, match: match[0] });
    }

    if (matches.length > 1) {
      // Remove all but the last occurrence
      // Process from end to start to preserve indices
      const lastIndex = matches.length - 1;
      for (let i = lastIndex - 1; i >= 0; i--) {
        const m = matches[i];
        // Remove the word and any trailing/leading space
        const before = result.substring(0, m.index);
        const after = result.substring(m.index + m.match.length);

        // Clean up spaces
        result = (before.trimEnd() + ' ' + after.trimStart()).replace(
          /\s+/g,
          ' '
        );
      }

      // Abbreviate the last occurrence if it's in the abbreviation map
      const abbrev = ABBREVIATION_MAP[dupWord.toLowerCase()];
      if (abbrev) {
        result = result.replace(
          new RegExp(`\\b${dupWord}\\b`, 'gi'),
          abbrev
        );
      }
    }
  }

  return result.trim();
}

/**
 * Smart truncation combining all optimizations for filename-safe titles.
 *
 * Pipeline: optimize multi-category -> abbreviate -> convert spaces to dashes -> truncate at word boundary
 *
 * @param title - The original title
 * @param maxLen - Maximum allowed length
 * @returns Optimized, filename-safe title not exceeding maxLen
 *
 * @example
 * smartTruncateTitle('PC Gaming Accessories & Tablet Accessories', 30)
 * // 'PC-Gaming-&-Tablet-Acc'
 */
export function smartTruncateTitle(title: string, maxLen: number): string {
  if (!title || maxLen <= 0) return '';

  // Step 1: Optimize multi-category titles (deduplicate)
  let result = optimizeMultiCategory(title);

  // Step 2: Abbreviate common words
  result = abbreviateCommonWords(result);

  // Step 3: Convert spaces to dashes for filename compatibility
  result = result.replace(/\s+/g, '-');

  // Step 4: Truncate at word boundary if needed
  result = truncateAtWordBoundary(result, maxLen);

  return result;
}
