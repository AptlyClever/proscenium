import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { archiveHail, deleteHail, fetchHails, putHail, restoreHail, sendHail, type EffectRegistryPayload, type MessageRegistryPayload } from "../../api";
import {
  derivePageTemplateState,
  normalizeRouteForSave,
  roomsFromRoutes,
  routesFromHail,
  validateRoutes,
  type DeliveryRoute,
  type HailWithDeliveryPolicy,
} from "../hailDeliveryRoutes";
import { HailsNewDialog } from "../components/HailsNewDialog";
import { HailStudioEditPanel } from "../components/hail-studio/HailStudioEditPanel";
import { AxiomBuildPill } from "../../components/AxiomBuildPill";
import { RouteSurfaceHeader } from "../../components/RouteSurfaceHeader";
import { HailStudioLibrary } from "../components/hail-studio/HailStudioLibrary";
import { HailStudioBackstage } from "../components/hail-studio/HailStudioBackstage";
import { normalizeCustomGlyphs } from "../hailGlyphLibrary";
import {
  rendererReadinessLines,
  routeReadinessLines,
} from "../hailRouteReadiness";
import {
  visualFieldsFromRecord,
  visualFieldsToRecord,
  DEFAULT_VISUAL_FIELDS,
  type HailVisualFields,
} from "../hailVisualContract";
import {
  applyRegistryVisualDefaults,
} from "../hailEffectTuning";
import { applyMessageSidekickDefaults } from "../hailMessageSidekickTuning";
import { PageTemplate } from "../../components/PageTemplate";

type HailRecord = HailWithDeliveryPolicy & {
  archived?: boolean;
  stale_components?: boolean;
  category?: string;
  schema_version?: number;
  visual?: Record<string, unknown>;
  audio?: Record<string, unknown>;
  rooms?: HailWithDeliveryPolicy["rooms"] & { badge_policy?: string };
};

type EditorState = {
  name: string;
  displayId: string;
  category: string;
  enabled: boolean;
  shortText: string;
  glyph: string;
  routes: DeliveryRoute[];
  badgePolicy: string;
  cooldownSec: string;
  visual: HailVisualFields;
};

const HAILS_BROWSE_EFFECTS_KEY = "hail-browse-effects-enabled";

function readBrowseEffectsEnabled(): boolean {
  if (typeof sessionStorage === "undefined") return true;
  return sessionStorage.getItem(HAILS_BROWSE_EFFECTS_KEY) !== "false";
}

function writeBrowseEffectsEnabled(enabled: boolean) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(HAILS_BROWSE_EFFECTS_KEY, enabled ? "true" : "false");
}

const HAILS_PAGE_HELPER =
  "Pick a Hail, see how it looks, and edit it when you're ready.";

function HailDialog({
  open,
  title,
  titleId,
  busy,
  confirmLabel,
  onConfirm,
  onClose,
  children,
  isNewHail,
  confirmDanger,
}: {
  open: boolean;
  title: string;
  titleId: string;
  busy?: boolean;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  children: ReactNode;
  isNewHail?: boolean;
  confirmDanger?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="ca-modal-scrim ca-overlay-inset fixed inset-0 z-50 flex items-center justify-center"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="ca-panel w-full max-w-md p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-hail-dialog
        {...(isNewHail ? { "data-hail-new-dialog": true } : {})}
        {...(confirmDanger ? { "data-hail-delete-dialog": true } : {})}
      >
        <h3 id={titleId} className="text-ca-base font-semibold text-[color:var(--ca-text-primary)]">
          {title}
        </h3>
        <div className="mt-4 space-y-4">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] px-4 py-2 text-ca-sm text-[color:var(--ca-text-primary)]"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={
              "ca-focusable rounded-md px-4 py-2 text-ca-sm font-medium disabled:opacity-50 " +
              (confirmDanger
                ? "border border-[color:var(--ca-status-error-fg)] bg-[color:var(--ca-status-error-fg)] text-[color:var(--ca-on-brand)]"
                : "bg-[color:var(--ca-brand-600)] text-[color:var(--ca-on-brand)]")
            }
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function editorFromHail(hail: HailRecord | null): EditorState {
  return {
    name: String(hail?.name ?? ""),
    displayId: String(hail?.display_id ?? ""),
    category: String(hail?.category ?? "cute"),
    enabled: hail ? hail.enabled !== false : true,
    shortText: String(hail?.message?.short_text ?? ""),
    glyph: String(hail?.icon?.value ?? "default"),
    routes: routesFromHail(hail),
    badgePolicy: String(hail?.rooms?.badge_policy ?? "source_room"),
    cooldownSec: String(hail?.behavior?.cooldown_sec ?? 30),
    visual: visualFieldsFromRecord(hail?.visual as Record<string, unknown> | undefined),
  };
}

