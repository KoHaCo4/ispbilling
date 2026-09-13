"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      setError("ID petugas atau kata sandi salah. Coba lagi.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="bg-warm-paper text-primary-text font-inter antialiased min-h-screen flex flex-col md:flex-row">
      {/* PANEL KIRI: Visual Brand & Identitas Infrastruktur (Dark) */}
      <aside className="w-full md:w-5/12 bg-ink-dark text-warm-paper p-8 md:p-12 flex flex-col justify-between relative overflow-hidden min-h-[320px] md:min-h-screen border-b md:border-b-0 md:border-r border-muted-sage/20">
        <div className="z-10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span
              className="w-3 h-3 bg-signal-amber rounded-full animate-pulse"
              title="Sistem Aktif"
            ></span>
            <span className="font-archivo tracking-wider text-sm font-semibold uppercase text-warm-paper/80">
              OPS-NET v2.4
            </span>
          </div>
          <span className="text-xs font-mono text-muted-sage border border-muted-sage/30 px-2 py-0.5 rounded">
            INTERNAL ONLY
          </span>
        </div>

        <div className="my-auto py-12 z-10">
          <div
            className="mb-8 flex items-end space-x-2 h-20 opacity-90"
            aria-hidden="true"
          >
            <div className="w-3 bg-muted-sage/30 h-1/5 rounded-sm"></div>
            <div className="w-3 bg-muted-sage/50 h-2/5 rounded-sm"></div>
            <div className="w-3 bg-muted-sage/70 h-3/5 rounded-sm"></div>
            <div className="w-3 bg-muted-sage h-4/5 rounded-sm"></div>
            <div className="w-3 bg-signal-amber h-full rounded-sm shadow-[0_0_12px_rgba(232,163,61,0.4)]"></div>
          </div>

          <h1 className="font-archivo text-3xl md:text-4xl font-bold tracking-tight text-warm-paper leading-tight mb-4">
            Sistem Manajemen & Infrastruktur Jaringan
          </h1>
          <p className="text-muted-sage text-sm md:text-base max-w-sm leading-relaxed">
            Platform operasional terpadu untuk pemantauan sinyal, administratif,
            lapangan, dan penagihan wilayah perdesaan.
          </p>
        </div>

        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#7C9186 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        ></div>

        <div className="z-10 text-xs text-muted-sage/70 flex justify-between items-center pt-6 border-t border-muted-sage/20">
          <span>&copy; 2026 PT Network Infrastruktur</span>
          <span className="font-mono">Node: ID-CJA-02</span>
        </div>
      </aside>

      {/* PANEL KANAN: Form Autentikasi (Light) */}
      <main className="w-full md:w-7/12 bg-warm-paper p-8 md:p-16 flex items-center justify-center">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="font-archivo text-2xl md:text-3xl font-bold text-primary-text tracking-tight">
              Masuk ke Akun Kerja
            </h2>
            <p className="text-muted-sage text-sm mt-2">
              Gunakan email dan kredensial terdaftar untuk melanjutkan.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-primary-text"
              >
                Email Petugas
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@ispbilling.com"
                className="w-full px-4 py-3 bg-white border border-muted-sage/40 text-primary-text placeholder-muted-sage/60 focus:outline-none focus:border-ink-dark focus:ring-1 focus:ring-ink-dark text-sm transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-primary-text"
              >
                Kata Sandi
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 bg-white border border-muted-sage/40 text-primary-text placeholder-muted-sage/60 focus:outline-none focus:border-ink-dark focus:ring-1 focus:ring-ink-dark text-sm transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3">
                {error}
              </p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-ink-dark hover:bg-opacity-95 disabled:opacity-60 text-warm-paper font-semibold py-3.5 px-4 text-sm tracking-wide transition-colors flex items-center justify-center space-x-2 group"
              >
                <span>{isLoading ? "MEMERIKSA..." : "MASUK SISTEM"}</span>
                <span className="w-1.5 h-1.5 bg-signal-amber rounded-full group-hover:scale-125 transition-transform"></span>
              </button>
            </div>
          </form>

          <div className="pt-6 border-t border-muted-sage/20 text-xs text-muted-sage flex items-start space-x-2">
            <svg
              className="w-4 h-4 text-signal-amber shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <p>
              Kendala akses jaringan lokal atau kendala akun dapat menghubungi
              Tim IT Helpdesk melalui radio internal atau ekstensi{" "}
              <span className="font-mono text-primary-text font-medium">
                #402
              </span>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
