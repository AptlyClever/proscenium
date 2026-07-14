type HailsRoute =
  | { name: "axiom-hails" }
  | { name: "axiom-hails-forge"; forgeIntent?: "new-glyph" }
  | { name: "axiom-hails-glyph-workbench" }
  | { name: "axiom-hails-glyph-plot"; plotId?: string; plotEdit?: boolean };

export function routePath(route: HailsRoute): string {
  switch (route.name) {
    case "axiom-hails-forge":
      return route.forgeIntent === "new-glyph" ? "#/hails/forge/new-glyph" : "#/hails/forge";
    case "axiom-hails-glyph-workbench":
      return "#/hails/glyph-workbench";
    case "axiom-hails-glyph-plot":
      return route.plotId ? `#/hails/plot/${encodeURIComponent(route.plotId)}` : "#/hails/plot";
    default:
      return "#/hails";
  }
}
