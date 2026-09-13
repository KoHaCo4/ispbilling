"use client";

import { useActionState } from "react";
import { syncAllPackagesAction, type SyncPackagesState } from "./actions";

export default function SyncPackagesButton({ routerId }: { routerId: string }) {
  const [state, formAction, isPending] = useActionState<
    SyncPackagesState,
    FormData
  >(syncAllPackagesAction, null);

  return (
    <div className="mb-4">
      <form action={formAction}>
        <input type="hidden" name="routerId" value={routerId} />
        <button
          type="submit"
          disabled={isPending}
          className="text-sm border border-muted-sage/40 text-primary-text px-4 py-2.5 hover:border-ink-dark disabled:opacity-60 transition-colors"
        >
          {isPending
            ? "Sinkronisasi profile..."
            : "Sync Semua Paket ke Router Ini"}
        </button>
      </form>

      {state && (
        <p
          className={`text-sm mt-2 px-3.5 py-2.5 border ${
            state.success
              ? "text-green-700 bg-green-50 border-green-200"
              : "text-red-700 bg-red-50 border-red-200"
          }`}
        >
          {state.success
            ? `Berhasil sync ${state.synced} profile paket${state.failed > 0 ? `, ${state.failed} gagal` : ""}.`
            : `Gagal: ${state.error}`}
        </p>
      )}
    </div>
  );
}
