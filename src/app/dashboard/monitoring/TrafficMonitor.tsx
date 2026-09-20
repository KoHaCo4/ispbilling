"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

type TrafficSample = { time: string; rxMbps: number; txMbps: number };

/**
 * Presentational saja - tidak fetch/poll sendiri lagi (dulu di sinilah
 * sumber "fast-poll burst" 3 koneksi terpisah yang bikin loading awal
 * lama). Datanya + daftar interface dikirim dari MonitoringClient, yang
 * mengambilnya bersamaan dengan data LiveMonitor dalam satu koneksi
 * Mikrotik per siklus polling.
 */
export default function TrafficMonitor({
  interfaces,
  selectedInterface,
  onSelectInterface,
  samples,
  error,
  isLoading,
}: {
  interfaces: string[];
  selectedInterface: string;
  onSelectInterface: (name: string) => void;
  samples: TrafficSample[];
  error: string | null;
  isLoading: boolean;
}) {
  const latest = samples.length > 0 ? samples[samples.length - 1] : null;

  return (
    <div className="bg-white border border-primary-text/10 p-5 mb-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-xs uppercase tracking-wider text-muted-sage">
          Traffic Interface
        </p>
        {!isLoading && interfaces.length > 0 && (
          <select
            value={selectedInterface}
            onChange={(e) => onSelectInterface(e.target.value)}
            className="text-xs px-2 py-1.5 border border-muted-sage/40 bg-white"
          >
            {interfaces.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-sage">Memuat daftar interface...</p>
      ) : error ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">
          Gagal ambil data: {error}
        </p>
      ) : (
        <>
          <div className="flex items-center gap-6 mb-4">
            <div>
              <p className="text-xs text-muted-sage mb-0.5">Download (Rx)</p>
              <p className="font-archivo text-2xl font-bold text-primary-text">
                {latest
                  ? latest.rxMbps.toLocaleString("id-ID", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "-"}{" "}
                <span className="text-sm font-normal text-muted-sage">
                  Mbps
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-sage mb-0.5">Upload (Tx)</p>
              <p className="font-archivo text-2xl font-bold text-primary-text">
                {latest
                  ? latest.txMbps.toLocaleString("id-ID", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "-"}{" "}
                <span className="text-sm font-normal text-muted-sage">
                  Mbps
                </span>
              </p>
            </div>
          </div>

          {samples.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
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
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="rxMbps"
                  name="Download"
                  stroke="#E8A33D"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="txMbps"
                  name="Upload"
                  stroke="#7C9186"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-sage">
              Mengumpulkan sampel, grafik muncul sebentar lagi...
            </p>
          )}
        </>
      )}
    </div>
  );
}