function editorFromHailWithRegistry(
  hail: HailRecord | null,
  effectRegistry: EffectRegistryPayload | null,
  messageRegistry: MessageRegistryPayload | null,
): EditorState {
  const base = editorFromHail(hail);
  const withEffect = applyRegistryVisualDefaults(base.visual, effectRegistry);
  return { ...base, visual: applyMessageSidekickDefaults(withEffect, messageRegistry) };
}

function studioVisual(visual: HailVisualFields | undefined): HailVisualFields {
  return visual ?? DEFAULT_VISUAL_FIELDS;
}

function editorToBody(state: EditorState): Record<string, unknown> {
  const requiresConfirmation = state.routes
    .filter((route) => route.enabled !== false)
    .some((route) => route.requires_confirmation);
  return {
    name: state.name.trim(),
    display_id: state.displayId.trim(),
    category: state.category,
    enabled: state.enabled,
    message: { short_text: state.shortText.trim() || state.name.trim() },
    icon: { kind: "glyph", value: state.glyph },
    delivery_policy: {
      routes: state.routes.map((route) => {
        const normalized = normalizeRouteForSave(route);
        return {
          id: normalized.id,
          launch_room_id: normalized.launch_room_id,
          destination_room_id: normalized.destination_room_id,
          provider: normalized.provider || "lcard",
          requires_confirmation: normalized.requires_confirmation,
          enabled: normalized.enabled !== false,
        };
      }),
    },
    rooms: {
      badge_policy: state.badgePolicy,
    },
    behavior: {
      cooldown_sec: Number(state.cooldownSec) || 30,
      requires_confirmation: requiresConfirmation,
    },
    visual: visualFieldsToRecord(state.visual),
  };
}

