export type HailPriorityLevel = "green" | "yellow" | "red";

export const HAIL_PRIORITY_LEVELS: { id: HailPriorityLevel; label: string; hint: string }[] = [
  { id: "green", label: "Green", hint: "Everyday" },
  { id: "yellow", label: "Yellow", hint: "Urgent, not important" },
  { id: "red", label: "Red", hint: "Important, immediate" },
];

export const DEFAULT_PRIORITY_LEVEL: HailPriorityLevel = "green";

export function normalizePriorityLevel(value: unknown): HailPriorityLevel {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "yellow" || normalized === "red") {
    return normalized;
  }
  return "green";
}
