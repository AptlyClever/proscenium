import { useQuery } from "@tanstack/react-query";
import { composerValidateGlyphHero, type ComposerGlyphSpec } from "../api";

function heroQualityQueryKey(spec: ComposerGlyphSpec | null | undefined): string | null {
  if (!spec?.glyph_id?.startsWith("custom-") || !spec.procedural_graph) {
    return null;
  }
  const graph = spec.procedural_graph;
  const signature =
    typeof graph.signature === "string" && graph.signature
      ? graph.signature
      : JSON.stringify(graph.paths ?? []);
  return `${spec.glyph_id}:${signature}:${spec.visual?.effect_id ?? ""}:${spec.visual?.palette_id ?? ""}`;
}

export function useGlyphHeroQuality(
  spec: ComposerGlyphSpec | null | undefined,
  peerGlyphs: ComposerGlyphSpec[] = [],
) {
  const queryKey = heroQualityQueryKey(spec);
  const peerKey = peerGlyphs
    .filter((g) => g.archived !== true)
    .map((g) => g.glyph_id)
    .sort()
    .join(",");
  const query = useQuery({
    queryKey: ["glyph-hero-quality", queryKey, peerKey],
    queryFn: () =>
      composerValidateGlyphHero({
        ...spec!,
        peer_glyphs: peerGlyphs.filter((g) => g.archived !== true && g.glyph_id !== spec?.glyph_id),
      }),
    enabled: queryKey != null,
    staleTime: 2_000,
  });

  const heroErrors = query.data?.valid === false ? query.data.errors.map((e) => e.message) : [];

  return {
    heroErrors,
    heroValid: query.data?.valid === true,
    heroValidating: query.isFetching && queryKey != null,
    heroQualityReady: query.data != null || queryKey == null,
  };
}
