/** TV glyph parity probe graphs — 48×48 grid, procedural_graph v1 */

function pathRow(d, extra = {}) {
  return {
    d,
    stroke: "currentColor",
    stroke_width: 2.5,
    fill: "none",
    opacity: 1,
    stroke_linecap: "round",
    ...extra,
  };
}

const CASES = {
  baseline: {
    notes: "3 stroke paths — current fleet baseline (field + charge)",
    graph: {
      version: 1,
      generator_id: "probe_baseline",
      signature: "probe-baseline-v1",
      paths: [
        pathRow("M14 34 L24 12 L34 34 Z", { opacity: 0.42, stroke_width: 2.2 }),
        pathRow("M24 18 L24 30", { stroke_width: 3.0 }),
        pathRow("M18 26 L30 26", { stroke_width: 2.8 }),
      ],
    },
  },
  fill_paths: {
    notes: "Closed paths with fill + stroke — tests fill field in payload",
    graph: {
      version: 1,
      generator_id: "probe_fill",
      signature: "probe-fill-v1",
      paths: [
        pathRow("M14 34 L24 12 L34 34 Z", {
          fill: "currentColor",
          opacity: 0.35,
          stroke_width: 2.0,
        }),
        pathRow("M24 18 L24 30", { stroke_width: 3.0 }),
        pathRow("M18 26 L30 26", { stroke_width: 2.8 }),
      ],
    },
  },
  circles: {
    notes: "circles[] array — sniffer-style eye dots + halo stroke",
    graph: {
      version: 1,
      generator_id: "probe_circles",
      signature: "probe-circles-v1",
      paths: [
        pathRow("M24 24 m-18 0 a18 18 0 1 0 36 0 a18 18 0 1 0 -36 0", {
          opacity: 0.28,
          stroke_width: 2.0,
        }),
        pathRow("M16 28c0-4 3-8 8-8", { stroke_width: 3.0 }),
        pathRow("M32 28c0-4 -3-8 -8-8", { stroke_width: 3.0 }),
      ],
      circles: [
        { cx: 20, cy: 22, r: 2.5, fill: "currentColor", opacity: 0.9 },
        { cx: 28, cy: 22, r: 2.5, fill: "currentColor", opacity: 0.9 },
      ],
    },
  },
  depth_layers: {
    notes: "6 opacity-layered strokes — shadow/ground/mass/accent depth",
    graph: {
      version: 1,
      generator_id: "probe_depth",
      signature: "probe-depth-v1",
      paths: [
        pathRow("M15 35 L25 13 L35 35 Z", { opacity: 0.22, stroke_width: 3.5 }),
        pathRow("M16 34 L25 14 L34 34 Z", { opacity: 0.38, stroke_width: 2.8 }),
        pathRow("M17 33 L25 15 L33 33 Z", { opacity: 0.55, stroke_width: 2.4 }),
        pathRow("M24 19 L24 29", { opacity: 1.0, stroke_width: 3.2 }),
        pathRow("M19 27 L29 27", { opacity: 0.92, stroke_width: 2.6 }),
        pathRow("M22 16 L26 16", { opacity: 0.65, stroke_width: 1.8 }),
      ],
    },
  },
  round_caps: {
    notes: "Explicit round caps + butt control path — cap semantics test",
    graph: {
      version: 1,
      generator_id: "probe_caps",
      signature: "probe-caps-v1",
      paths: [
        pathRow("M14 24 L34 24", { stroke_width: 4.0, stroke_linecap: "round" }),
        pathRow("M24 14 L24 34", { stroke_width: 4.0, stroke_linecap: "round" }),
        pathRow("M18 18 L30 30", { stroke_width: 2.5, stroke_linecap: "butt" }),
      ],
    },
  },
};

function buildProbeCase(caseId) {
  const row = CASES[caseId];
  if (!row) {
    return null;
  }
  return row;
}

module.exports = { buildProbeCase, CASES };
