/**
 * Levenshtein distance between two strings.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Given a query and a list of candidate strings, return the best fuzzy matches.
 * Returns candidates sorted by distance, filtered to max distance threshold.
 */
export function fuzzyMatch(
  query: string,
  candidates: string[],
  maxDistance = 3,
  maxResults = 5
): { text: string; distance: number }[] {
  const q = query.toLowerCase();
  const results: { text: string; distance: number }[] = [];

  for (const candidate of candidates) {
    const c = candidate.toLowerCase();
    // Check each word in the candidate (strip punctuation)
    const words = c.split(/\s+/).map(w => w.replace(/[^a-z0-9]/g, "")).filter(w => w.length > 0);
    let bestDist = Infinity;
    for (const word of words) {
      const d = levenshtein(q.replace(/[^a-z0-9]/g, ""), word);
      if (d < bestDist) bestDist = d;
    }
    // Also check if query is a substring-ish match (partial word)
    if (bestDist <= maxDistance) {
      results.push({ text: candidate, distance: bestDist });
    }
  }

  results.sort((a, b) => a.distance - b.distance);
  return results.slice(0, maxResults);
}

/**
 * Extract the best "did you mean" suggestion from candidates.
 * Returns the closest unique word that differs from the query.
 */
export function didYouMean(
  query: string,
  candidates: string[],
  maxDistance = 3
): string | null {
  const q = query.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (q.length < 3) return null;
  const wordSet = new Set<string>();

  for (const c of candidates) {
    for (const rawWord of c.toLowerCase().split(/\s+/)) {
      const word = rawWord.replace(/[^a-z0-9]/g, "");
      if (word.length >= 3) wordSet.add(word);
    }
  }

  let bestWord: string | null = null;
  let bestDist = Infinity;

  for (const word of wordSet) {
    if (word === q) continue;
    const d = levenshtein(q, word);
    if (d > 0 && d <= maxDistance && d < bestDist) {
      bestDist = d;
      bestWord = word;
    }
  }

  return bestWord;
}
