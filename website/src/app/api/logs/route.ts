import { createServerSupabaseClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

type VibrationLog = {
  id: number;
  device_id: string;
  motor_rpm: number;
  dominant_frequency_hz: number;
  overall_vibration_rms_mm_s: number;
  health_state: string;
  health_score: number;
  fault_type: string;
  created_at: string;
};

export async function GET(request: Request) {
  if (!hasSupabaseEnv) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Variabel Supabase belum diisi. Tambahkan NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY atau NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      },
      { status: 500 }
    );
  }

  try {
    // Extract hours from query params (default 24)
    const { searchParams } = new URL(request.url);
    const hours = Math.max(1, Math.min(parseInt(searchParams.get("hours") || "24"), 7 * 24));
    const limit = Math.max(1, Math.min(parseInt(searchParams.get("limit") || "100"), 500));

    // Calculate the time range
    const now = new Date();
    const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("vibration_fft_logs")
      .select(
        "id, device_id, motor_rpm, dominant_frequency_hz, overall_vibration_rms_mm_s, health_state, health_score, fault_type, created_at"
      )
      .gte("created_at", startTime.toISOString())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: (data as VibrationLog[]) ?? [],
      hours,
      limit,
      timestamp: new Date().toISOString(),
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
