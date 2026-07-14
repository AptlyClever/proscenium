export function AxiomBuildPill({ surface }: { surface: "hails" | "forge" }) {
  return (
    <span className="rounded-full border border-[color:var(--ca-surface-border)] px-2 py-1 text-ca-2xs text-[color:var(--ca-text-muted)]">
      proscenium · {surface}
    </span>
  );
}
