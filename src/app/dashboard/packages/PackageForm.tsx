"use client";

import { useState } from "react";
import ProfilePicker from "./ProfilePicker";

type PackageFormData = {
  id?: string;
  name: string;
  speedMbps: number;
  price: number;
  mikrotikProfile: string | null;
  isActive: boolean;
  availableAtRouterIds: string[];
};

export default function PackageForm({
  action,
  initialData,
  routers,
}: {
  action: (formData: FormData) => void;
  initialData?: PackageFormData;
  routers: { id: string; name: string; areaName: string }[];
}) {
  const [mikrotikProfile, setMikrotikProfile] = useState(
    initialData?.mikrotikProfile ?? "",
  );
  const [selectedRouterIds, setSelectedRouterIds] = useState<string[]>(
    initialData?.availableAtRouterIds ?? [],
  );

  function toggleRouter(routerId: string) {
    setSelectedRouterIds((prev) =>
      prev.includes(routerId)
        ? prev.filter((id) => id !== routerId)
        : [...prev, routerId],
    );
  }

  return (
    <form
      action={action}
      className="space-y-4 bg-white border border-primary-text/10 p-6"
    >
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
          Nama Paket
        </label>
        <input
          name="name"
          required
          defaultValue={initialData?.name}
          placeholder="misal: Paket Hemat 10 Mbps"
          className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            Speed (Mbps)
          </label>
          <input
            name="speedMbps"
            type="number"
            required
            defaultValue={initialData?.speedMbps}
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            Harga (Rp/bulan)
          </label>
          <input
            name="price"
            type="number"
            required
            defaultValue={initialData?.price}
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
          Nama PPP Profile di Mikrotik (opsional)
        </label>
        <input
          name="mikrotikProfile"
          value={mikrotikProfile}
          onChange={(e) => setMikrotikProfile(e.target.value)}
          placeholder="Kosongkan untuk auto-generate dari nama paket"
          className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm font-mono focus:outline-none focus:border-ink-dark"
        />
        <p className="text-xs text-muted-sage mt-1.5">
          Isi ini kalau ISP kamu sudah punya profile dengan nama tertentu di
          Mikrotik dan mau dipakai apa adanya (bukan dibuatkan baru). Kosongkan
          kalau mau sistem yang buatkan otomatis.
        </p>
        {routers.length > 0 && (
          <ProfilePicker routers={routers} onPick={setMikrotikProfile} />
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
          Tersedia di Router (opsional)
        </label>
        <p className="text-xs text-muted-sage mb-2">
          Kosongkan semua kalau paket ini boleh dipakai di router manapun.
          Centang salah satu kalau paket ini cuma boleh didaftarkan ke pelanggan
          di router tertentu (misal paket tinggi yang backhaul-nya cuma cukup di
          beberapa titik).
        </p>
        <div className="border border-muted-sage/30 p-3 space-y-1.5 max-h-48 overflow-y-auto">
          {routers.map((r) => (
            <label
              key={r.id}
              className="flex items-center gap-2 text-sm text-primary-text"
            >
              <input
                type="checkbox"
                checked={selectedRouterIds.includes(r.id)}
                onChange={() => toggleRouter(r.id)}
                className="h-4 w-4"
              />
              {r.name}{" "}
              <span className="text-muted-sage text-xs">({r.areaName})</span>
            </label>
          ))}
        </div>
        {selectedRouterIds.map((id) => (
          <input
            key={id}
            type="hidden"
            name="availableAtRouterIds"
            value={id}
          />
        ))}
      </div>

      {initialData && (
        <label className="flex items-center gap-2 text-sm text-primary-text">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={initialData.isActive}
            className="h-4 w-4"
          />
          Paket aktif (tersedia untuk pelanggan baru)
        </label>
      )}

      <button
        type="submit"
        className="bg-ink-dark text-warm-paper text-sm font-medium px-6 py-3 hover:bg-opacity-90 transition-colors"
      >
        {initialData ? "Simpan Perubahan" : "Simpan Paket"}
      </button>
    </form>
  );
}
