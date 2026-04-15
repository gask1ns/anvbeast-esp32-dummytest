import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InteractiveTrendChart } from "@/components/interactive-trend-chart";
import { DeviceStatusIndicator } from "@/components/device-status-indicator";
import { DeviceStatusCard } from "@/components/device-status-card";
import { UploadHistoryTable } from "@/components/upload-history-table";
import { createServerSupabaseClient, hasSupabaseEnv } from "@/lib/supabase-server";

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

const decimalFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

async function getLatestLogs(): Promise<{ data: VibrationLog[]; error: string | null }> {
  if (!hasSupabaseEnv) {
    return {
      data: [],
      error:
        "Variabel Supabase belum diisi. Tambahkan NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY atau NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("vibration_fft_logs")
      .select(
        "id, device_id, motor_rpm, dominant_frequency_hz, overall_vibration_rms_mm_s, health_state, health_score, fault_type, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return { data: [], error: error.message };
    }

    return {
      data: (data as VibrationLog[]) ?? [],
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : "Terjadi error yang tidak diketahui.",
    };
  }
}

function formatDate(dateValue: string) {
  return new Date(dateValue).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const revalidate = 0;

export default async function Home() {
  const { data: logs, error } = await getLatestLogs();

  const totalLogs = logs.length;
  const averageHealth =
    totalLogs > 0
      ? logs.reduce((acc, item) => acc + (item.health_score ?? 0), 0) / totalLogs
      : 0;
  const criticalLogs = logs.filter((item) => (item.health_score ?? 100) < 70).length;
  const latestUpload = logs[0]?.created_at;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-12 sm:px-6 lg:px-10">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        {/* Header Card */}
        <Card className="border-0 bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-2xl">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-4xl font-bold tracking-tight">
                  📊 Dashboard ESP32
                </CardTitle>
                <CardDescription className="mt-3 text-blue-100 text-lg">
                  Monitor Realtime Status dan Performa Motor Vibration Sensor
                </CardDescription>
              </div>
              <div className="ml-4 flex-shrink-0">
                <DeviceStatusIndicator />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 bg-slate-700/50 backdrop-blur-sm shadow-xl hover:shadow-2xl hover:bg-slate-700/70 transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-300 text-sm font-medium">Total Upload</CardDescription>
              <CardTitle className="text-4xl font-bold text-white mt-2">{integerFormatter.format(totalLogs)}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-green-600/30 to-green-500/20 backdrop-blur-sm shadow-xl hover:shadow-2xl hover:from-green-600/40 transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <CardDescription className="text-green-200 text-sm font-medium">Health Score Rata-rata</CardDescription>
              <CardTitle className="text-4xl font-bold text-green-300 mt-2">{decimalFormatter.format(averageHealth)}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-yellow-600/30 to-yellow-500/20 backdrop-blur-sm shadow-xl hover:shadow-2xl hover:from-yellow-600/40 transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <CardDescription className="text-yellow-200 text-sm font-medium">Data Risiko Tinggi</CardDescription>
              <CardTitle className="text-4xl font-bold text-yellow-300 mt-2">{integerFormatter.format(criticalLogs)}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-purple-600/30 to-purple-500/20 backdrop-blur-sm shadow-xl hover:shadow-2xl hover:from-purple-600/40 transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <CardDescription className="text-purple-200 text-sm font-medium">Update Terakhir</CardDescription>
              <CardTitle className="text-lg font-bold text-purple-300 mt-2">
                {latestUpload ? formatDate(latestUpload) : "Belum ada data"}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Device Status Card */}
        <DeviceStatusCard />

        {error ? (
          <Card className="border-0 bg-red-900/20 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-red-400">⚠️ Gagal memuat data</CardTitle>
              <CardDescription className="text-red-300 mt-2">{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {/* Chart Card */}
        <Card className="border-0 bg-slate-700/50 backdrop-blur-sm shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600">
            <CardTitle className="text-2xl text-white font-bold">📈 Analisis Tren Realtime</CardTitle>
            <CardDescription className="text-slate-300 mt-2">
              Filter rentang waktu, pilih metrik, dan lihat data dengan presisi per detik
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <InteractiveTrendChart />
          </CardContent>
        </Card>

        {/* Table Card */}
        <Card className="border-0 bg-slate-700/50 backdrop-blur-sm shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600">
            <CardTitle className="text-2xl text-white font-bold">📋 Riwayat Upload</CardTitle>
            <CardDescription className="text-slate-300 mt-2">
              100 data terbaru dari sensor - auto refresh setiap 5 detik
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <UploadHistoryTable initialLogs={logs} />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
