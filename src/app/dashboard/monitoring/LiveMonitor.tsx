"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Sample = { time: string; active: number };

/**
 * Presentational saja - tidak fetch/poll sendiri lagi. Datanya dikirim dari
 * MonitoringClient, yang mengambil active count ini bersamaan dengan data
 * TrafficMonitor dalam SATU koneksi Mikrotik per siklus polling (lihat
 * lib/mikrotik/snapshot.ts untuk alasan penggabungan ini).
 */
export default function LiveMonitor({
  samples,
  totalSecrets,
  error,
  isLoading,
}: {
  samples: Sample[];
  totalSecrets: number | null;
  error: string | null;
  isLoading: boolean;
}) {
  const currentActive =
    samples.length > 0 ? samples[samples.length - 1].active : null;

  return (
    <div className="bg-white border border-primary-text/10 p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs uppercase tracking-wider text-muted-sage">
          Monitoring Langsung
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
              {currentActive}
            </span>
            <span className="text-sm text-muted-sage">
              / {totalSecrets ?? "-"} pelanggan online sekarang
            </span>
          </div>

          {samples.length > 1 && (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={samples}
                margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#7C918633"
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: "#7C9186" }}
                  axisLine={{ stroke: "#7C918633" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#7C9186" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#16231F",
                    border: "none",
                    borderRadius: 0,
                    fontSize: 12,
                    color: "#F7F5F0",
                  }}
                  labelStyle={{ color: "#F7F5F0" }}
                />
                <Line
                  type="monotone"
                  dataKey="active"
                  stroke="#E8A33D"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </>
      )}
    </div>
  );
}
