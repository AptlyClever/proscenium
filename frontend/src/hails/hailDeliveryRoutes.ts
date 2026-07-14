import { roomLabel, type ManagedHailRecord } from "./hailRouteTypes";

export type DeliveryRoute = {
  id: string;
  launch_room_id: string;
  destination_room_id: string;
  provider: string;
  requires_confirmation: boolean;
  enabled: boolean;
};

export type HailWithDeliveryPolicy = ManagedHailRecord & {
  delivery_policy?: { routes?: DeliveryRoute[] };
  behavior?: { requires_confirmation?: boolean; cooldown_sec?: number };
  archived?: boolean;
};

export function stableRouteId(launchRoomId: string, destinationRoomId: string, suffix = "001"): string {
  return `route.${launchRoomId}.${destinationRoomId}.${suffix}`;
}

const ROUTE_ID_RE = /^route\.[a-z0-9_]+\.[a-z0-9_]+\.[a-z0-9_]+$/;

function routeIdSuffix(routeId: string | undefined): string {
  const submitted = routeId?.trim() ?? "";
  if (ROUTE_ID_RE.test(submitted)) {
    return submitted.split(".").pop() ?? "001";
  }
  return "001";
}

/** Keep route.id aligned with launch/destination endpoints before save or after edits. */
export function normalizeRouteForSave(route: DeliveryRoute): DeliveryRoute {
  const launch = route.launch_room_id;
  const destination = route.destination_room_id;
  if (!launch || !destination) {
    return { ...route };
  }
  const normalizedId = stableRouteId(launch, destination, routeIdSuffix(route.id));
  const expectedPrefix = `route.${launch}.${destination}.`;
  if (route.id?.startsWith(expectedPrefix) && route.id === normalizedId) {
    return { ...route };
  }
  return { ...route, id: normalizedId };
}

/** Read explicit delivery_policy.routes only — legacy room lists are not a route source of truth. */
export function routesFromHail(hail: HailWithDeliveryPolicy | null | undefined): DeliveryRoute[] {
  const saved = hail?.delivery_policy?.routes;
  if (Array.isArray(saved) && saved.length) {
    return saved.map((route) => ({ ...route }));
  }
  return [];
}

export function enabledRoutes(routes: DeliveryRoute[]): DeliveryRoute[] {
  return routes.filter((route) => route.enabled !== false);
}

export function roomsFromRoutes(routes: DeliveryRoute[]): {
  allowed_source_room_ids: string[];
  allowed_target_room_ids: string[];
} {
  const active = enabledRoutes(routes);
  const sources = new Set<string>();
  const targets = new Set<string>();
  for (const route of active) {
    sources.add(route.launch_room_id);
    targets.add(route.destination_room_id);
  }
  return {
    allowed_source_room_ids: [...sources],
    allowed_target_room_ids: [...targets],
  };
}

export function routeSummaryLabel(hail: HailWithDeliveryPolicy | null | undefined): string {
  const routes = enabledRoutes(routesFromHail(hail));
  if (!routes.length) {
    return "No active route";
  }
  if (routes.length === 1) {
    const route = routes[0];
    return `${roomLabel(route.launch_room_id)} → ${roomLabel(route.destination_room_id)}`;
  }
  return `${routes.length} active routes`;
}

export function validateRoutes(routes: DeliveryRoute[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const route of routes) {
    if (!route.launch_room_id || !route.destination_room_id) {
      errors.push("Each route needs a source and destination.");
      continue;
    }
    if (route.enabled === false) {
      continue;
    }
    const key = `${route.launch_room_id}:${route.destination_room_id}`;
    if (seen.has(key)) {
      errors.push(`Duplicate enabled route: ${roomLabel(route.launch_room_id)} → ${roomLabel(route.destination_room_id)}.`);
    }
    seen.add(key);
  }

  return errors;
}

/** Patch one route in place; preserve all other routes on the Hail. */
export function patchRouteOnHail(
  existingRoutes: DeliveryRoute[],
  input: {
    loadedRouteId: string;
    sourceArea: string;
    destinationArea: string;
  },
): DeliveryRoute[] {
  const nextRoute = normalizeRouteForSave({
    id: input.loadedRouteId || stableRouteId(input.sourceArea, input.destinationArea),
    launch_room_id: input.sourceArea,
    destination_room_id: input.destinationArea,
    provider: "lcard",
    requires_confirmation: false,
    enabled: true,
  });

  let patched = false;
  const routes = existingRoutes.map((route) => {
    const matches = input.loadedRouteId
      ? route.id === input.loadedRouteId
      : !patched && route.enabled !== false;
    if (!matches) {
      return route;
    }
    patched = true;
    return normalizeRouteForSave({
      ...route,
      launch_room_id: input.sourceArea,
      destination_room_id: input.destinationArea,
    });
  });

  if (patched) {
    return routes;
  }
  if (existingRoutes.length === 0) {
    return [nextRoute];
  }
  return routes;
}

export function derivePageTemplateState(input: {
  loading: boolean;
  empty: boolean;
  selectedHail: HailWithDeliveryPolicy | null;
  isCreate: boolean;
  editorEnabled: boolean;
  editorRoutes: DeliveryRoute[];
  routeValidationErrors: string[];
  saveError: boolean;
  rendererReady: boolean;
}): string {
  if (input.loading) return "loading";
  if (input.empty) return "empty";
  if (input.saveError || input.routeValidationErrors.length) return "validation-error";
  if (input.selectedHail?.archived) return "archived-hail";
  if (!input.isCreate && input.selectedHail && input.selectedHail.enabled === false) return "disabled-hail";
  if (!input.rendererReady) return "renderer-not-ready";
  const active = enabledRoutes(input.editorRoutes);
  if (!active.length && !input.isCreate) return "no-active-routes";
  if (active.length > 1) return "multiple-routes";
  return "single-active-hail";
}
