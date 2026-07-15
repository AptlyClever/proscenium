import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  acceptGlyphWorkbenchCandidate,
  archiveGlyphWorkbenchBrief,
  clearGlyphWorkbenchCandidate,
  createGlyphWorkbenchBrief,
  fetchGlyphGenerationWorkbench,
  promoteGlyphWorkbenchCandidate,
  promoteStagedGlyphAsset,
  putGlyphWorkbenchBrief,
  putGlyphWorkbenchCandidate,
  rejectGlyphWorkbenchCandidate,
  type GlyphWorkbenchBrief,
  type GlyphWorkbenchCandidateSlot,
} from "../../api";
import { RouteSurfaceHeader } from "../../components/RouteSurfaceHeader";
import { AxiomSurfacePage, SurfaceRegion } from "../../axiomSurfacePageTemplate";
import { FrozenPlotNotice } from "../components/FrozenPlotNotice";
import { glyphSelectorLabel, type GlyphCatalogEntry } from "../hailGlyphRegistry";

const BRIEF_STATUSES = [
  "draft",
  "ready_for_generation",
  "generated",
  "reviewed",
  "rejected",
  "promoted",
  "archived",
] as const;

const CANDIDATE_STATUSES = ["empty", "staged", "accepted", "rejected"] as const;
const ASSET_KINDS = ["svg", "png", "webp"] as const;
const ASSET_SOURCES = ["manual_import", "external_generation", "unknown"] as const;
const STAGED_PREFIX = "staged/glyphs/";

function registryGlyphToCatalog(entry: Record<string, unknown>): GlyphCatalogEntry {
  return {
    glyph_id: String(entry.glyph_id ?? ""),
    label: String(entry.label ?? entry.glyph_id ?? ""),
    status: String(entry.status ?? "draft"),
    category: String(entry.category ?? ""),
    fallback_emoji: String(entry.fallback_emoji ?? ""),
    semantic_intent: String(entry.semantic_intent ?? ""),
    description: String(entry.description ?? ""),
  };
}

