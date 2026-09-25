import IORedis from "ioredis";

const STATUS_KEY = "isp-billing:invoice-generation";
const STATUS_TTL_SECONDS = 90;

const globalForRedis = globalThis as unknown as {
  billingStatusRedis?: IORedis;
};

const redis =
  globalForRedis.billingStatusRedis ??
  new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.billingStatusRedis = redis;
}

export type InvoiceGenerationStatus = {
  running: boolean;
  startedAt?: string;
};

export async function startInvoiceGenerationStatus(runId: string) {
  const value = JSON.stringify({
    runId,
    startedAt: new Date().toISOString(),
  });

  await redis.set(STATUS_KEY, value, "EX", STATUS_TTL_SECONDS);
  return value;
}

export async function refreshInvoiceGenerationStatus(runId: string) {
  const current = await redis.get(STATUS_KEY);
  if (!current) return false;

  try {
    const parsed = JSON.parse(current) as { runId?: string };
    if (parsed.runId !== runId) return false;
  } catch {
    return false;
  }

  await redis.expire(STATUS_KEY, STATUS_TTL_SECONDS);
  return true;
}

export async function stopInvoiceGenerationStatus(runId: string) {
  const current = await redis.get(STATUS_KEY);
  if (!current) return;

  try {
    const parsed = JSON.parse(current) as { runId?: string };
    if (parsed.runId !== runId) return;
  } catch {
    return;
  }

  await redis.del(STATUS_KEY);
}

export async function getInvoiceGenerationStatus(): Promise<InvoiceGenerationStatus> {
  const current = await redis.get(STATUS_KEY);
  if (!current) {
    return { running: false };
  }

  try {
    const parsed = JSON.parse(current) as {
      startedAt?: string;
    };

    return {
      running: true,
      startedAt: parsed.startedAt,
    };
  } catch {
    // Jangan biarkan data Redis yang rusak membuat halaman billing terkunci.
    await redis.del(STATUS_KEY);
    return { running: false };
  }
}
