import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { fetchGlyphPlotFixture, putGlyphPlotFixture, type GlyphPlotFixtureDetail } from "../../../api";
import { GlyphPlotImportControl } from "./GlyphPlotImportControl";
import { HailConsumerGlyph } from "../../hailConsumerGlyph";
import { parseGlyphRender } from "../../hailConsumerRender";
import { HailProceduralGlyph, type ProceduralGraph, type ProceduralPathSpec } from "../../hailProceduralGlyphs";

const ROLES = ["mass", "accent", "ground"] as const;

type EditablePath = ProceduralPathSpec & { role?: string };

function cloneGraph(graph: ProceduralGraph): ProceduralGraph {
  return {
    ...graph,
    paths: graph.paths.map((row) => ({ ...row })),
    circles: graph.circles?.map((row) => ({ ...row })),
  };
}

export function GlyphPlotEditor({
  plotId,
  fixture,
  graph: initialGraph,
}: {
  plotId: string;
  fixture: GlyphPlotFixtureDetail;
  graph: ProceduralGraph;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ProceduralGraph>(() => cloneGraph(initialGraph));
  const [fixtureState, setFixtureState] = useState(fixture);
  const [showReference, setShowReference] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: () =>
      putGlyphPlotFixture(plotId, {
        ...fixtureState,
        procedural_graph: draft,
      }),
    onSuccess: (data) => {
      setFixtureState(data);
      queryClient.setQueryData(["glyph-plot-fixture", plotId], data);
      queryClient.invalidateQueries({ queryKey: ["glyph-plot-fixtures"] });
      setMessage("Saved — plot gate re-run on server.");
    },
    onError: (err: Error) => {
      setMessage(err.message || "Save failed");
    },
  });

  const updatePath = useCallback((index: number, patch: Partial<EditablePath>) => {
    setDraft((prev) => {
      const next = cloneGraph(prev);
      next.paths[index] = { ...next.paths[index], ...patch };
      return next;
    });
  }, []);

  const previewFixture = useMemo(
    (): GlyphPlotFixtureDetail => ({
      ...fixtureState,
      procedural_graph: draft,
    }),
    [draft, fixtureState],
  );

  const tvRender = parseGlyphRender(previewFixture.glyph_render_tv);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4" data-glyph-plot-editor>
      <header className="space-y-2">
        <p className="text-ca-2xs font-semibold uppercase tracking-wide text-[color:var(--ca-text-muted)]">
          Plot editor — advanced only
        </p>
        <h1 className="text-xl font-bold text-[color:var(--ca-text-primary)]">
          {fixtureState.label ?? plotId}
        </h1>
        <div
          className="rounded-md border border-[color:var(--ca-status-warning-fg)]/40 bg-[color:var(--ca-status-warning-muted)] p-3 text-ca-sm text-[color:var(--ca-text-secondary)]"
          data-glyph-plot-editor-warning
        >
          <strong className="text-[color:var(--ca-text-primary)]">You probably do not need this page.</strong> P1 is
          answered on{" "}
          <a
            href={`#/axiom/hails/plot/${encodeURIComponent(plotId)}`}
            className="text-[color:var(--ca-brand-400)] underline-offset-2 hover:underline"
          >
            plot proof
          </a>
          . The combadge is already traced and rendered — no Inkscape, no path editing required.
        </div>
        <div className="flex flex-wrap items-start gap-4">
          <GlyphPlotImportControl
            plotId={plotId}
            compact
            onImported={() => {
              void queryClient.fetchQuery({
                queryKey: ["glyph-plot-fixture", plotId],
                queryFn: () => fetchGlyphPlotFixture(plotId),
              }).then((data) => {
                setFixtureState(data);
                const g = data.procedural_graph;
                if (g && typeof g === "object") {
                  setDraft(cloneGraph(g as ProceduralGraph));
                }
              });
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`#/axiom/hails/plot/${encodeURIComponent(plotId)}`}
            className="rounded-md border border-[color:var(--ca-surface-border)] px-3 py-1.5 text-ca-sm"
          >
            Back to judgment
          </a>
          <button
            type="button"
            className="ca-focusable rounded-md bg-[color:var(--ca-brand-600)] px-4 py-2 text-ca-sm font-medium text-[color:var(--ca-on-brand)] disabled:opacity-50"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            data-glyph-plot-save
          >
            {saveMutation.isPending ? "Saving…" : "Save fixture"}
          </button>
          <label className="flex items-center gap-2 text-ca-sm text-[color:var(--ca-text-secondary)]">
            <input
              type="checkbox"
              checked={showReference}
              onChange={(e) => setShowReference(e.target.checked)}
            />
            Reference overlay
          </label>
        </div>
        {message ? <p className="text-ca-sm text-[color:var(--ca-text-muted)]">{message}</p> : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="ca-panel space-y-4 p-4">
          <h2 className="text-ca-sm font-semibold">Canvas preview</h2>
          <div
            className="relative mx-auto aspect-square w-full max-w-xs rounded-md bg-[color:var(--ca-bg)]"
            data-glyph-plot-canvas
          >
            {showReference && fixtureState.reference_url ? (
              <img
                src={fixtureState.reference_url}
                alt=""
                className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-25"
                aria-hidden
              />
            ) : null}
            <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full">
              {[...Array(49)].map((_, i) => (
                <g key={`grid-${i}`} opacity={0.12}>
                  <line x1={i} y1={0} x2={i} y2={48} stroke="currentColor" strokeWidth={0.15} />
                  <line x1={0} y1={i} x2={48} y2={i} stroke="currentColor" strokeWidth={0.15} />
                </g>
              ))}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center p-2">
              <HailProceduralGlyph graph={draft} paletteId="axiom_dark_cyan" className="h-full w-full" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-ca-2xs text-[color:var(--ca-text-muted)]">24px TV (8×)</p>
              <div
                className="mt-1 flex h-48 w-48 items-center justify-center [image-rendering:pixelated]"
                data-glyph-plot-editor-tv-thumb
              >
                <div style={{ width: 24, height: 24, transform: "scale(8)", transformOrigin: "center" }}>
                  {tvRender ? (
                    <HailConsumerGlyph
                      glyphRender={tvRender}
                      glyphId={tvRender.glyph_id}
                      paletteId="axiom_dark_cyan"
                      className="block h-full w-full"
                      bare
                      focusGlyph
                      regionFill
                    />
                  ) : (
                    <HailProceduralGlyph graph={draft} paletteId="axiom_dark_cyan" className="h-full w-full" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ca-panel space-y-4 p-4">
          <details className="space-y-4">
            <summary className="cursor-pointer text-ca-sm font-semibold text-[color:var(--ca-text-secondary)]">
              Raw path data ({draft.paths.length}) — dev only
            </summary>
            {draft.paths.map((path, index) => (
              <div key={`path-${index}`} className="space-y-2 rounded-md border border-[color:var(--ca-surface-border)] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-ca-2xs text-[color:var(--ca-text-muted)]">
                  Role
                  <select
                    className="ca-input ml-2 text-ca-sm"
                    value={(path as EditablePath).role ?? ROLES[index] ?? "mass"}
                    onChange={(e) => updatePath(index, { role: e.target.value })}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-ca-2xs text-[color:var(--ca-text-muted)]">
                  Stroke
                  <input
                    type="number"
                    step="0.05"
                    min="2"
                    max="4"
                    className="ca-input ml-2 w-16 text-ca-sm"
                    value={path.stroke_width ?? 2.5}
                    onChange={(e) => updatePath(index, { stroke_width: Number(e.target.value) })}
                  />
                </label>
                <label className="text-ca-2xs text-[color:var(--ca-text-muted)]">
                  Fill
                  <select
                    className="ca-input ml-2 text-ca-sm"
                    value={path.fill ?? "none"}
                    onChange={(e) => updatePath(index, { fill: e.target.value })}
                  >
                    <option value="none">none</option>
                    <option value="currentColor">currentColor</option>
                  </select>
                </label>
              </div>
              <label className="block text-ca-2xs text-[color:var(--ca-text-muted)]">
                Path d
                <textarea
                  className="ca-input mt-1 w-full font-mono text-ca-xs"
                  rows={4}
                  value={path.d}
                  onChange={(e) => updatePath(index, { d: e.target.value })}
                />
              </label>
            </div>
          ))}
          </details>
        </div>
      </div>
    </div>
  );
}
