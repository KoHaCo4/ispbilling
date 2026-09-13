"use client";

import { useActionState } from "react";
import { testConnectionAction, type TestConnectionState } from "./actions";

export default function TestConnectionButton({
  routerId,
}: {
  routerId: string;
}) {
  const [state, formAction, isPending] = useActionState<
    TestConnectionState,
    FormData
  >(testConnectionAction, null);

  return (
    <div className="mb-4">
      <form action={formAction}>
        <input type="hidden" name="routerId" value={routerId} />
        <button
          type="submit"
          disabled={isPending}
          className="text-sm border border-muted-sage/40 text-primary-text px-4 py-2.5 hover:border-ink-dark disabled:opacity-60 transition-colors"
        >
          {isPending ? "Menghubungi router..." : "Test Koneksi Sekarang"}
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
            ? `Berhasil terhubung. Identity router: "${state.identity}"`
            : `Gagal terhubung: ${state.error}`}
        </p>
      )}
    </div>
  );
}
