import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { postGlyphPlotImportSvg } from "../../../api";

export function GlyphPlotImportControl({
  plotId,
  compact = false,
  onImported,
}: {
  plotId: string;
  compact?: boolean;
  onImported?: () => void;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const importMutation = useMutation({
    mutationFn: (file: File) => postGlyphPlotImportSvg(plotId, file, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["glyph-plot-fixture", plotId] });
      queryClient.invalidateQueries({ queryKey: ["glyph-plot-fixtures"] });
      setMessage("Imported — panels below show normalized ink. Judge 24px TV thumbnail.");
      onImported?.();
    },
    onError: (err: Error) => {
      setMessage(err.message || "Import failed");
    },
  });

  return (
    <div className={compact ? "inline-flex flex-col gap-1" : "space-y-2"} data-glyph-plot-import-control>
      <input
        ref={fileInputRef}
        type="file"
        accept=".svg,image/svg+xml"
        className="hidden"
        data-glyph-plot-import-input
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setMessage(null);
            importMutation.mutate(file);
          }
          e.target.value = "";
        }}
      />
      <button
        type="button"
        className={
          compact
            ? "ca-focusable rounded-md border border-[color:var(--ca-surface-border)] px-3 py-1.5 text-ca-sm disabled:opacity-50"
            : "ca-focusable rounded-md bg-[color:var(--ca-brand-600)] px-4 py-2 text-ca-sm font-medium text-[color:var(--ca-on-brand)] disabled:opacity-50"
        }
        disabled={importMutation.isPending}
        onClick={() => fileInputRef.current?.click()}
        data-glyph-plot-import
      >
        {importMutation.isPending ? "Importing…" : "Import Inkscape SVG"}
      </button>
      {!compact ? (
        <p className="text-ca-2xs text-[color:var(--ca-text-muted)]">
          Export from Inkscape at reference scale (2 paths, accent + mass). Normalizes to 48×48 on upload — no CLI.
        </p>
      ) : null}
      {message ? (
        <p
          className={`text-ca-sm ${
            importMutation.isError
              ? "text-[color:var(--ca-status-error-fg)]"
              : "text-[color:var(--ca-text-secondary)]"
          }`}
          data-glyph-plot-import-message
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
