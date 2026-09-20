"use client";

import { useEffect, useRef, useState } from "react";
import TrafficMonitor from "./TrafficMonitor";
import LiveMonitor from "./LiveMonitor";
import { getMonitoringSnapshotAction } from "./actions";

type RouterOption = { id: string; name: string; areaName: string };
type ActiveSample = { time: string; active: number };
type TrafficSample = { time: string; rxMbps: number; txMbps: number };
type RawByteSample = { rxByte: number; txByte: number; timestamp: number };

type StoredState = {
  activeSamples: ActiveSample[];
  trafficSamples: TrafficSample[];
  prevRaw: RawByteSample | null;
  selectedInterface: string;
  savedAt: number;
};

const POLL_INTERVAL_MS = 15000;
// 1x follow-up cepat setelah snapshot pertama, biar grafik traffic langsung
// punya 2 titik (buat hitung Mbps) tanpa harus nunggu siklus 15 detik
// berikutnya. Cuma 1 koneksi tambahan, bukan burst 3 koneksi seperti versi
// lama.
const QUICK_FOLLOWUP_MS = 2000;
const MAX_SAMPLES = 20;
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

function storageKey(routerId: string) {
  return `monitoring-snapshot:${routerId}`;
}

function loadStored(routerId: string): StoredState | null {
  try {
    const raw = localStorage.getItem(storageKey(routerId));
    if (!raw) return null;
    const parsed: StoredState = JSON.parse(raw);
    if (Date.now() - parsed.savedAt > STALE_THRESHOLD_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveStored(routerId: string, state: Omit<StoredState, "savedAt">) {
  try {
    localStorage.setItem(
      storageKey(routerId),
      JSON.stringify({ ...state, savedAt: Date.now() }),
    );
  } catch {
    // localStorage penuh/diblokir - aman diabaikan
  }
}

function formatMbps(bitsPerSecond: number) {
  return Math.round((bitsPerSecond / 1_000_000) * 100) / 100;
}

function nowLabel() {
  return new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const SELECTED_ROUTER_KEY = "monitoring-selected-router";

export default function MonitoringClient({
  routers,
}: {
  routers: RouterOption[];
}) {
  // Default-nya router pertama dulu (harus sama antara render server & client
  // supaya tidak hydration-mismatch). Router yang terakhir dipilih dibaca
  // dari localStorage di useEffect di bawah, sesaat setelah mount.
  const [selectedRouterId, setSelectedRouterId] = useState(
    routers[0]?.id ?? "",
  );

  // Ingat pilihan router terakhir lintas kunjungan/navigasi halaman - tanpa
  // ini, tiap kali pindah halaman lalu balik ke Monitoring, komponen ini
  // di-unmount total oleh Next.js sehingga state selectedRouterId hilang
  // dan balik ke router pertama.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SELECTED_ROUTER_KEY);
      if (saved && routers.some((r) => r.id === saved)) {
        setSelectedRouterId(saved);
      }
    } catch {
      // localStorage diblokir/tidak tersedia - aman diabaikan, tetap pakai default
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRouterChange(id: string) {
    setSelectedRouterId(id);
    try {
      localStorage.setItem(SELECTED_ROUTER_KEY, id);
    } catch {
      // localStorage diblokir/tidak tersedia - aman diabaikan
    }
  }

  if (routers.length === 0) {
    return (
      <p className="text-sm text-muted-sage">
        Belum ada router terdaftar. Tambahkan router dulu di menu Router /
        Mikrotik.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
          Pilih Router
        </label>
        <select
          value={selectedRouterId}
          onChange={(e) => handleRouterChange(e.target.value)}
          className="w-full max-w-sm px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark bg-white"
        >
          {routers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.areaName})
            </option>
          ))}
        </select>
      </div>

      {/* key={selectedRouterId} memaksa remount total tiap ganti router,
          supaya polling & data lama dari router sebelumnya tidak
          ketuker/nyampur dengan router yang baru dipilih */}
      <RouterMonitoring key={selectedRouterId} routerId={selectedRouterId} />
    </div>
  );
}

function RouterMonitoring({ routerId }: { routerId: string }) {
  const stored = useRef(loadStored(routerId)).current;

  const [activeSamples, setActiveSamples] = useState<ActiveSample[]>(
    stored?.activeSamples ?? [],
  );
  const [totalSecrets, setTotalSecrets] = useState<number | null>(null);
  const [trafficSamples, setTrafficSamples] = useState<TrafficSample[]>(
    stored?.trafficSamples ?? [],
  );
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [selectedInterface, setSelectedInterface] = useState<string>(
    stored?.selectedInterface ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(stored === null);

  // Ref "bayangan" dari state di atas - dibutuhkan karena poll() dipanggil
  // dari setInterval/setTimeout dan harus selalu baca+tulis nilai TERBARU,
  // bukan nilai yang ke-capture pas render pertama (stale closure).
  const activeSamplesRef = useRef(activeSamples);
  const trafficSamplesRef = useRef(trafficSamples);
  const prevRawRef = useRef<RawByteSample | null>(stored?.prevRaw ?? null);
  const pollingInterfaceRef = useRef<string>(stored?.selectedInterface ?? "");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const quickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function poll(interfaceOverride?: string) {
    const requested = interfaceOverride ?? pollingInterfaceRef.current;
    const result = await getMonitoringSnapshotAction(
      routerId,
      requested || undefined,
    );
    setIsLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    setError(null);

    const snap = result.snapshot;
    setTotalSecrets(snap.totalSecrets);
    setInterfaces(snap.interfaceNames);

    const effectiveInterface = snap.selectedInterface ?? "";
    if (effectiveInterface !== pollingInterfaceRef.current) {
      pollingInterfaceRef.current = effectiveInterface;
      setSelectedInterface(effectiveInterface);
    }

    const nextActive = [
      ...activeSamplesRef.current,
      { time: nowLabel(), active: snap.activeCount },
    ].slice(-MAX_SAMPLES);
    activeSamplesRef.current = nextActive;
    setActiveSamples(nextActive);

    if (snap.rxByte !== null && snap.txByte !== null) {
      const current: RawByteSample = {
        rxByte: snap.rxByte,
        txByte: snap.txByte,
        timestamp: snap.timestamp,
      };
      const prev = prevRawRef.current;

      if (
        prev &&
        current.rxByte >= prev.rxByte &&
        current.txByte >= prev.txByte
      ) {
        const deltaSeconds = (current.timestamp - prev.timestamp) / 1000;
        if (deltaSeconds > 0) {
          const rxBps = ((current.rxByte - prev.rxByte) * 8) / deltaSeconds;
          const txBps = ((current.txByte - prev.txByte) * 8) / deltaSeconds;
          const nextTraffic = [
            ...trafficSamplesRef.current,
            {
              time: nowLabel(),
              rxMbps: formatMbps(rxBps),
              txMbps: formatMbps(txBps),
            },
          ].slice(-MAX_SAMPLES);
          trafficSamplesRef.current = nextTraffic;
          setTrafficSamples(nextTraffic);
        }
      }
      prevRawRef.current = current;
    }

    saveStored(routerId, {
      activeSamples: activeSamplesRef.current,
      trafficSamples: trafficSamplesRef.current,
      prevRaw: prevRawRef.current,
      selectedInterface: pollingInterfaceRef.current,
    });
  }

  function startPollingSequence(interfaceOverride?: string) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (quickTimeoutRef.current) clearTimeout(quickTimeoutRef.current);

    let cancelled = false;
    (async () => {
      await poll(interfaceOverride);
      if (cancelled) return;

      if (trafficSamplesRef.current.length < 2) {
        quickTimeoutRef.current = setTimeout(async () => {
          if (cancelled) return;
          await poll();
          if (cancelled) return;
          intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
        }, QUICK_FOLLOWUP_MS);
      } else {
        intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
      }
    })();

    return () => {
      cancelled = true;
    };
  }

  useEffect(() => {
    const stop = startPollingSequence(pollingInterfaceRef.current || undefined);
    return () => {
      stop();
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (quickTimeoutRef.current) clearTimeout(quickTimeoutRef.current);
    };
    // Cuma jalan sekali per mount - ganti router sudah ditangani lewat
    // remount total (key di MonitoringClient), jadi tidak perlu dep [routerId].
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectInterface(name: string) {
    if (name === pollingInterfaceRef.current) return;

    // Byte counter mentah beda basis per interface - reset dulu data
    // traffic biar tidak menghitung delta lintas-interface yang salah.
    pollingInterfaceRef.current = name;
    setSelectedInterface(name);
    prevRawRef.current = null;
    trafficSamplesRef.current = [];
    setTrafficSamples([]);

    startPollingSequence(name);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <LiveMonitor
        samples={activeSamples}
        totalSecrets={totalSecrets}
        error={error}
        isLoading={isLoading}
      />

      <TrafficMonitor
        interfaces={interfaces}
        selectedInterface={selectedInterface}
        onSelectInterface={handleSelectInterface}
        samples={trafficSamples}
        error={error}
        isLoading={isLoading}
      />
    </div>
  );
}