export function GlyphGenerationWorkbenchView() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["glyph-generation-workbench"], queryFn: fetchGlyphGenerationWorkbench });
  const [selectedBriefId, setSelectedBriefId] = useState<string | null>(null);
  const [newGlyphId, setNewGlyphId] = useState("default");

  const briefs = useMemo(
    () => (q.data?.briefs ?? []).filter((b) => b.status !== "archived" && b.archived !== true),
    [q.data],
  );
  const allBriefs = q.data?.briefs ?? [];
  const registryGlyphs = q.data?.registry_glyphs ?? [];
  const glyphCatalog = useMemo(() => registryGlyphs.map(registryGlyphToCatalog), [registryGlyphs]);

  const selectedBrief = useMemo(
    () => allBriefs.find((b) => b.brief_id === selectedBriefId) ?? briefs[0] ?? null,
    [allBriefs, briefs, selectedBriefId],
  );

  const [draft, setDraft] = useState<GlyphWorkbenchBrief | null>(null);
  const editor = draft ?? selectedBrief;

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["glyph-generation-workbench"] });

  const mutSave = useMutation({
    mutationFn: (body: GlyphWorkbenchBrief) => putGlyphWorkbenchBrief(body.brief_id, body),
    onSuccess: () => {
      invalidate();
      setDraft(null);
    },
  });

  const mutCreate = useMutation({
    mutationFn: (glyphId: string) => createGlyphWorkbenchBrief({ glyph_id: glyphId }),
    onSuccess: (created) => {
      invalidate();
      setSelectedBriefId(created.brief_id);
      setDraft(null);
    },
  });

  const [candidateDrafts, setCandidateDrafts] = useState<Record<string, GlyphWorkbenchCandidateSlot>>({});

  const candidateDraft = (slot: GlyphWorkbenchCandidateSlot): GlyphWorkbenchCandidateSlot =>
    candidateDrafts[slot.candidate_id] ?? slot;

  const setCandidateDraft = (slot: GlyphWorkbenchCandidateSlot) => {
    setCandidateDrafts((prev) => ({ ...prev, [slot.candidate_id]: slot }));
  };

  const mutStageCandidate = useMutation({
    mutationFn: ({ briefId, slot }: { briefId: string; slot: GlyphWorkbenchCandidateSlot }) =>
      putGlyphWorkbenchCandidate(briefId, slot.candidate_id, {
        ...slot,
        status: slot.status === "empty" ? "staged" : slot.status,
      }),
    onSuccess: () => {
      invalidate();
      setCandidateDrafts({});
    },
  });

  const mutClearCandidate = useMutation({
    mutationFn: ({ briefId, candidateId }: { briefId: string; candidateId: string }) =>
      clearGlyphWorkbenchCandidate(briefId, candidateId),
    onSuccess: () => {
      invalidate();
      setCandidateDrafts({});
    },
  });

  const mutAcceptCandidate = useMutation({
    mutationFn: ({ briefId, candidateId, notes }: { briefId: string; candidateId: string; notes?: string }) =>
      acceptGlyphWorkbenchCandidate(briefId, candidateId, notes),
    onSuccess: () => invalidate(),
  });

  const mutRejectCandidate = useMutation({
    mutationFn: ({ briefId, candidateId, notes }: { briefId: string; candidateId: string; notes?: string }) =>
      rejectGlyphWorkbenchCandidate(briefId, candidateId, notes),
    onSuccess: () => invalidate(),
  });

  const mutPromoteCandidate = useMutation({
    mutationFn: ({ briefId, candidateId }: { briefId: string; candidateId: string }) =>
      promoteGlyphWorkbenchCandidate(briefId, candidateId),
    onSuccess: () => {
      invalidate();
      setCandidateDrafts({});
    },
  });

  const mutImportToPlot = useMutation({
    mutationFn: ({ assetRef }: { assetRef: string }) =>
      promoteStagedGlyphAsset({
        asset_ref: assetRef,
        recipe_id: "char_combadge_delta_v1",
      }),
    onSuccess: (data) => {
      invalidate();
      if (data.plot_id) {
        window.location.hash = `#/hails/plot/${encodeURIComponent(data.plot_id)}`;
      }
    },
  });

  const candidateBusy =
    mutStageCandidate.isPending ||
    mutClearCandidate.isPending ||
    mutAcceptCandidate.isPending ||
    mutRejectCandidate.isPending ||
    mutPromoteCandidate.isPending ||
    mutImportToPlot.isPending;

  const mutArchive = useMutation({
    mutationFn: (briefId: string) => archiveGlyphWorkbenchBrief(briefId),
    onSuccess: () => {
      invalidate();
      setDraft(null);
      setSelectedBriefId(null);
    },
  });

  const registryEntry = useMemo(
    () => registryGlyphs.find((g) => g.glyph_id === editor?.glyph_id),
    [registryGlyphs, editor?.glyph_id],
  );

  if (q.isPending) {
    return (
      <AxiomSurfacePage className="mx-auto max-w-6xl space-y-6" state="loading">
        <RouteSurfaceHeader
          hash="#/hails/glyph-workbench"
          fallbackTitle="Glyph generation workbench"
          fallbackLead="Prepare generation briefs and track candidate slots."
          regionId="ownership_summary"
        />
        <SurfaceRegion regionId="page_content">
          <div className="ca-panel p-6 text-ca-sm text-[color:var(--ca-text-secondary)]">Loading glyph workbench…</div>
        </SurfaceRegion>
      </AxiomSurfacePage>
    );
  }
  if (q.isError) {
    return (
      <AxiomSurfacePage className="mx-auto max-w-6xl space-y-6" state="load-error">
        <RouteSurfaceHeader
          hash="#/hails/glyph-workbench"
          fallbackTitle="Glyph generation workbench"
          fallbackLead="Prepare generation briefs and track candidate slots."
          regionId="ownership_summary"
        />
        <SurfaceRegion regionId="page_content">
      <div className="ca-panel p-6 text-ca-sm text-[color:var(--ca-status-error-fg)]" role="alert">
        {(q.error as Error)?.message ?? "Unable to load glyph workbench"}
      </div>
        </SurfaceRegion>
      </AxiomSurfacePage>
    );
  }

  return (
    <AxiomSurfacePage className="mx-auto max-w-6xl space-y-6" state="ready">
      <RouteSurfaceHeader
        hash="#/hails/glyph-workbench"
        fallbackTitle="Glyph generation workbench"
        fallbackLead="Prepare generation briefs and track candidate slots from the Axiom Glyph Registry."
        regionId="ownership_summary"
      />
      <SurfaceRegion regionId="page_content" as="div" className="space-y-6" data-glyph-generation-workbench>
      <div
        className="ca-banner-warning rounded-md border border-[color:var(--ca-status-warning-fg)]/30 p-4 text-ca-sm text-[color:var(--ca-text-secondary)]"
        role="note"
        data-glyph-workbench-safety-banner
      >
        <p className="font-medium text-[color:var(--ca-status-warning-fg)]">Brief → stage → accept → promote</p>
        <p className="mt-1">{q.data?.safety_notice}</p>
        <p className="mt-1 text-ca-2xs">
          Promoted candidates record staged asset bindings in operator settings. They do not replace committed registry
          JSON or Android/LCARD production assets.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="ca-panel space-y-4 p-5" data-glyph-workbench-brief-list>
          <div className="flex flex-wrap items-end gap-2 border-b border-[color:var(--ca-surface-border)] pb-3">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
              New brief from registry glyph
              <select
                className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 text-ca-sm"
                value={newGlyphId}
                onChange={(e) => setNewGlyphId(e.target.value)}
              >
                {registryGlyphs.map((g) => (
                  <option key={String(g.glyph_id)} value={String(g.glyph_id)}>
                    {glyphSelectorLabel(String(g.glyph_id), glyphCatalog)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="ca-focusable rounded-md bg-[color:var(--ca-brand-600)] px-3 py-2 text-ca-sm font-medium text-[color:var(--ca-on-brand)] disabled:opacity-50"
              disabled={mutCreate.isPending}
              onClick={() => mutCreate.mutate(newGlyphId)}
            >
              Add brief
            </button>
          </div>
          <ul className="space-y-2">
            {briefs.map((brief) => (
              <li key={brief.brief_id}>
                <button
                  type="button"
                  className={
                    "ca-focusable w-full rounded-md border px-3 py-2 text-left text-ca-sm " +
                    (brief.brief_id === (editor?.brief_id ?? "")
                      ? "border-[color:var(--ca-brand-600)] bg-[color:var(--ca-brand-600)]/5"
                      : "border-[color:var(--ca-surface-border)]")
                  }
                  onClick={() => {
                    setSelectedBriefId(brief.brief_id);
                    setDraft(null);
                  }}
                >
                  <span className="font-medium text-[color:var(--ca-text-primary)]">{brief.brief_id}</span>
                  <span className="mt-0.5 block text-ca-2xs text-[color:var(--ca-text-muted)]">
                    {glyphSelectorLabel(brief.glyph_id, glyphCatalog)} · {brief.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-ca-2xs text-[color:var(--ca-text-muted)]">Source: {q.data?.source}</p>
        </section>

        <div className="space-y-4">
          {editor ? (
            <>
              <section className="ca-panel space-y-4 p-5" data-glyph-workbench-brief-editor>
                <h3 className="text-ca-sm font-semibold text-[color:var(--ca-text-primary)]">Brief editor</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
                    Status
                    <select
                      className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 text-ca-sm"
                      value={editor.status}
                      onChange={(e) => setDraft({ ...editor, status: e.target.value })}
                    >
                      {BRIEF_STATUSES.filter((s) => s !== "archived").map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="text-ca-2xs text-[color:var(--ca-text-muted)]">
                    Glyph: <span className="font-mono">{editor.glyph_id}</span>
                  </div>
                </div>
                <label className="flex flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
                  Generation prompt
                  <textarea
                    className="ca-focusable min-h-[96px] rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 font-mono text-ca-xs"
                    value={editor.generation_prompt ?? ""}
                    onChange={(e) => setDraft({ ...editor, generation_prompt: e.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
                  Negative prompt
                  <textarea
                    className="ca-focusable min-h-[64px] rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 font-mono text-ca-xs"
                    value={editor.negative_prompt ?? ""}
                    onChange={(e) => setDraft({ ...editor, negative_prompt: e.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
                  Review notes
                  <textarea
                    className="ca-focusable min-h-[64px] rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 text-ca-sm"
                    value={editor.review_notes ?? ""}
                    onChange={(e) => setDraft({ ...editor, review_notes: e.target.value })}
                  />
                </label>
                <div className="space-y-2">
                  <h4 className="text-ca-xs font-semibold uppercase tracking-wide text-[color:var(--ca-text-muted)]">
                    Candidate slots
                  </h4>
                  {editor.candidate_slots.map((slot) => {
                    const draft = candidateDraft(slot);
                    const hasStagedRef = Boolean(draft.asset_ref?.trim());
                    return (
                    <div
                      key={slot.candidate_id}
                      className="rounded-md border border-[color:var(--ca-surface-border)] p-3"
                      data-glyph-candidate-slot
                    >
                      <p className="font-mono text-ca-2xs text-[color:var(--ca-text-muted)]">{slot.candidate_id}</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <label className="flex flex-col gap-1 text-ca-2xs text-[color:var(--ca-text-secondary)]">
                          Status
                          <select
                            className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-2 py-1 text-ca-sm"
                            value={draft.status}
                            onChange={(e) => setCandidateDraft({ ...draft, status: e.target.value })}
                          >
                            {CANDIDATE_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-ca-2xs text-[color:var(--ca-text-secondary)]">
                          Asset kind
                          <select
                            className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-2 py-1 text-ca-sm"
                            value={draft.asset_kind ?? ""}
                            onChange={(e) =>
                              setCandidateDraft({ ...draft, asset_kind: e.target.value || null })
                            }
                          >
                            <option value="">—</option>
                            {ASSET_KINDS.map((k) => (
                              <option key={k} value={k}>
                                {k}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-ca-2xs text-[color:var(--ca-text-secondary)] sm:col-span-2">
                          Staged asset ref ({STAGED_PREFIX}…)
                          <input
                            className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-2 py-1 font-mono text-ca-xs"
                            value={draft.asset_ref ?? ""}
                            placeholder={`${STAGED_PREFIX}<glyph-id>/candidate.svg`}
                            onChange={(e) =>
                              setCandidateDraft({ ...draft, asset_ref: e.target.value || null })
                            }
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-ca-2xs text-[color:var(--ca-text-secondary)]">
                          Source
                          <select
                            className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-2 py-1 text-ca-sm"
                            value={draft.source ?? ""}
                            onChange={(e) => setCandidateDraft({ ...draft, source: e.target.value || null })}
                          >
                            <option value="">—</option>
                            {ASSET_SOURCES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-ca-2xs text-[color:var(--ca-text-secondary)] sm:col-span-2">
                          Notes
                          <input
                            className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-2 py-1 text-ca-sm"
                            value={draft.notes ?? ""}
                            onChange={(e) => setCandidateDraft({ ...draft, notes: e.target.value })}
                          />
                        </label>
                      </div>
                      <p className="mt-2 text-ca-2xs text-[color:var(--ca-text-muted)]">
                        Stage a relative path under {STAGED_PREFIX}, accept locally, then promote to record the binding.
                      </p>
                      {draft.asset_kind === "svg" && draft.asset_ref ? (
                        <img
                          src={`/${draft.asset_ref.replace(/^\//, "")}`}
                          alt=""
                          className="mt-2 h-16 w-16 object-contain text-[color:var(--ca-brand-400)]"
                          data-glyph-staged-preview
                        />
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] px-2 py-1 text-ca-2xs disabled:opacity-50"
                          disabled={candidateBusy || !hasStagedRef}
                          onClick={() =>
                            mutStageCandidate.mutate({ briefId: editor.brief_id, slot: draft })
                          }
                        >
                          Save staging
                        </button>
                        <button
                          type="button"
                          className="ca-focusable rounded-md border border-[color:var(--ca-brand-600)] px-2 py-1 text-ca-2xs text-[color:var(--ca-brand-600)] disabled:opacity-50"
                          disabled={candidateBusy || slot.status === "empty" || !hasStagedRef}
                          onClick={() =>
                            mutAcceptCandidate.mutate({
                              briefId: editor.brief_id,
                              candidateId: slot.candidate_id,
                              notes: draft.notes,
                            })
                          }
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="ca-focusable rounded-md border border-[color:var(--ca-status-error-fg)] px-2 py-1 text-ca-2xs text-[color:var(--ca-status-error-fg)] disabled:opacity-50"
                          disabled={candidateBusy || slot.status === "empty" || !hasStagedRef}
                          onClick={() =>
                            mutRejectCandidate.mutate({
                              briefId: editor.brief_id,
                              candidateId: slot.candidate_id,
                              notes: draft.notes,
                            })
                          }
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          className="ca-focusable rounded-md border border-[color:var(--ca-brand-400)] px-2 py-1 text-ca-2xs disabled:opacity-50"
                          disabled={
                            candidateBusy ||
                            !hasStagedRef ||
                            draft.asset_kind !== "svg"
                          }
                          onClick={() =>
                            mutImportToPlot.mutate({
                              assetRef: draft.asset_ref!.trim(),
                            })
                          }
                          data-glyph-workbench-import-plot
                          title="Imports to the frozen combadge plot proof (char_combadge_delta_v1) — procedural plot work is paused."
                        >
                          Import to plot
                        </button>
                        <FrozenPlotNotice compact />
                        <button
                          type="button"
                          className="ca-focusable rounded-md bg-[color:var(--ca-brand-600)] px-2 py-1 text-ca-2xs font-medium text-[color:var(--ca-on-brand)] disabled:opacity-50"
                          disabled={candidateBusy || slot.status !== "accepted"}
                          onClick={() =>
                            mutPromoteCandidate.mutate({
                              briefId: editor.brief_id,
                              candidateId: slot.candidate_id,
                            })
                          }
                          data-glyph-workbench-promote
                        >
                          Promote
                        </button>
                        <button
                          type="button"
                          className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] px-2 py-1 text-ca-2xs disabled:opacity-50"
                          disabled={candidateBusy || slot.status === "empty"}
                          onClick={() =>
                            mutClearCandidate.mutate({
                              briefId: editor.brief_id,
                              candidateId: slot.candidate_id,
                            })
                          }
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="ca-focusable rounded-md bg-[color:var(--ca-brand-600)] px-4 py-2 text-ca-sm font-medium text-[color:var(--ca-on-brand)] disabled:opacity-50"
                    disabled={!draft || mutSave.isPending}
                    onClick={() => draft && mutSave.mutate(draft)}
                  >
                    {mutSave.isPending ? "Saving…" : "Save brief"}
                  </button>
                  <button
                    type="button"
                    className="ca-focusable rounded-md border border-[color:var(--ca-status-error-fg)] px-4 py-2 text-ca-sm text-[color:var(--ca-status-error-fg)] disabled:opacity-50"
                    disabled={mutArchive.isPending}
                    onClick={() => mutArchive.mutate(editor.brief_id)}
                  >
                    Archive brief
                  </button>
                </div>
              </section>

              <section className="ca-panel space-y-3 p-5" data-glyph-workbench-registry-source>
                <h3 className="text-ca-sm font-semibold text-[color:var(--ca-text-primary)]">Registry source (read-only)</h3>
                {registryEntry ? (
                  <dl className="grid gap-2 text-ca-xs sm:grid-cols-2">
                    <div>
                      <dt className="text-[color:var(--ca-text-muted)]">Label</dt>
                      <dd>{String(registryEntry.label ?? "—")}</dd>
                    </div>
                    <div>
                      <dt className="text-[color:var(--ca-text-muted)]">Registry status</dt>
                      <dd>{String(registryEntry.status ?? "—")}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-[color:var(--ca-text-muted)]">Semantic intent</dt>
                      <dd>{String(registryEntry.semantic_intent ?? "—")}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-[color:var(--ca-text-muted)]">Target surfaces</dt>
                      <dd>{(editor.target_surfaces ?? []).join(", ") || "—"}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-[color:var(--ca-text-muted)]">Visual constraints</dt>
                      <dd>
                        <pre className="mt-1 overflow-x-auto rounded bg-[color:var(--ca-surface-inset)] p-2 font-mono text-ca-2xs">
                          {JSON.stringify(editor.visual_constraints ?? {}, null, 2)}
                        </pre>
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-ca-sm text-[color:var(--ca-text-muted)]">No registry entry for this glyph.</p>
                )}
              </section>
            </>
          ) : (
            <div className="ca-panel p-6 text-ca-sm text-[color:var(--ca-text-muted)]">No briefs yet. Add one from the registry.</div>
          )}
        </div>
      </div>
      </SurfaceRegion>
    </AxiomSurfacePage>
  );
}
