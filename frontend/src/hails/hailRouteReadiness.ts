import routeReadinessDocument from "../../../config/lcard/hail-route-readiness.json";
import rendererReadinessDocument from "../../../config/lcard/hail-renderer-readiness.json";
import { enabledRoutes, routesFromHail, type HailWithDeliveryPolicy } from "./hailDeliveryRoutes";
import { roomLabel, type ManagedHailRecord } from "./hailRouteTypes";

export type { HailRooms, ManagedHailRecord } from "./hailRouteTypes";
export { LCARD_KNOWN_ROOMS, roomLabel } from "./hailRouteTypes";

const ROUTE_READINESS = routeReadinessDocument as Record<string, Record<string, string>>;
const RENDERER_READINESS = rendererReadinessDocument as Record<
  string,
  {
    primary_renderer?: string;
    fallback_renderer?: string;
    platform_scope?: string;
    operator_note?: string;
  }
>;

export function deliveryProviderLabel(provider: string): string {
  if (provider === "lcard") return "Home overlay";
  return provider.replace(/_/g, " ");
}

export function routeReadinessLines(hail: HailWithDeliveryPolicy): string[] {
  if (hail.enabled === false) {
    return ["Hail disabled — no active routes"];
  }

  const hailId = hail.id;
  const wiredMap = hailId ? ROUTE_READINESS[hailId] : undefined;
  const lines: string[] = [];

  for (const route of enabledRoutes(routesFromHail(hail))) {
    const { launch_room_id: sourceId, destination_room_id: targetId } = route;
    const key = sourceId + ":" + targetId;
    const readiness = wiredMap?.[key];
    const label = roomLabel(sourceId) + " → " + roomLabel(targetId);
    if (readiness === "wired") {
      lines.push(label + ": wired");
    } else if (readiness) {
      lines.push(label + ": " + readiness);
    } else {
      lines.push(label + ": pending adapter");
    }
  }

  return lines;
}

export function rendererReadinessLines(hail: ManagedHailRecord): string[] {
  const hailId = hail.id;
  if (!hailId) {
    return [];
  }
  const readiness = RENDERER_READINESS[hailId];
  if (!readiness) {
    return ["Renderer: pending overlay adapter"];
  }
  const lines = [
    "Primary renderer: " + (readiness.primary_renderer ?? "unknown"),
    "Fallback renderer: " + (readiness.fallback_renderer ?? "none"),
    "Platform scope: " + (readiness.platform_scope ?? "unknown"),
  ];
  if (readiness.operator_note) {
    lines.push(readiness.operator_note);
  }
  return lines;
}
