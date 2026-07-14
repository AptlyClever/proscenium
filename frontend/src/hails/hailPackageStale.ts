/** B7 — saved package vs live Forge/composer component drift. */

export function hailHasStaleComponents(hail: Record<string, unknown> | null | undefined): boolean {
  return hail?.stale_components === true;
}

export function staleComponentsMessage(hail: Record<string, unknown> | null | undefined): string {
  if (!hailHasStaleComponents(hail)) {
    return "";
  }
  return "Forge or presentation changed since last Save — re-Save to refresh frozen layout and catalog.";
}
