import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

export default async function globalTeardown() {
  const root = resolve(import.meta.dirname, '..', '..');
  await Promise.allSettled([
    rm(resolve(root, 'data/e2e-playwright.db'), { force: true }),
    rm(resolve(root, 'data/e2e-playwright.db-journal'), { force: true }),
  ]);
}
