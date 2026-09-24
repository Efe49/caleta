import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UPDATER_URL = process.env.UPDATER_URL ?? "http://updater:8091/update";

export async function POST() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(UPDATER_URL, {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      error?: string;
    } | null;
    if (!response.ok || !data?.ok) {
      return NextResponse.json(
        { ok: false, error: data?.error?.trim() || "No se ha podido actualizar." },
        { status: 502 },
      );
    }
    return NextResponse.json({
      ok: true,
      message: data.message?.trim() || "Actualización en marcha",
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "El servicio de actualización no está en marcha. En desarrollo local la aplicación no se ha actualizado.",
      },
      { status: 503 },
    );
  } finally {
    clearTimeout(timer);
  }
}
