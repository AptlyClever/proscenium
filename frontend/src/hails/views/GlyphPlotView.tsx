import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchGlyphPlotFixture, fetchGlyphPlotFixtures, type GlyphPlotFixtureDetail } from "../../api";
import { GlyphPlotEditor } from "../components/glyph-plot/GlyphPlotEditor";
import { GlyphPlotImportControl } from "../components/glyph-plot/GlyphPlotImportControl";
import { GlyphPlotRetraceControl } from "../components/glyph-plot/GlyphPlotRetraceControl";
import { HailConsumerGlyph } from "../hailConsumerGlyph";
import { parseGlyphRender, type GlyphRenderPayload } from "../hailConsumerRender";
import { HailProceduralGlyph, isProceduralGraph, type ProceduralGraph } from "../hailProceduralGlyphs";
import { RouteSurfaceHeader } from "../../components/RouteSurfaceHeader";
import { PageTemplate } from "../../components/PageTemplate";
import { SurfaceRegion } from "../../axiomSurfacePageTemplate";

/** Logical dp on the 48×48 glyph grid; display px on screen (thumbnail uses magnification). */
const PANELS = [
  { id: "canonical", label: "48px canonical", logicalPx: 48, displayPx: 48, consumer: "canonical" as const },
  { id: "tv48", label: "48px TV delivery", logicalPx: 48, displayPx: 48, consumer: "tv" as const },
  { id: "delivery", label: "96px TV delivery", logicalPx: 48, displayPx: 96, consumer: "tv" as const },
  {
    id: "thumbnail",
    label: "24px TV thumbnail (P1)",
    logicalPx: 24,
    displayPx: 192,
    magnify: 8,
    emphasize: true,
    consumer: "tv" as const,
  },
] as const;

function resolvePanelRender(
  fixture: GlyphPlotFixtureDetail,
  consumer: "canonical" | "tv" | "authored",
): GlyphRenderPayload | null {
  if (consumer === "canonical") {
    return parseGlyphRender(fixture.glyph_render_canonical);
  }
  if (consumer === "tv") {
    return parseGlyphRender(fixture.glyph_render_tv);
  }
  const graph = fixture.procedural_graph;
  if (!isProceduralGraph(graph)) {
    return null;
  }
  return {
    kind: "procedural",
    glyph_id: fixture.glyph_id ?? "custom-plot",
    procedural_graph: graph,
    google_tv_deliverable: true,
    representation: "canonical",
  };
}

function PlotGlyphAtScale({
  glyphRender,
  authoredGraph,
  displayPx,
  logicalPx = displayPx,
  magnify = 1,
  useConsumer = true,
}: {
  glyphRender: GlyphRenderPayload | null;
  authoredGraph?: ProceduralGraph | null;
  displayPx: number;
  logicalPx?: number;
  magnify?: number;
  useConsumer?: boolean;
}) {
  const inner = useConsumer && glyphRender ? (
    <HailConsumerGlyph
      glyphRender={glyphRender}
      glyphId={glyphRender.glyph_id}
      paletteId="axiom_dark_cyan"
      className="block h-full w-full"
      bare
      focusGlyph
      regionFill
    />
  ) : authoredGraph ? (
    <HailProceduralGlyph graph={authoredGraph} paletteId="axiom_dark_cyan" className="block h-full w-full" />
  ) : null;

  if (magnify > 1) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width: displayPx, height: displayPx }}
        data-glyph-plot-display-px={displayPx}
        data-glyph-plot-logical-px={logicalPx}
        data-glyph-plot-magnify={magnify}
      >
        <div
          className="[image-rendering:pixelated] [image-rendering:crisp-edges]"
          style={{
            width: logicalPx,
            height: logicalPx,
            transform: `scale(${magnify})`,
            transformOrigin: "center center",
          }}
        >
          {inner}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: displayPx, height: displayPx }} data-glyph-plot-display-px={displayPx}>
      {inner}
    </div>
  );
}

