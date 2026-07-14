import type { HailForgeSelection } from "./components/hail-forge/HailForgeLibrary";

type ForgeTemplateStateInput = {
  loading: boolean;
  selection: HailForgeSelection | null;
  dirty?: boolean;
  saveBlocked?: boolean;
};

/** Maps Forge workspace to page-template required_states ids. */
export function deriveForgePageTemplateState({
  loading,
  selection,
  dirty = false,
  saveBlocked = false,
}: ForgeTemplateStateInput): string {
  if (loading || !selection) {
    return "loading";
  }
  if (saveBlocked) {
    return "validation-error";
  }
  if (dirty) {
    return "unsaved-changes";
  }
  if (selection.kind === "glyph") {
    if (selection.mode === "new") {
      return "glyph-new";
    }
    return "glyph-custom-selected";
  }
  if (selection.presetId === "new" || !selection.presetId) {
    return "effect-new";
  }
  return "effect-selected";
}
