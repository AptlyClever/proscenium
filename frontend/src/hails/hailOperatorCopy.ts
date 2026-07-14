import type { HailPreviewValidation } from "./hailVisualContract";

export function humanPreviewStatus(raw: string): string {
  if (raw === "Preview ready") return "Ready to preview";
  if (raw === "Preview not ready yet") return "Needs setup";
  if (raw === "Inactive") return "Off";
  return raw;
}

export function humanPreviewFetchStatus(isFetching: boolean): string | null {
  if (isFetching) return "Updating preview…";
  return null;
}

export function humanValidationStatus(validation: HailPreviewValidation | undefined): string | null {
  if (!validation) return null;
  if (validation.valid) return "Looks good";
  const count = validation.warnings?.length ?? 0;
  if (count > 1) return `Needs a look (${count})`;
  return "Needs a look";
}

export function humanRouteReadinessLine(line: string): string {
  const wired = line.match(/^(.+): wired$/);
  if (wired) return `${wired[1]} is connected`;
  const pending = line.match(/^(.+): pending adapter$/);
  if (pending) return `${pending[1]} is not connected yet`;
  const colon = line.indexOf(": ");
  if (colon > 0) {
    const label = line.slice(0, colon);
    const status = line.slice(colon + 2);
    return `${label}: ${status.replace(/_/g, " ")}`;
  }
  return line;
}

export function humanRouteValidationError(error: string): string {
  if (!error.trim()) return "Route needs fixing";
  return error.charAt(0).toUpperCase() + error.slice(1);
}

export function humanValidationPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "Field";
  return trimmed
    .replace(/^\//, "")
    .replace(/\//g, " · ")
    .replace(/\./g, " · ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function humanRendererReadinessLine(line: string): string {
  if (line.startsWith("Primary renderer:")) {
    const renderer = line.slice("Primary renderer:".length).trim();
    return renderer ? `Preview uses ${renderer.replace(/_/g, " ")}` : "Preview engine assigned";
  }
  return humanRouteReadinessLine(line);
}

export function humanAttentionSummary(input: {
  routeValidationErrors: string[];
  readinessLines: string[];
  rendererLines: string[];
  previewStatus: string;
}): string | null {
  if (input.routeValidationErrors.length) {
    return humanRouteValidationError(input.routeValidationErrors[0]);
  }
  const notConnected = input.readinessLines.filter((line) => line.includes("pending adapter"));
  if (notConnected.length === 1) {
    return "1 route still needs setup";
  }
  if (notConnected.length > 1) {
    return `${notConnected.length} routes still need setup`;
  }
  if (input.previewStatus === "Preview not ready yet" || input.previewStatus === "Needs setup") {
    return "Preview needs setup — see Advanced below";
  }
  const hasRenderer = input.rendererLines.some((line) => line.startsWith("Primary renderer:"));
  if (!hasRenderer && input.rendererLines.length) {
    return "Preview engine not ready yet";
  }
  return null;
}