function PlotPanel({
  label,
  sublabel,
  fixture,
  consumer,
  displayPx,
  logicalPx,
  magnify,
  emphasize,
}: {
  label: string;
  sublabel?: string;
  fixture: GlyphPlotFixtureDetail;
  consumer: "canonical" | "tv" | "authored";
  displayPx: number;
  logicalPx?: number;
  magnify?: number;
  emphasize?: boolean;
}) {
  const glyphRender = resolvePanelRender(fixture, consumer);
  const authoredGraph = isProceduralGraph(fixture.procedural_graph) ? fixture.procedural_graph : null;

  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-lg border p-4 ${
        emphasize
          ? "border-[color:var(--ca-brand-400)] bg-[color:var(--ca-surface-muted)]/40"
          : "border-[color:var(--ca-surface-border)] bg-[color:var(--ca-fill-inset)]"
      }`}
      data-glyph-plot-panel={label}
      data-glyph-plot-consumer={consumer}
    >
      <div className="text-center">
        <span className="block text-ca-2xs font-medium uppercase tracking-wide text-[color:var(--ca-text-muted)]">
          {label}
        </span>
        {sublabel ? (
          <span className="mt-0.5 block text-ca-2xs text-[color:var(--ca-text-muted)]">{sublabel}</span>
        ) : null}
      </div>
      <div className="flex min-h-[12rem] items-center justify-center rounded-md bg-[color:var(--ca-bg)] p-4">
        <PlotGlyphAtScale
          glyphRender={glyphRender}
          authoredGraph={authoredGraph}
          displayPx={displayPx}
          logicalPx={logicalPx}
          magnify={magnify}
          useConsumer={consumer !== "authored"}
        />
      </div>
    </div>
  );
}

function PlotVerifyBadge({ fixture }: { fixture: GlyphPlotFixtureDetail }) {
  const ok = fixture.verify.valid;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-ca-2xs font-semibold ${
        ok
          ? "bg-[color:var(--ca-status-success-muted)] text-[color:var(--ca-status-success-fg)]"
          : "bg-[color:var(--ca-status-error-muted)] text-[color:var(--ca-status-error-fg)]"
      }`}
      data-glyph-plot-verify={ok ? "pass" : "fail"}
    >
      Plot gate {ok ? "pass" : "fail"}
    </span>
  );
}

