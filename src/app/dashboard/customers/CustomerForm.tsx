"use client";

import { useState, useMemo } from "react";

type Area = { id: string; name: string };
type Router = { id: string; name: string; areaId: string };
type Package = {
  id: string;
  name: string;
  price: number;
  availableAtRouterIds: string[]; // kosong = tersedia di semua router
};

export default function CustomerForm({
  action,
  areas,
  routers,
  packages,
}: {
  action: (formData: FormData) => void;
  areas: Area[];
  routers: Router[];
  packages: Package[];
}) {
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [selectedRouterId, setSelectedRouterId] = useState("");

  // Router cuma nampilin yang sesuai area terpilih (kalau area belum
  // dipilih, tampilkan semua router)
  const filteredRouters = useMemo(
    () =>
      selectedAreaId
        ? routers.filter((r) => r.areaId === selectedAreaId)
        : routers,
    [selectedAreaId, routers],
  );

  // Paket cuma nampilin yang available di router terpilih (kosong =
  // tersedia di mana saja, jadi selalu muncul)
  const filteredPackages = useMemo(
    () =>
      selectedRouterId
        ? packages.filter(
            (p) =>
              p.availableAtRouterIds.length === 0 ||
              p.availableAtRouterIds.includes(selectedRouterId),
          )
        : packages,
    [selectedRouterId, packages],
  );

  return (
    <form
      action={action}
      className="space-y-6 bg-white border border-primary-text/10 p-6"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            Nama Lengkap
          </label>
          <input
            name="name"
            required
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            NIK (opsional)
          </label>
          <input
            name="nik"
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            No. HP
          </label>
          <input
            name="phone"
            required
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            Email (opsional)
          </label>
          <input
            name="email"
            type="email"
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            Alamat
          </label>
          <textarea
            name="address"
            required
            rows={2}
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            Area / Desa
          </label>
          <select
            name="areaId"
            required
            value={selectedAreaId}
            onChange={(e) => {
              setSelectedAreaId(e.target.value);
              setSelectedRouterId(""); // reset router kalau area diganti
            }}
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark bg-white"
          >
            <option value="">Pilih area</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            Router / Mikrotik
          </label>
          <select
            name="routerId"
            required
            value={selectedRouterId}
            onChange={(e) => setSelectedRouterId(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark bg-white"
          >
            <option value="">Pilih router</option>
            {filteredRouters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            Paket Internet
          </label>
          <select
            name="packageId"
            required
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark bg-white"
          >
            <option value="">Pilih paket</option>
            {filteredPackages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} - Rp{p.price.toLocaleString("id-ID")}/bulan
              </option>
            ))}
          </select>
          {selectedRouterId && filteredPackages.length < packages.length && (
            <p className="text-xs text-muted-sage mt-1.5">
              Menampilkan paket yang tersedia untuk router ini saja.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            Tipe Koneksi
          </label>
          <select
            name="connectionType"
            defaultValue="PPPOE"
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark bg-white"
          >
            <option value="PPPOE">PPPoE</option>
            <option value="HOTSPOT">Hotspot</option>
            <option value="STATIC_IP">Static IP</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            PPPoE Username
          </label>
          <input
            name="pppoeUsername"
            placeholder="misal: cust0001"
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            PPPoE Password
          </label>
          <input
            name="pppoePassword"
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark"
          />
        </div>
      </div>

      <button
        type="submit"
        className="bg-ink-dark text-warm-paper text-sm font-medium px-6 py-3 hover:bg-opacity-90 transition-colors"
      >
        Simpan Pelanggan
      </button>
    </form>
  );
}
