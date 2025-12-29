// Fetch word pool via server API (uses service role safely server-side)
export async function getWordPool(language: string = 'en'): Promise<string[]> {
  const response = await fetch(`/api/word-pool?language=${encodeURIComponent(language)}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    console.error('[wordPool] Failed to fetch word pool:', response.status);
    return [];
  }

  const { words } = (await response.json()) as { words?: string[] };
  return words ?? [];
}

// No-op cache invalidation (kept for compatibility)
export function invalidateWordPoolCache() {
  // API route is uncached; nothing to invalidate
}
