import { createServerSupabaseClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

type VibrationLog = {
  id: number;
  device_id: string;
  created_at: string;
};

export async function GET() {
  if (!hasSupabaseEnv) {
    return NextResponse.json(
      {
        success: false,
        error: "Variabel Supabase belum diisi.",
      },
      { status: 500 }
    );
  }

  try {
    const supabase = createServerSupabaseClient();

    // Ambil data terakhir
    const { data, error } = await supabase
      .from("vibration_fft_logs")
      .select("id, device_id, created_at")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const now = new Date();
    const lastLog = (data as VibrationLog[])?.[0];

    if (!lastLog) {
      // Belum ada data sama sekali
      return NextResponse.json({
        success: true,
        data: {
          status: "offline",
          lastUpdate: new Date().toISOString(),
          timeSinceLastUpdateSeconds: Infinity,
          device_id: "unknown",
        },
      });
    }

    const lastUpdateTime = new Date(lastLog.created_at);
    const timeSinceLastUpdate = (now.getTime() - lastUpdateTime.getTime()) / 1000; // dalam detik

    // Dianggap online jika ada update dalam 1 menit terakhir
    const ONLINE_THRESHOLD_SECONDS = 60; // 1 menit
    const isOnline = timeSinceLastUpdate <= ONLINE_THRESHOLD_SECONDS;

    return NextResponse.json({
      success: true,
      data: {
        status: isOnline ? "online" : "offline",
        lastUpdate: lastLog.created_at,
        timeSinceLastUpdateSeconds: Math.round(timeSinceLastUpdate),
        device_id: lastLog.device_id,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Terjadi error yang tidak diketahui.",
      },
      { status: 500 }
    );
  }
}
