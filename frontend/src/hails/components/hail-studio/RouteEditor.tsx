import {
  normalizeRouteForSave,
  stableRouteId,
  type DeliveryRoute,
} from "../../hailDeliveryRoutes";
import { roomLabel } from "../../hailRouteReadiness";

type RouteEditorProps = {
  knownRooms: string[];
  routes: DeliveryRoute[];
  onChange: (next: DeliveryRoute[]) => void;
  errors: string[];
};

export function RouteEditor({ knownRooms, routes, onChange, errors }: RouteEditorProps) {
  const updateRoute = (index: number, patch: Partial<DeliveryRoute>) => {
    onChange(
      routes.map((route, i) => {
        if (i !== index) return route;
        const next = { ...route, ...patch };
        if ("launch_room_id" in patch || "destination_room_id" in patch) {
          return normalizeRouteForSave(next);
        }
        return next;
      }),
    );
  };

  const removeRoute = (index: number) => {
    onChange(routes.filter((_, i) => i !== index));
  };

  const addRoute = () => {
    const launch = knownRooms[0] ?? "arcade";
    const destination = knownRooms.find((id) => id !== launch) ?? "master_bedroom";
    onChange([
      ...routes,
      {
        id: stableRouteId(launch, destination),
        launch_room_id: launch,
        destination_room_id: destination,
        provider: "lcard",
        requires_confirmation: false,
        enabled: true,
      },
    ]);
  };

  return (
    <div className="min-w-0 space-y-3" data-hail-route-editor>
      {routes.length ? (
        <div className="space-y-2">
          {routes.map((route, index) => (
            <div key={route.id || index} className="space-y-3 rounded-md border border-[color:var(--ca-surface-border)] p-3" data-hail-route-card>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-ca-2xs text-[color:var(--ca-text-secondary)]">
                  Source
                  <select className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-2 py-1.5 text-ca-sm" value={route.launch_room_id} onChange={(e) => updateRoute(index, { launch_room_id: e.target.value })}>
                    {knownRooms.map((roomId) => (
                      <option key={roomId} value={roomId}>{roomLabel(roomId)}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-ca-2xs text-[color:var(--ca-text-secondary)]">
                  Destination
                  <select className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-2 py-1.5 text-ca-sm" value={route.destination_room_id} onChange={(e) => updateRoute(index, { destination_room_id: e.target.value })}>
                    {knownRooms.map((roomId) => (
                      <option key={roomId} value={roomId}>{roomLabel(roomId)}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-4 border-t border-[color:var(--ca-surface-border)] pt-2" data-hail-route-card-controls>
                <label className="flex items-center gap-2 text-ca-2xs">
                  <input type="checkbox" className="rounded" checked={route.requires_confirmation} onChange={(e) => updateRoute(index, { requires_confirmation: e.target.checked })} />
                  Confirm
                </label>
                <label className="flex items-center gap-2 text-ca-2xs">
                  <input type="checkbox" className="rounded" checked={route.enabled !== false} onChange={(e) => updateRoute(index, { enabled: e.target.checked })} />
                  Enabled
                </label>
                <button type="button" className="ca-focusable text-ca-2xs text-[color:var(--ca-status-error-fg)] underline" onClick={() => removeRoute(index)}>
                  Remove route
                </button>
              </div>
              <p className="break-all text-ca-2xs text-[color:var(--ca-text-muted)]">
                Route id: <span className="font-mono">{route.id}</span>
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-ca-sm text-[color:var(--ca-text-muted)]">No routes yet.</p>
      )}
      {errors.length ? (
        <ul className="space-y-1 text-ca-2xs text-[color:var(--ca-status-error-fg)]" role="alert">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      ) : null}
      <button type="button" className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] px-3 py-1.5 text-ca-sm" onClick={addRoute}>
        Add route
      </button>
    </div>
  );
}
