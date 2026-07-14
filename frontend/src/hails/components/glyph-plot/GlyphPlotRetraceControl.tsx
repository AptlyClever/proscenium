import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { postGlyphPlotRetraceReference } from "../../../api";

export function GlyphPlotRetraceControl({ plotId }: { plotId: string }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);

  const retraceMutation = useMutation({
    mutationFn: () => postGlyphPlotRetraceReference(plotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["glyph-plot-fixture", plotId] });
      queryClient.invalidateQueries({ queryKey: ["glyph-plot-fixtures"] });
      setMessage("Retraced from reference photo — panels updated.");
    },
    onError: (err: Error) => {
      setMessage(err.message || "Retrace failed");
    },
  });

  return (
    <div className="space-y-2" data-glyph-plot-retrace-control>
      <button
        type="button"
        className="ca-focusable rounded-md bg-[color:var(--ca-brand-600)] px-4 py-2 text-ca-sm font-medium text-[color:var(--ca-on-brand)] disabled:opacity-50"
        disabled={retraceMutation.isPending}
        onClick={() => {
          setMessage(null);
          retraceMutation.mutate();
        }}
        data-glyph-plot-retrace
      >
        {retraceMutation.isPending ? "Tracing reference photo…" : "Retrace from reference photo"}
      </button>
      <p className="text-ca-2xs text-[color:var(--ca-text-muted)]">
        Headless fit from the operator reference PNG — no Inkscape, no manual SVG.
      </p>
      {message ? (
        <p
          className={`text-ca-sm ${
            retraceMutation.isError
              ? "text-[color:var(--ca-status-error-fg)]"
              : "text-[color:var(--ca-text-secondary)]"
          }`}
          data-glyph-plot-retrace-message
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
