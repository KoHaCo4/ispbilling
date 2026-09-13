"use client";

import { useState } from "react";
import { importSelectedCustomers } from "./actions";

type MikrotikSecret = {
  username: string;
  profile: string;
  comment: string;
  disabled: boolean;
};

type RowState = {
  selected: boolean;
  name: string;
  phone: string;
  address: string;
  packageId: string;
};

export default function ImportPreviewTable({
  routerId,
  secrets,
  packages,
  alreadyImportedUsernames,
}: {
  routerId: string;
  secrets: MikrotikSecret[];
  packages: { id: string; name: string }[];
  alreadyImportedUsernames: string[];
}) {
  const [rows, setRows] = useState<Record<string, RowState>>(() => {
    const initial: Record<string, RowState> = {};
    for (const s of secrets) {
      const alreadyImported = alreadyImportedUsernames.includes(s.username);
      initial[s.username] = {
        selected: !alreadyImported,
        name: s.comment || s.username,
        phone: "",
        address: "",
        packageId: packages[0]?.id ?? "",
      };
    }
    return initial;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);

  function updateRow(username: string, patch: Partial<RowState>) {
    setRows((prev) => ({
      ...prev,
      [username]: { ...prev[username], ...patch },
    }));
  }

  async function handleSubmit() {
    setIsSubmitting(true);

    const selectedRows = secrets
      .filter((s) => rows[s.username]?.selected)
      .map((s) => ({
        username: s.username,
        profile: s.profile,
        disabled: s.disabled,
        name: rows[s.username].name,
        phone: rows[s.username].phone,
        address: rows[s.username].address,
        packageId: rows[s.username].packageId,
      }));

    const res = await importSelectedCustomers(routerId, selectedRows);
    setResult(res);
    setIsSubmitting(false);
  }

  const selectedCount = Object.values(rows).filter((r) => r.selected).length;
  const incompleteCount = secrets.filter(
    (s) => rows[s.username]?.selected && !rows[s.username]?.phone.trim(),
  ).length;

  if (result) {
    return (
      <div className="bg-white border border-primary-text/10 p-6">
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-3 mb-4">
          Import selesai: {result.imported} pelanggan berhasil ditambahkan,{" "}
          {result.skipped} dilewati (username sudah terpakai atau data tidak
          lengkap).
        </p>
        <a
          href="/dashboard/customers"
          className="text-sm text-ink-dark hover:text-signal-amber underline"
        >
          Lihat daftar pelanggan →
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white border border-primary-text/10 overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-primary-text/10 text-left text-xs uppercase tracking-wider text-muted-sage">
              <th className="px-3 py-3 w-10"></th>
              <th className="px-3 py-3">Username PPPoE</th>
              <th className="px-3 py-3">Nama</th>
              <th className="px-3 py-3">No. HP</th>
              <th className="px-3 py-3">Alamat</th>
              <th className="px-3 py-3">Paket</th>
              <th className="px-3 py-3">Status di Mikrotik</th>
            </tr>
          </thead>
          <tbody>
            {secrets.map((s) => {
              const alreadyImported = alreadyImportedUsernames.includes(
                s.username,
              );
              const row = rows[s.username];
              return (
                <tr
                  key={s.username}
                  className={`border-b border-primary-text/5 last:border-0 ${
                    alreadyImported ? "opacity-40" : ""
                  }`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      disabled={alreadyImported}
                      onChange={(e) =>
                        updateRow(s.username, { selected: e.target.checked })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-sage">
                    {s.username}
                    {alreadyImported && (
                      <span className="block text-[10px] text-muted-sage/70">
                        (sudah pernah diimport)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.name}
                      onChange={(e) =>
                        updateRow(s.username, { name: e.target.value })
                      }
                      className="w-full px-2 py-1.5 border border-muted-sage/40 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.phone}
                      onChange={(e) =>
                        updateRow(s.username, { phone: e.target.value })
                      }
                      placeholder="08xxx"
                      className={`w-full px-2 py-1.5 border text-sm ${
                        row.selected && !row.phone.trim()
                          ? "border-red-400 bg-red-50"
                          : "border-muted-sage/40"
                      }`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.address}
                      onChange={(e) =>
                        updateRow(s.username, { address: e.target.value })
                      }
                      placeholder="Alamat singkat"
                      className="w-full px-2 py-1.5 border border-muted-sage/40 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.packageId}
                      onChange={(e) =>
                        updateRow(s.username, { packageId: e.target.value })
                      }
                      className="w-full px-2 py-1.5 border border-muted-sage/40 text-sm bg-white"
                    >
                      {packages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {s.disabled ? (
                      <span className="text-red-700">
                        Disabled (akan jadi Isolir)
                      </span>
                    ) : (
                      <span className="text-green-700">
                        Enabled (akan jadi Aktif)
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {incompleteCount > 0 && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-2.5 mb-3">
          Lengkapi No. HP untuk {incompleteCount} baris yang dipilih (ditandai
          merah) sebelum import.
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={isSubmitting || selectedCount === 0 || incompleteCount > 0}
        className="bg-ink-dark text-warm-paper text-sm font-medium px-6 py-3 hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting
          ? "Mengimport..."
          : `Import ${selectedCount} Pelanggan Terpilih`}
      </button>
    </div>
  );
}
