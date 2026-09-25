"use client";

import { useEffect, useState, type ReactNode } from "react";

export default function BillingGenerationGuard({
  children,
}: {
  children: ReactNode;
}) {
  const [running, setRunning] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    const checkStatus = async () => {
      try {
        const response = await fetch("/api/billing/generation-status", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = (await response.json()) as { running?: boolean };
        if (active) {
          setRunning(data.running === true);
        }
      } catch {
        // Status UI bersifat informatif; jangan membuat halaman error hanya
        // karena pengecekan status Redis gagal sesaat.
      } finally {
        if (active) setChecking(false);
      }
    };

    void checkStatus();
    const interval = window.setInterval(checkStatus, 3000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <>
      {children}

      {running && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-ink-dark/75 backdrop-blur-[2px]"
          role="alert"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="mx-4 w-full max-w-md border border-white/15 bg-warm-paper px-8 py-9 text-center shadow-2xl">
            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-muted-sage/25 border-t-ink-dark" />
            <h2 className="font-archivo text-xl font-bold text-primary-text">
              Sedang memproses tagihan
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-sage">
              Sistem sedang membuat invoice dan mengirim notifikasi WhatsApp
              kepada pelanggan.
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-sage">
              Mohon jangan melakukan tindakan pada halaman Tagihan &amp;
              Pembayaran sampai proses selesai.
            </p>
          </div>
        </div>
      )}

      {checking && (
        <span className="sr-only" aria-hidden="true">
          Memeriksa status proses tagihan
        </span>
      )}
    </>
  );
}
