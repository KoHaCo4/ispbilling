"use client";

import { useState } from "react";
import { importPackagesFromRouter } from "./import-actions";

type ProfileRow = {
  profileName: string;
  suggestedSpeed: number | null;
};

type RowState = {
  selected: boolean;
  name: string;
  speedMbps: string;
  price: string;
};

export default function PackageImportTable({
  profiles,
}: {
  profiles: ProfileRow[];
}) {
  const [rows, setRows] = useState<Record<string, RowState>>(() => {
    const initial: Record<string, RowState> = {};
    for (const p of profiles) {
      initial[p.profileName] = {
        selected: true,
        name: p.profileName,
        speedMbps: p.suggestedSpeed ? String(p.suggestedSpeed) : "",
        price: "",
      };
    }
    return initial;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);

  function updateRow(profileName: string, patch: Partial<RowState>) {
    setRows((prev) => ({
      ...prev,
      [profileName]: { ...prev[profileName], ...patch },
    }));
  }

  async function handleSubmit() {
    setIsSubmitting(true);

    const selectedRows = profiles
      .filter((p) => rows[p.profileName]?.selected)
      .map((p) => ({
        profileName: p.profileName,
        name: rows[p.profileName].name,
        speedMbps: Number(rows[p.profileName].speedMbps),
        price: Number(rows[p.profileName].price),
      }));

    const res = await importPackagesFromRouter(selectedRows);
    setResult(res);
    setIsSubmitting(false);
  }

  const selectedCount = Object.values(rows).filter((r) => r.selected).length;
  const incompleteCount = profiles.filter(
    (p) =>
      rows[p.profileName]?.selected &&
      (!rows[p.profileName]?.price.trim() ||
        !rows[p.profileName]?.speedMbps.trim()),
  ).length;

  if (result) {
    return (
      <div className="bg-white border border-primary-text/10 p-6">
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-3 mb-4">
          Import selesai: {result.imported} paket berhasil ditambahkan,{" "}
          {result.skipped} dilewati.
        </p>
        <a
          href="/dashboard/packages"
          className="text-sm text-ink-dark hover:text-signal-amber underline"
        >
          Lihat daftar paket →
        </a>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <p className="text-sm text-muted-sage">
        Semua profile di router ini sudah ter-mapping ke paket yang ada di web.
        Tidak ada yang perlu diimport.
      </p>
    );
  }

  return (
    <div>
      <div className="bg-white border border-primary-text/10 overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-primary-text/10 text-left text-xs uppercase tracking-wider text-muted-sage">
              <th className="px-3 py-3 w-10"></th>
              <th className="px-3 py-3">Profile Mikrotik</th>
              <th className="px-3 py-3">Nama Paket</th>
              <th className="px-3 py-3">Speed (Mbps)</th>
              <th className="px-3 py-3">Harga (Rp/bulan)</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => {
              const row = rows[p.profileName];
              return (
                <tr
                  key={p.profileName}
                  className="border-b border-primary-text/5 last:border-0"
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={(e) =>
                        updateRow(p.profileName, { selected: e.target.checked })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-sage">
                    {p.profileName}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.name}
                      onChange={(e) =>
                        updateRow(p.profileName, { name: e.target.value })
                      }
                      className="w-full px-2 py-1.5 border border-muted-sage/40 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={row.speedMbps}
                      onChange={(e) =>
                        updateRow(p.profileName, { speedMbps: e.target.value })
                      }
                      placeholder={p.suggestedSpeed ? undefined : "isi manual"}
                      className={`w-24 px-2 py-1.5 border text-sm ${
                        row.selected && !row.speedMbps.trim()
                          ? "border-red-400 bg-red-50"
                          : "border-muted-sage/40"
                      }`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={row.price}
                      onChange={(e) =>
                        updateRow(p.profileName, { price: e.target.value })
                      }
                      placeholder="0"
                      className={`w-32 px-2 py-1.5 border text-sm ${
                        row.selected && !row.price.trim()
                          ? "border-red-400 bg-red-50"
                          : "border-muted-sage/40"
                      }`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {incompleteCount > 0 && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-2.5 mb-3">
          Lengkapi Speed dan Harga untuk {incompleteCount} baris yang dipilih
          sebelum import.
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={isSubmitting || selectedCount === 0 || incompleteCount > 0}
        className="bg-ink-dark text-warm-paper text-sm font-medium px-6 py-3 hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting
          ? "Mengimport..."
          : `Import ${selectedCount} Paket Terpilih`}
      </button>
    </div>
  );
}
