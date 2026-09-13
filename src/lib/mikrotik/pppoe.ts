import { withMikrotikClient, type RouterCredentials } from "./client";

export type MikrotikResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Membuat PPPoE secret baru di Mikrotik saat pelanggan baru didaftarkan.
 * profileName sebaiknya sama dengan nama Package (misal "Paket Standar 20 Mbps")
 * kalau kamu bikin PPP Profile terpisah per paket di Mikrotik untuk rate-limit.
 */
export async function createPppoeSecret(
  router: RouterCredentials,
  params: {
    username: string;
    password: string;
    profile?: string;
    disabled?: boolean;
  },
): Promise<MikrotikResult> {
  try {
    await withMikrotikClient(router, async (client) => {
      await client.menu("/ppp/secret").add({
        name: params.username,
        password: params.password,
        service: "pppoe",
        profile: params.profile ?? "default",
        // Default disabled=true: secret dibuat dulu tapi belum aktif,
        // karena pelanggan baru statusnya PENDING (belum instalasi).
        // Admin baru enable manual lewat tombol "Aktifkan" di dashboard.
        disabled: (params.disabled ?? true) ? "yes" : "no",
      });
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Enable/disable PPPoE secret - dipakai untuk suspend (isolir) dan
 * reaktivasi pelanggan. disabled=true berarti pelanggan diputus aksesnya.
 */
export async function setPppoeSecretEnabled(
  router: RouterCredentials,
  username: string,
  enabled: boolean,
): Promise<MikrotikResult> {
  try {
    await withMikrotikClient(router, async (client) => {
      const menu = client.menu("/ppp/secret");
      const existing = await menu.where({ name: username }).get();

      if (existing.length === 0) {
        throw new Error(`PPPoE secret "${username}" tidak ditemukan di router`);
      }

      await menu.where({ name: username }).update({
        disabled: enabled ? "no" : "yes",
      });

      // Kalau lagi men-disable (suspend), putuskan juga sesi yang lagi aktif
      // saat ini - kalau cuma disable secret tanpa disconnect paksa, pelanggan
      // yang sedang online tetap bisa pakai internet sampai koneksinya putus sendiri
      if (!enabled) {
        const activeSessions = await client
          .menu("/ppp/active")
          .where({ name: username })
          .get();

        for (const session of activeSessions) {
          await client
            .menu("/ppp/active")
            .where({ ".id": session[".id"] })
            .remove();
        }
      }
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Hapus PPPoE secret sepenuhnya - dipakai kalau pelanggan benar-benar
 * berhenti berlangganan (status INACTIVE permanen), bukan cuma isolir.
 */
export async function deletePppoeSecret(
  router: RouterCredentials,
  username: string,
): Promise<MikrotikResult> {
  try {
    await withMikrotikClient(router, async (client) => {
      await client.menu("/ppp/secret").where({ name: username }).remove();
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Buat atau update PPP Profile di Mikrotik supaya rate-limit-nya sesuai
 * speed Package di billing. Dipanggil dari fitur "Sync ke Mikrotik" di
 * halaman Package - bukan dipanggil otomatis tiap create customer, karena
 * profile itu sifatnya shared (dipakai banyak pelanggan sekaligus), jadi
 * cukup di-sync sekali per Package per Router, bukan per Customer.
 */
export async function syncPppProfile(
  router: RouterCredentials,
  params: { profileName: string; speedMbps: number },
): Promise<MikrotikResult> {
  const rateLimit = `${params.speedMbps}M/${params.speedMbps}M`;

  try {
    await withMikrotikClient(router, async (client) => {
      const menu = client.menu("/ppp/profile");
      const existing = await menu.where({ name: params.profileName }).get();

      if (existing.length > 0) {
        await menu
          .where({ name: params.profileName })
          .update({ "rate-limit": rateLimit });
      } else {
        await menu.add({ name: params.profileName, "rate-limit": rateLimit });
      }
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Ambil semua PPPoE secret yang sudah ada di Mikrotik - dipakai untuk fitur
 * "Import dari Mikrotik", supaya ISP yang sudah jalan lama (pelanggannya
 * sudah terdaftar duluan di router, belum ada di billing) bisa ditarik
 * datanya sekaligus, bukan input manual satu-satu.
 */
export type MikrotikSecret = {
  username: string;
  profile: string;
  comment: string; // sering dipakai ISP untuk nama pelanggan, tapi tidak selalu diisi
  disabled: boolean;
};

export async function listPppoeSecrets(
  router: RouterCredentials,
): Promise<
  | { success: true; secrets: MikrotikSecret[] }
  | { success: false; error: string }
> {
  try {
    const secrets = await withMikrotikClient(router, async (client) => {
      const result = await client.menu("/ppp/secret").getAll();
      return (result as Array<Record<string, string>>)
        .filter((s) => s.service === "pppoe")
        .map((s) => ({
          username: s.name,
          profile: s.profile ?? "default",
          comment: s.comment ?? "",
          disabled: s.disabled === "true",
        }));
    });

    return { success: true, secrets };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Bikin atau update PPP Profile di Mikrotik supaya rate-limit-nya sesuai
 * speed paket billing. Idempotent - aman dipanggil berkali-kali, akan
 * update rate-limit kalau profile sudah ada, atau bikin baru kalau belum.
 *
 * Ini yang bikin pemilihan Package di billing BENERAN menentukan kecepatan
 * di Mikrotik, bukan cuma catatan administratif di database.
 */
export async function syncProfileToRouter(
  router: RouterCredentials,
  profileName: string,
  speedMbps: number,
  options?: { skipIfExists?: boolean },
): Promise<MikrotikResult> {
  try {
    await withMikrotikClient(router, async (client) => {
      const menu = client.menu("/ppp/profile");
      const existing = await menu.where({ name: profileName }).get();
      const rateLimit = `${speedMbps}M/${speedMbps}M`; // upload/download sama besar

      if (existing.length === 0) {
        await menu.add({ name: profileName, "rate-limit": rateLimit });
      } else if (!options?.skipIfExists) {
        await menu
          .where({ name: profileName })
          .update({ "rate-limit": rateLimit });
      }
      // kalau skipIfExists=true dan profile sudah ada (mapping manual ke
      // profile ISP yang sudah dikonfigurasi sebelumnya), biarkan apa
      // adanya - jangan timpa rate-limit yang sudah mereka atur sendiri
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Ambil semua PPP Profile yang sudah ada di router - dipakai sebagai
 * "picker" saat setup Package, supaya staf bisa pilih dari daftar yang
 * benar-benar ada di Mikrotik, bukan ngetik nama secara buta (rawan typo
 * atau salah beda huruf besar-kecil dengan yang aslinya).
 */
export type MikrotikProfile = {
  name: string;
  rateLimit: string;
};

export async function listPppoeProfiles(
  router: RouterCredentials,
): Promise<
  | { success: true; profiles: MikrotikProfile[] }
  | { success: false; error: string }
> {
  try {
    const profiles = await withMikrotikClient(router, async (client) => {
      const result = await client.menu("/ppp/profile").getAll();
      return (result as Array<Record<string, string>>).map((p) => ({
        name: p.name,
        rateLimit: p["rate-limit"] ?? p.rateLimit ?? "-",
      }));
    });

    return { success: true, profiles };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Cek apakah pelanggan sedang online (ada sesi PPPoE aktif) - dipakai
 * untuk dashboard monitoring status koneksi real-time.
 */
export async function getPppoeOnlineStatus(
  router: RouterCredentials,
  username: string,
): Promise<{ online: boolean; uptime?: string; address?: string }> {
  const result = await withMikrotikClient(router, async (client) => {
    const activeSessions = await client
      .menu("/ppp/active")
      .where({ name: username })
      .get();

    if (activeSessions.length === 0) {
      return { online: false };
    }

    const session = activeSessions[0] as Record<string, string>;
    return {
      online: true,
      uptime: session.uptime,
      address: session.address,
    };
  });

  return result;
}
