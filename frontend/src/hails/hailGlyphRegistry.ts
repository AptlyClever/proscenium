export type GlyphCatalogEntry = {
  glyph_id: string;
  label: string;
  status: "approved" | "draft" | "deprecated" | "future" | string;
  category?: string;
  fallback_emoji?: string;
  semantic_intent?: string;
  description?: string;
};

export function glyphCatalogById(catalog: GlyphCatalogEntry[] | undefined): Map<string, GlyphCatalogEntry> {
  const map = new Map<string, GlyphCatalogEntry>();
  for (const entry of catalog ?? []) {
    if (entry.glyph_id) {
      map.set(entry.glyph_id, entry);
    }
  }
  return map;
}

export function glyphChipName(glyphId: string, catalog: GlyphCatalogEntry[] | undefined): string {
  const entry = glyphCatalogById(catalog).get(glyphId);
  if (entry?.label) {
    return entry.label;
  }
  return glyphId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function glyphChipText(
  glyphId: string,
  catalog: GlyphCatalogEntry[] | undefined,
  customLabel?: string,
  customSemantic?: string,
): string {
  if (customLabel !== undefined) {
    return customSemantic?.trim() || "";
  }
  const entry = glyphCatalogById(catalog).get(glyphId);
  return entry?.description?.trim() || entry?.semantic_intent?.trim() || "";
}

export function glyphSelectorLabel(glyphId: string, catalog: GlyphCatalogEntry[] | undefined): string {
  const entry = glyphCatalogById(catalog).get(glyphId);
  if (!entry) {
    return glyphId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const status = entry.status && entry.status !== "approved" ? ` · ${entry.status}` : "";
  const emoji = entry.fallback_emoji ? ` ${entry.fallback_emoji}` : "";
  return `${entry.label}${emoji}${status}`;
}

export function glyphStatusBadgeClass(status: string | undefined): string {
  if (status === "draft") {
    return "rounded bg-[color:var(--ca-status-warning-fg)]/15 px-1 py-0.5 text-ca-2xs uppercase text-[color:var(--ca-status-warning-fg)]";
  }
  if (status === "deprecated") {
    return "rounded bg-[color:var(--ca-surface-border)] px-1 py-0.5 text-ca-2xs uppercase text-[color:var(--ca-text-muted)]";
  }
  if (status === "future") {
    return "rounded bg-[color:var(--ca-status-info-fg)]/15 px-1 py-0.5 text-ca-2xs uppercase text-[color:var(--ca-status-info-fg)]";
  }
  if (status === "archived" || status === "custom") {
    return "rounded bg-[color:var(--ca-surface-border)] px-1 py-0.5 text-ca-2xs uppercase text-[color:var(--ca-text-muted)]";
  }
  return "rounded bg-[color:var(--ca-status-success-fg)]/15 px-1 py-0.5 text-ca-2xs uppercase text-[color:var(--ca-status-success-fg)]";
}
