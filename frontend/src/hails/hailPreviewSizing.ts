import deliveryTargetsDoc from "../../../config/hails/hail-delivery-targets.json";
import {
  DISPLAY_CLASS_PROJECTOR,
  DISPLAY_CLASS_STICK_OLED,
  normalizeDisplayClass,
  type DisplayClass,
} from "./hailDisplayClass";
import { enabledRoutes, type DeliveryRoute } from "./hailDeliveryRoutes";
import { roomLabel } from "./hailRouteTypes";
import type { HailVisualFields } from "./hailVisualContract";

type DeliveryTarget = {
  delivery_target_id?: string;
  display_class?: string;
};

type DeliveryTargetsDoc = {
  targets?: Record<string, DeliveryTarget>;
};

const fleetTargets = (deliveryTargetsDoc as DeliveryTargetsDoc).targets ?? {};

export function displayClassForRoom(roomId: string | null | undefined): DisplayClass {
  if (!roomId) {
    return DISPLAY_CLASS_STICK_OLED;
  }
  const target = fleetTargets[roomId];
  return normalizeDisplayClass(target?.display_class);
}

export function displayClassLabel(displayClass: string | null | undefined): string {
  const normalized = normalizeDisplayClass(displayClass);
  return normalized === DISPLAY_CLASS_PROJECTOR ? "projector" : "stick / OLED";
}

export function resolvePreviewRoomId(input: {
  previewRoomId?: string | null;
  deliveryRoutes?: DeliveryRoute[] | null;
}): string | null {
  const explicit = input.previewRoomId?.trim();
  if (explicit) {
    return explicit;
  }
  const routes = input.deliveryRoutes ?? [];
  const primary = enabledRoutes(routes)[0] ?? routes[0] ?? null;
  return primary?.destination_room_id?.trim() || null;
}

export type PreviewSizingContext = {
  roomId: string | null;
  roomLabel: string | null;
  displayClass: DisplayClass;
  label: string;
};

export function resolvePreviewSizing(input: {
  previewRoomId?: string | null;
  deliveryRoutes?: DeliveryRoute[] | null;
  visual?: Pick<HailVisualFields, "priorityLevel"> | null;
  payloadDisplayClass?: unknown;
  payloadRoomId?: unknown;
}): PreviewSizingContext {
  const roomId =
    (typeof input.payloadRoomId === "string" && input.payloadRoomId.trim()) ||
    resolvePreviewRoomId(input);
  const displayClass = normalizeDisplayClass(
    input.payloadDisplayClass ?? (roomId ? displayClassForRoom(roomId) : DISPLAY_CLASS_STICK_OLED),
  );
  const roomLabelText = roomId ? roomLabel(roomId) : null;
  const label = roomLabelText
    ? `Sized for: ${roomLabelText} (${displayClassLabel(displayClass)})`
    : `Sized for: stick / OLED (${displayClassLabel(DISPLAY_CLASS_STICK_OLED)})`;

  return {
    roomId,
    roomLabel: roomLabelText,
    displayClass,
    label,
  };
}