export function GlyphPlotView({ plotId = "custom-combadge-plot", edit = false }: { plotId?: string; edit?: boolean }) {
  const list = useQuery({ queryKey: ["glyph-plot-fixtures"], queryFn: fetchGlyphPlotFixtures });
  const detail = useQuery({
    queryKey: ["glyph-plot-fixture", plotId],
    queryFn: () => fetchGlyphPlotFixture(plotId),
    enabled: Boolean(plotId),
  });

  const graph = useMemo((): ProceduralGraph | null => {
    const raw = detail.data?.procedural_graph;
    return isProceduralGraph(raw) ? raw : null;
  }, [detail.data]);

  const advancedEdit =
    edit &&
    typeof window !== "undefined" &&
    (window.location.hash.includes("advanced=1") || window.location.search.includes("advanced=1"));

  if (edit && !advancedEdit && detail.data && graph) {
    return (
      <PageTemplate
        className="mx-auto max-w-4xl space-y-6 p-4"
        templateId="axiom.surface.v001"
        state="ready"
        data-glyph-plot-view
      >
        <div
          className="rounded-lg border border-[color:var(--ca-brand-400)]/50 bg-[color:var(--ca-brand-600)]/10 p-4"
          data-glyph-plot-edit-redirect-notice
        >
          <p className="text-ca-sm font-semibold text-[color:var(--ca-text-primary)]">
            Plot editor is optional — not required for P1
          </p>
          <p className="mt-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
            You landed on the manual path editor. For P1, use the judgment page below. The combadge is already loaded;
            answer whether the 24px TV thumbnail reads as a combadge.
          </p>
          <a
            href={`#/hails/plot/${encodeURIComponent(plotId)}`}
            className="ca-focusable mt-3 inline-flex rounded-md bg-[color:var(--ca-brand-600)] px-4 py-2 text-ca-sm font-medium text-[color:var(--ca-on-brand)]"
          >
            Go to P1 judgment page
          </a>
        </div>
        <GlyphPlotView plotId={plotId} edit={false} />
      </PageTemplate>
    );
  }

  if (edit && advancedEdit && detail.data && graph) {
    return <GlyphPlotEditor plotId={plotId} fixture={detail.data} graph={graph} />;
  }

  return (
    <PageTemplate
      className="mx-auto max-w-4xl space-y-6 p-4"
      templateId="axiom.surface.v001"
      state="ready"
      data-glyph-plot-view
    >
      <RouteSurfaceHeader
        hash="#/hails/plot"
        fallbackTitle="Plot before deliver"
        fallbackLead="Validate glyph subjects at judgment scale inside Axiom — consumer TV path for P1."
        regionId="ownership_summary"
      />

      <SurfaceRegion regionId="page_content" as="div" className="space-y-6">
      <section className="ca-panel space-y-3 p-4" data-glyph-plot-p1-instructions data-page-template-region="operator_p1_instructions">
        <h2 className="text-ca-sm font-semibold text-[color:var(--ca-text-primary)]">P1 operator check</h2>
        <p className="text-ca-sm text-[color:var(--ca-text-secondary)]">
          Look at the highlighted <strong>24px TV thumbnail</strong> panel (8× magnification, TV projected). Without
          reading labels: does it read as a <strong>combadge</strong>? Reply in chat: yes or no.
        </p>
        {plotId === "custom-combadge-plot" ? (
          <GlyphPlotRetraceControl plotId={plotId} />
        ) : null}
        <details className="rounded-md border border-[color:var(--ca-surface-border)] p-3 text-ca-sm">
          <summary className="cursor-pointer font-medium text-[color:var(--ca-text-secondary)]">
            Advanced — upload replacement SVG (optional)
          </summary>
          {plotId ? (
            <div className="mt-3" data-glyph-plot-import-section>
              <GlyphPlotImportControl plotId={plotId} compact />
            </div>
          ) : null}
        </details>
      </section>

      {list.isLoading ? (
        <p className="text-ca-sm text-[color:var(--ca-text-muted)]">Loading plot fixtures…</p>
      ) : null}

      <div className="flex flex-wrap gap-2" data-glyph-plot-fixture-picker data-page-template-region="fixture_picker">
        {(list.data?.fixtures ?? []).map((row) => (
          <a
            key={row.plot_id}
            href={`#/hails/plot/${encodeURIComponent(row.plot_id)}`}
            className={`rounded-md border px-3 py-1.5 text-ca-sm ${
              row.plot_id === plotId
                ? "border-[color:var(--ca-brand-400)] text-[color:var(--ca-text-primary)]"
                : "border-[color:var(--ca-surface-border)] text-[color:var(--ca-text-secondary)] hover:border-[color:var(--ca-brand-400)]"
            }`}
          >
            {row.label ?? row.plot_id}
          </a>
        ))}
      </div>

      {detail.isLoading ? <p className="text-ca-sm text-[color:var(--ca-text-muted)]">Loading fixture…</p> : null}
      {detail.error ? (
        <p className="text-ca-sm text-[color:var(--ca-status-error-fg)]">Could not load plot fixture.</p>
      ) : null}

      {detail.data && graph ? (
        <section className="space-y-4" data-glyph-plot-detail>
          <div
            className="flex flex-wrap items-center gap-3"
            data-page-template-region="plot_gate_status"
          >
            <h2 className="text-ca-base font-semibold text-[color:var(--ca-text-primary)]">
              {detail.data.label ?? detail.data.plot_id}
            </h2>
            <PlotVerifyBadge fixture={detail.data} />
            <span className="text-ca-2xs text-[color:var(--ca-text-muted)]">
              subject: {detail.data.subject_phrase} · longest edge {detail.data.verify.longest_edge_dp}dp
              {detail.data.recipe_id ? ` · recipe ${detail.data.recipe_id}` : ""}
            </span>
          </div>

          {!detail.data.verify.valid ? (
            <ul className="list-disc space-y-1 pl-5 text-ca-sm text-[color:var(--ca-status-error-fg)]">
              {[...detail.data.verify.heuristic_errors, ...detail.data.verify.metric_errors].map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          ) : null}

          <div className="space-y-4" data-page-template-region="judgment_scale_panels">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PANELS.filter((p) => p.id !== "thumbnail").map((panel) => (
                <PlotPanel
                  key={panel.id}
                  label={panel.label}
                  fixture={detail.data}
                  consumer={panel.consumer}
                  displayPx={panel.displayPx}
                  logicalPx={panel.logicalPx}
                  magnify={1}
                />
              ))}
            </div>

            {PANELS.filter((p) => p.id === "thumbnail").map((panel) => (
              <div key={panel.id} className="grid gap-4 lg:grid-cols-2" data-glyph-plot-p1-row>
                <PlotPanel
                  label={panel.label}
                  sublabel="24dp logical · TV projected · 8× display"
                  fixture={detail.data}
                  consumer={panel.consumer}
                  displayPx={panel.displayPx}
                  logicalPx={panel.logicalPx}
                  magnify={panel.magnify}
                  emphasize
                />
                {detail.data.reference_url ? (
                  <div
                    className="flex flex-col items-center gap-2 rounded-lg border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-fill-inset)] p-4"
                    data-glyph-plot-reference-panel
                  >
                    <div className="text-center">
                      <span className="block text-ca-2xs font-medium uppercase tracking-wide text-[color:var(--ca-text-muted)]">
                        Reference
                      </span>
                      <span className="mt-0.5 block text-ca-2xs text-[color:var(--ca-text-muted)]">
                        Operator photo · not rendered ink
                      </span>
                    </div>
                    <div className="flex min-h-[12rem] items-center justify-center rounded-md bg-[color:var(--ca-bg)] p-4">
                      <img
                        src={detail.data.reference_url}
                        alt="TNG combadge reference"
                        className="max-h-48 max-w-full object-contain"
                        data-glyph-plot-reference-image
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <p className="text-ca-2xs text-[color:var(--ca-text-muted)]">
            API: <code className="ca-code-surface px-1">GET /api/hails/glyph-plot/fixtures/{detail.data.plot_id}</code>
            · TV panels use <code className="ca-code-surface px-1">glyph_render_tv</code> (Google TV projection)
          </p>
        </section>
      ) : null}
      </SurfaceRegion>
    </PageTemplate>
  );
}
