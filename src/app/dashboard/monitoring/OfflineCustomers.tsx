"use client";

import Link from "next/link";
import type { OfflineCustomer } from "./actions";

/**
 * Daftar pelanggan yang statusnya ACTIVE di billing tapi username PPPoE-nya
 * tidak terdeteksi konek di router saat snapshot terakhir diambil.
 *
 * Presentational saja, sama seperti LiveMonitor/TrafficMonitor - datanya
 * dikirim dari MonitoringClient yang sudah mencocokkan dengan Mikrotik di
 * server (lihat actions.ts).
 *
 * CATATAN: ini snapshot SAAT INI, bukan histori. Pelanggan bisa saja mati
 * listrik sebentar terus nyala lagi sebelum polling 15 detik berikutnya -
 * jadi daftar ini wajar berubah-ubah tiap siklus, bukan berarti ada yang
 * salah kalau nama yang sama hilang-muncul.
 */
export default function OfflineCustomers({
  customers,
  totalActive,
  error,
  isLoading,
}: {
  customers: OfflineCustomer[];
  totalActive: number | null;
  error: string | null;
  isLoading: boolean;
}) {
  return (
    <div className="bg-white border border-primary-text/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs uppercase tracking-wider text-muted-sage">
          Pelanggan Offline
        </p>
        <span className="text-xs text-muted-sage">Update tiap 15 detik</span>
      </div>

      {error ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">
          Gagal ambil data: {error}
        </p>
      ) : isLoading ? (
        <p className="text-sm text-muted-sage">Memuat data...</p>
      ) : (
        <>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="font-archivo text-3xl font-bold text-primary-text">
              {customers.length}
            </span>
            <span className="text-sm text-muted-sage">
              / {totalActive ?? "-"} pelanggan aktif sedang tidak terkoneksi
            </span>
          </div>

          {customers.length === 0 ? (
            <p className="text-sm text-muted-sage">
              Semua pelanggan aktif sedang online. 🎉
            </p>
          ) : (
            <div className="border border-muted-sage/20 max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-warm-paper">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-sage">
                    <th className="px-3 py-2 font-semibold">Pelanggan</th>
                    <th className="px-3 py-2 font-semibold">Username</th>
                    <th className="px-3 py-2 font-semibold">Telepon</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr
                      key={c.id}
                      className="border-t border-muted-sage/10 hover:bg-warm-paper/50"
                    >
                      <td className="px-3 py-2">
                        <Link
                          href={`/dashboard/customers/${c.id}`}
                          className="text-primary-text hover:underline"
                        >
                          {c.name}
                        </Link>
                        <span className="block text-xs text-muted-sage">
                          {c.customerNumber}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-sage">
                        {c.pppoeUsername}
                      </td>
                      <td className="px-3 py-2">
                        <a
                          href={`tel:${c.phone}`}
                          className="text-primary-text hover:underline"
                        >
                          {c.phone}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