export function HailsView() {
  const qc = useQueryClient();

  const hailsQ = useQuery({ queryKey: ["hails"], queryFn: fetchHails, staleTime: 15_000 });

  const hails = useMemo(() => (hailsQ.data?.hails ?? []) as HailRecord[], [hailsQ.data]);
  const knownRooms = hailsQ.data?.known_rooms ?? ["arcade", "master_bedroom", "away_team"];
  const knownGlyphs = hailsQ.data?.known_glyphs ?? ["default"];
  const glyphCatalog = hailsQ.data?.glyph_catalog ?? [];
  const knownCategories = hailsQ.data?.known_categories ?? ["cute"];
  const knownEffects = hailsQ.data?.known_effects ?? hailsQ.data?.effect_registry?.active_effect_ids ?? [];
  const effectRegistry = hailsQ.data?.effect_registry ?? null;
  const messageRegistry = hailsQ.data?.message_registry ?? null;
  const knownSizeTiers = hailsQ.data?.known_size_tiers ?? ["small", "medium", "large"];
  const knownPaletteIds = hailsQ.data?.known_palette_ids ?? ["axiom_dark_cyan"];
  const customGlyphs = useMemo(
    () => normalizeCustomGlyphs(hailsQ.data?.custom_glyphs),
    [hailsQ.data?.custom_glyphs],
  );
  const knownPlacementIds = hailsQ.data?.known_placement_ids ?? ["upper_center"];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(editorFromHail(null));
  const [baseline, setBaseline] = useState<string>(JSON.stringify(editorFromHail(null)));
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [newHailOpen, setNewHailOpen] = useState(false);
  const [browseEffectsEnabled, setBrowseEffectsEnabled] = useState(readBrowseEffectsEnabled);
  const [advancedVisualEditEnabled, setAdvancedVisualEditEnabled] = useState(false);
  const [libraryActionError, setLibraryActionError] = useState<string | null>(null);
  const editorSyncRef = useRef<{ hailId: string; snapshot: string | null; hadRegistry: boolean }>({
    hailId: "",
    snapshot: null,
    hadRegistry: false,
  });

  useEffect(() => {
    writeBrowseEffectsEnabled(browseEffectsEnabled);
  }, [browseEffectsEnabled]);

  const selectedHail = useMemo(
    () => (selectedId ? hails.find((h) => h.id === selectedId) ?? null : null),
    [hails, selectedId],
  );

  const hailSnapshot = useMemo(
    () => (selectedHail ? JSON.stringify(selectedHail) : null),
    [selectedHail],
  );

  useEffect(() => {
    if (selectedId === null && hails.length) {
      setSelectedId(String(hails.find((h) => h.archived !== true)?.id ?? hails[0].id));
    }
  }, [hails, selectedId]);

  useEffect(() => {
    if (!selectedId || !selectedHail) return;
    const snap = hailSnapshot;
    const hailChanged =
      editorSyncRef.current.hailId !== selectedId || editorSyncRef.current.snapshot !== snap;
    const registryArrived = !editorSyncRef.current.hadRegistry && Boolean(effectRegistry);
    if (!hailChanged && !registryArrived) return;

    const next = editorFromHailWithRegistry(selectedHail, effectRegistry, messageRegistry);
    setEditor(next);
    setBaseline(JSON.stringify(next));
    setConfirmArchive(false);
    setAdvancedVisualEditEnabled(false);
    editorSyncRef.current = {
      hailId: selectedId,
      snapshot: snap,
      hadRegistry: Boolean(effectRegistry) || editorSyncRef.current.hadRegistry,
    };
  }, [selectedId, selectedHail, hailSnapshot, effectRegistry, messageRegistry, selectedHail?.archived, selectedHail?.enabled]);

  function selectHail(id: string) {
    if (id === selectedId) return;
    const isDirty = JSON.stringify(editor) !== baseline;
    if (isDirty && !window.confirm("You have unsaved changes. Discard them and switch Hails?")) {
      return;
    }
    setLibraryActionError(null);
    setSelectedId(id);
  }

  function openGlyphForge() {
    window.location.hash = "#/hails/forge/new-glyph";
  }

  function openNewHail() {
    setNewHailOpen(true);
  }

  function handleHailSaved(record: Record<string, unknown>) {
    invalidate();
    setSelectedId(String(record.id));
    const fromRecord = editorFromHail(record as HailRecord);
    const next = {
      ...fromRecord,
      visual: applyMessageSidekickDefaults(
        applyRegistryVisualDefaults(fromRecord.visual, effectRegistry),
        messageRegistry,
      ),
    };
    setEditor(next);
    setBaseline(JSON.stringify(next));
    setNewHailOpen(false);
    editorSyncRef.current = {
      hailId: String(record.id),
      snapshot: JSON.stringify(record),
      hadRegistry: Boolean(effectRegistry),
    };
  }

  function handleStudioSave() {
    if (!selectedId) return;
    mutSave.mutate();
  }

  function handleEditorPatch(patch: Partial<EditorState>) {
    setEditor({ ...editor, ...patch });
  }

  function handleBackstageSave() {
    handleStudioSave();
  }

  const dirty = JSON.stringify(editor) !== baseline;
  const routeValidationErrors = validateRoutes(editor.routes);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["hails"] });
    qc.invalidateQueries({ queryKey: ["effective", "lcard"] });
  };

  const mutSave = useMutation({
    mutationFn: () => putHail(String(selectedId), editorToBody(editor)),
    onSuccess: (record) => {
      invalidate();
      setSelectedId(String(record.id));
      const next = editorFromHailWithRegistry(record as HailRecord, effectRegistry, messageRegistry);
      setEditor(next);
      setBaseline(JSON.stringify(next));
    },
  });

  const mutArchive = useMutation({
    mutationFn: () => archiveHail(String(selectedId)),
    onSuccess: () => {
      invalidate();
      setConfirmArchive(false);
      setLibraryActionError(null);
    },
    onError: (error) => {
      setLibraryActionError(error instanceof Error ? error.message : "Could not archive Hail");
    },
  });

  const [sendResult, setSendResult] = useState<string | null>(null);
  const mutSend = useMutation({
    mutationFn: () => sendHail(String(selectedId), { source: "proscenium" }),
    onSuccess: (result) => {
      setSendResult(
        typeof result.status === "string"
          ? `Sent (${result.status})`
          : result.ok
            ? "Sent"
            : "Send finished",
      );
    },
    onError: () => setSendResult(null),
  });

  const mutRestore = useMutation({
    mutationFn: () => restoreHail(String(selectedId)),
    onSuccess: (data) => {
      invalidate();
      setLibraryActionError(null);
      if (data?.hail) {
        const fromRecord = editorFromHail(data.hail as HailRecord);
        const next = {
          ...fromRecord,
          visual: applyMessageSidekickDefaults(
        applyRegistryVisualDefaults(fromRecord.visual, effectRegistry),
        messageRegistry,
      ),
        };
        setEditor(next);
        setBaseline(JSON.stringify(next));
        setConfirmArchive(false);
        setAdvancedVisualEditEnabled(false);
        editorSyncRef.current = {
          hailId: String((data.hail as HailRecord).id ?? selectedId ?? ""),
          snapshot: JSON.stringify(data.hail),
          hadRegistry: Boolean(effectRegistry),
        };
      }
    },
    onError: (error) => {
      setLibraryActionError(error instanceof Error ? error.message : "Could not restore Hail");
    },
  });

  const deleteTargetHail = useMemo(
    () => (deleteTargetId ? hails.find((h) => h.id === deleteTargetId) ?? null : null),
    [deleteTargetId, hails],
  );

  const mutDelete = useMutation({
    mutationFn: (hailId: string) => deleteHail(hailId),
    onSuccess: (_data, hailId) => {
      invalidate();
      setDeleteConfirmOpen(false);
      setDeleteTargetId(null);
      setLibraryActionError(null);
      const remaining = hails.filter((h) => h.id !== hailId && h.archived !== true);
      if (selectedId === hailId) {
        setSelectedId(remaining[0]?.id ? String(remaining[0].id) : null);
      }
    },
    onError: (error) => {
      setLibraryActionError(error instanceof Error ? error.message : "Could not delete Hail");
    },
  });

  function openDeleteConfirm(hailId: string) {
    setDeleteTargetId(hailId);
    setDeleteConfirmOpen(true);
  }

  const visibleHails = hails.filter((h) => showArchived || h.archived !== true);
  const archivedCount = hails.filter((h) => h.archived === true).length;

  const previewHail: HailRecord = {
    ...selectedHail,
    name: editor.name,
    enabled: editor.enabled,
    icon: { kind: "glyph", value: editor.glyph },
    rooms: roomsFromRoutes(editor.routes),
    delivery_policy: { routes: editor.routes },
    id: String(selectedId ?? ""),
  };
  const readinessLines = routeReadinessLines(previewHail);
  const rendererLines = rendererReadinessLines(previewHail);
  const rendererReady = Boolean(previewHail.id) && rendererLines.some((line) => line.startsWith("Primary renderer:"));

  const templateState = derivePageTemplateState({
    loading: hailsQ.isPending,
    empty: !hailsQ.isPending && !hailsQ.isError && visibleHails.length === 0,
    selectedHail,
    isCreate: newHailOpen,
    editorEnabled: editor.enabled,
    editorRoutes: editor.routes,
    routeValidationErrors,
    saveError: Boolean(mutSave.error),
    rendererReady,
  });

  const saveState = mutSave.isPending
    ? "Saving…"
    : dirty
      ? "Unsaved changes"
      : mutSave.isSuccess
        ? "Saved"
        : "No changes";

  const saveBlocked = routeValidationErrors.length > 0;
  const savePending = mutSave.isPending;

  return (
    <PageTemplate
      className="ca-proto-density mx-auto max-w-6xl space-y-6"
      templateId="axiom.hails.management.v002"
      state={templateState}
    >
      {hailsQ.isPending ? (
        <div className="ca-panel p-6 text-ca-sm text-[color:var(--ca-text-secondary)]">Loading Hails…</div>
      ) : hailsQ.isError ? (
        <div className="ca-panel p-6 text-ca-sm text-[color:var(--ca-status-error-fg)]" role="alert">
          {(hailsQ.error as Error)?.message ?? "Unable to load Hails"}
        </div>
      ) : (
        <div
          className="space-y-6"
          data-hail-studio
          data-hail-gallery-launcher
          data-hail-list-first-layout
          data-hail-signal-workbench
          data-hails-page-mode={selectedHail && selectedId ? "studio" : "browse"}
        >
          <RouteSurfaceHeader
            hash="#/hails"
            fallbackTitle="Hails"
            fallbackLead={HAILS_PAGE_HELPER}
            regionId="ownership_summary"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <AxiomBuildPill surface="hails" />
                <a
                  href="#/hails/forge"
                  className="ca-focusable rounded-full border border-[color:var(--ca-brand-600)]/40 px-3 py-1.5 text-ca-2xs font-medium uppercase tracking-wide text-[color:var(--ca-brand-600)] hover:border-[color:var(--ca-brand-600)] hover:bg-[color:var(--ca-brand-600)]/5"
                  data-hail-forge-launch
                >
                  Hail Forge
                </a>
              </div>
            }
          />

          <div className="grid min-h-0 gap-5 lg:grid-cols-[minmax(0,13.5rem)_minmax(0,1fr)] lg:gap-8" data-hail-picker-layout>
            <HailStudioLibrary
              hails={visibleHails}
              selectedId={selectedId}
              showArchived={showArchived}
              archivedCount={archivedCount}
              glyphCatalog={glyphCatalog}
              customGlyphs={customGlyphs}
              onSelect={selectHail}
              onNewDraft={openNewHail}
              onToggleShowArchived={setShowArchived}
              onDelete={openDeleteConfirm}
            />

            <div className="min-w-0 space-y-3 lg:border-l lg:border-[color:var(--ca-surface-border)] lg:pl-0" data-hail-studio-workspace>
              {libraryActionError ? (
                <div className="ca-banner-error rounded-md p-3 text-ca-xs" role="alert" data-hail-library-action-error>
                  <p className="font-medium">Hail action failed</p>
                  <p className="mt-1">{libraryActionError}</p>
                </div>
              ) : null}
              {selectedHail && selectedId ? (
                <>
                  <HailStudioEditPanel
                    name={editor.name || selectedHail.name || ""}
                    shortText={editor.shortText}
                    glyphId={editor.glyph}
                    visual={studioVisual(editor.visual)}
                    routes={editor.routes}
                    enabled={editor.enabled}
                    archived={selectedHail.archived === true}
                    knownRooms={knownRooms}
                    knownGlyphs={knownGlyphs}
                    knownEffects={knownEffects}
                    knownPaletteIds={knownPaletteIds}
                    knownSizeTiers={knownSizeTiers}
                    effectRegistry={effectRegistry}
                    messageRegistry={messageRegistry}
                    glyphCatalog={glyphCatalog}
                    customGlyphs={customGlyphs}
                    dirty={dirty}
                    savePending={savePending}
                    saveBlocked={saveBlocked}
                    staleComponents={selectedHail.stale_components === true}
                    saveError={mutSave.error as Error | null}
                    onEditorChange={handleEditorPatch}
                    onSave={handleStudioSave}
                    onOpenGlyphForge={openGlyphForge}
                    effectsPreviewEnabled={browseEffectsEnabled}
                    onEffectsPreviewEnabledChange={setBrowseEffectsEnabled}
                  />

                  <HailStudioBackstage
                    selectedId={selectedId}
                    selectedHail={selectedHail as Record<string, unknown> | null}
                    editor={editor}
                    draftBody={editorToBody(editor)}
                    knownRooms={knownRooms}
                    knownGlyphs={knownGlyphs}
                    glyphCatalog={glyphCatalog}
                    knownEffects={knownEffects}
                    knownSizeTiers={knownSizeTiers}
                    knownPaletteIds={knownPaletteIds}
                    knownPlacementIds={knownPlacementIds}
                    knownCategories={knownCategories}
                    routeValidationErrors={routeValidationErrors}
                    rendererLines={rendererLines}
                    readinessLines={readinessLines}
                    roomsJson={JSON.stringify({ routes: editor.routes, rooms: roomsFromRoutes(editor.routes) }, null, 2)}
                    advancedVisualEditEnabled={advancedVisualEditEnabled}
                    savePending={savePending}
                    saveBlocked={saveBlocked}
                    dirty={dirty}
                    confirmArchive={confirmArchive}
                    archivePending={mutArchive.isPending}
                    restorePending={mutRestore.isPending}
                    onEditorChange={(patch) => setEditor({ ...editor, ...patch })}
                    onVisualChange={(visual) => setEditor({ ...editor, visual })}
                    onSave={handleBackstageSave}
                    onConfirmArchive={() => mutArchive.mutate()}
                    onCancelArchive={() => setConfirmArchive(false)}
                    onStartArchive={() => setConfirmArchive(true)}
                    onRestore={() => mutRestore.mutate()}
                    onEnableAdvancedEdit={() => setAdvancedVisualEditEnabled(true)}
                    onDisableAdvancedEdit={() => setAdvancedVisualEditEnabled(false)}
                    saveStatus={saveState}
                    saveError={mutSave.error as Error | null}
                    sendPending={mutSend.isPending}
                    sendError={mutSend.error as Error | null}
                    sendResult={sendResult}
                    onSend={() => {
                      setSendResult(null);
                      mutSend.mutate();
                    }}
                  />
                </>
              ) : (
                <section className="ca-panel space-y-4 p-6" data-hail-profile-empty>
                  <h2 className="text-ca-base font-semibold text-[color:var(--ca-text-primary)]">Select a Hail</h2>
                  <p className="text-ca-sm text-[color:var(--ca-text-secondary)]">
                    Pick a saved Hail from the list, or create one to choose a Glyph, set a route, and preview how it looks.
                  </p>
                  <button
                    type="button"
                    className="ca-focusable rounded-md bg-[color:var(--ca-brand-600)] px-4 py-2 text-ca-sm font-medium text-[color:var(--ca-on-brand)]"
                    onClick={openNewHail}
                    data-hails-composer-launch
                    data-hail-studio-new
                  >
                    New Hail
                  </button>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
      <HailsNewDialog
        open={newHailOpen}
        onClose={() => setNewHailOpen(false)}
        onSaved={handleHailSaved}
        knownRooms={knownRooms}
        knownGlyphs={knownGlyphs}
        knownEffects={knownEffects}
        knownPaletteIds={knownPaletteIds}
        knownSizeTiers={knownSizeTiers}
        effectRegistry={effectRegistry}
        messageRegistry={messageRegistry}
        glyphCatalog={glyphCatalog}
        customGlyphs={customGlyphs}
        onLibraryChanged={invalidate}
      />
      <HailDialog
        open={deleteConfirmOpen}
        title={`Delete “${deleteTargetHail?.name ?? deleteTargetId ?? "Hail"}”?`}
        titleId="delete-hail-title"
        busy={mutDelete.isPending}
        confirmLabel="Delete Hail"
        confirmDanger
        onClose={() => {
          if (!mutDelete.isPending) {
            setDeleteConfirmOpen(false);
            setDeleteTargetId(null);
          }
        }}
        onConfirm={() => {
          if (deleteTargetId) mutDelete.mutate(deleteTargetId);
        }}
      >
        <p className="text-ca-sm text-[color:var(--ca-text-secondary)]">
          This permanently removes the Hail. It won't be available to room launchers.
        </p>
      </HailDialog>
    </PageTemplate>
  );
}
