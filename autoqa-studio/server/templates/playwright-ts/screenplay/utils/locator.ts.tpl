import { Locator, Page } from '@playwright/test';
type Cand = { css?: string; xpath?: string; fallbacks?: string[] };
export async function getLocator(page: Page, cand: Cand): Promise<Locator> {
  const tries = [cand?.css, cand?.xpath, ...(cand?.fallbacks || [])].filter(Boolean) as string[];
  for (const sel of tries) {
    try {
      const loc = page.locator(sel);
      if (await loc.first().count()) {
        return loc.first();
      }
    } catch {}
  }
  throw new Error('No locator matched');
}
