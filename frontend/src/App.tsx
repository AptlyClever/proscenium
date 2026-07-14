import { useEffect, useState } from "react";
import { HailsView } from "./hails/views/HailsView";
import { HailForgeView } from "./hails/views/HailForgeView";
import { GlyphGenerationWorkbenchView } from "./hails/views/GlyphGenerationWorkbenchView";
import { GlyphPlotView } from "./hails/views/GlyphPlotView";

const links = [
  ["Hails", "#/hails"],
  ["Forge", "#/hails/forge"],
  ["Glyph workbench", "#/hails/glyph-workbench"],
  ["Glyph plot", "#/hails/plot"],
] as const;

function currentPath() {
  return (window.location.hash.replace(/^#/, "").split("?")[0] || "/").replace(/\/+$/, "") || "/";
}

export default function App() {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const update = () => setPath(currentPath());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  let view;
  if (path === "/" || path === "/hails") view = <HailsView />;
  else if (path === "/hails/forge/new-glyph") view = <HailForgeView forgeIntent="new-glyph" />;
  else if (path === "/hails/forge") view = <HailForgeView />;
  else if (path === "/hails/glyph-workbench") view = <GlyphGenerationWorkbenchView />;
  else if (path.startsWith("/hails/plot")) {
    const parts = path.split("/").filter(Boolean);
    view = <GlyphPlotView plotId={parts[2]} edit={parts.includes("edit")} />;
  } else {
    view = <div className="ca-panel p-6">Unknown Proscenium route: {path}</div>;
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface-base)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-5 py-3">
          <a href="#/" className="mr-auto text-sm font-semibold tracking-[0.18em] uppercase">
            Proscenium
          </a>
          <nav className="flex flex-wrap gap-1" aria-label="Hails surfaces">
            {links.map(([label, href]) => (
              <a key={href} href={href} className="rounded-md px-3 py-2 text-sm text-[color:var(--ca-text-secondary)] hover:bg-[color:var(--ca-surface-raised)] hover:text-[color:var(--ca-text-primary)]">
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] p-5">{view}</main>
    </div>
  );
}
