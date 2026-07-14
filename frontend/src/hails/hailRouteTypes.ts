/** Shared route/hail record types — no imports from delivery or readiness modules (avoids TDZ cycles). */

export type HailRooms = {
  allowed_source_room_ids?: string[];
  allowed_target_room_ids?: string[];
};

export type ManagedHailRecord = {
  id?: string;
  display_id?: string;
  name?: string;
  enabled?: boolean;
  icon?: { kind?: string; value?: string; label?: string };
  message?: { short_text?: string };
  rooms?: HailRooms;
};

export const LCARD_KNOWN_ROOMS: { id: string; label: string }[] = [
  { id: "arcade", label: "Arcade" },
  { id: "master_bedroom", label: "Master Bedroom" },
  { id: "away_team", label: "Away Team" },
];

export function roomLabel(roomId: string): string {
  const match = LCARD_KNOWN_ROOMS.find((room) => room.id === roomId);
  return match ? match.label : roomId.replace(/_/g, " ");
}
