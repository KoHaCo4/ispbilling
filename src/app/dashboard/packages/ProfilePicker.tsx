"use client";

import { useActionState, useState, startTransition } from "react";
import { fetchRouterProfilesAction, type FetchProfilesState } from "./actions";

export default function ProfilePicker({
  routers,
  onPick,
}: {
  routers: { id: string; name: string }[];
  onPick: (profileName: string) => void;
}) {
  const [selectedRouterId, setSelectedRouterId] = useState(
    routers[0]?.id ?? "",
  );
  const [state, formAction, isPending] = useActionState<
    FetchProfilesState,
    FormData
  >(fetchRouterProfilesAction, null);

  function handleFetch() {
    const fd = new FormData();
    fd.set("routerId", selectedRouterId);
    startTransition(() => {
      formAction(fd);
    });
  }

  return (
    <div className="border border-muted-sage/30 p-4 mt-2">
      <p className="text-xs text-muted-sage mb-3">
        Lihat profile yang sudah ada di router tertentu, buat bantu pilih nama
        yang benar (opsional - tidak wajib dipakai).
      </p>
      <div className="flex gap-2 mb-3">
        <select
          value={selectedRouterId}
          onChange={(e) => setSelectedRouterId(e.target.value)}
          className="flex-1 px-3 py-2 border border-muted-sage/40 text-sm bg-white"
        >
          {routers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleFetch}
          disabled={isPending}
          className="text-sm border border-muted-sage/40 px-3 py-2 hover:border-ink-dark disabled:opacity-60 transition-colors whitespace-nowrap"
        >
          {isPending ? "Mengambil..." : "Lihat Profile"}
        </button>
      </div>

      {state && !state.success && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2">
          Gagal: {state.error}
        </p>
      )}

      {state && state.success && (
        <div className="space-y-1">
          {state.profiles.length === 0 && (
            <p className="text-xs text-muted-sage">
              Belum ada profile di router ini.
            </p>
          )}
          {state.profiles.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => onPick(p.name)}
              className="w-full flex justify-between text-left text-xs px-3 py-2 border border-muted-sage/20 hover:border-ink-dark hover:bg-warm-paper transition-colors"
            >
              <span className="font-mono text-primary-text">{p.name}</span>
              <span className="text-muted-sage">{p.rateLimit}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
