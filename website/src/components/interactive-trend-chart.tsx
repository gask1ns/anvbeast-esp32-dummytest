"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";

type UploadTrendPoint = {
  timestamp: string;
  label: string;
  healthScore: number;
  rms: number;
  rpm: number;
};

type TimeRange = "1h" | "24h" | "7d";

type DeviceStatus = {
  status: "online" | "offline";
  lastUpdate: string;
  timeSinceLastUpdateSeconds: number;
  device_id: string;
};

function formatTooltipDate(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function InteractiveTrendChart() {
  const [data, setData] = useState<UploadTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);

  // Fetch device status
  const fetchDeviceStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/device-status");
      const result = await response.json();
      if (result.success && result.data) {
        setDeviceStatus(result.data);
      }
    } catch (error) {
      console.error("Error fetching device status:", error);
    }
  }, []);

  // Fetch data berdasarkan time range
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const hoursMap: Record<TimeRange, number> = {
        "1h": 1,
        "24h": 24,
        "7d": 7 * 24,
      };

      const hours = hoursMap[timeRange];
      const response = await fetch(`/api/logs?hours=${hours}`);
      const result = await response.json();

      if (result.success && result.data) {
        const trendData: UploadTrendPoint[] = [...result.data]
          .reverse()
          .map((item: any) => ({
            timestamp: item.created_at,
            label: new Date(item.created_at).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            healthScore: item.health_score ?? 0,
            rms: item.overall_vibration_rms_mm_s ?? 0,
            rpm: item.motor_rpm ?? 0,
          }));

        setData(trendData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, [timeRange]);

  // Initial fetch
  useEffect(() => {
    fetchData();
    fetchDeviceStatus();
  }, [timeRange, fetchData, fetchDeviceStatus]);

  // Auto refresh setiap 5 detik
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
      fetchDeviceStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchData, fetchDeviceStatus]);

  const metricCharts = [
    {
      key: "healthScore",
      title: "Health Score",
      subtitle: "Skor kesehatan mesin (0-100)",
      color: "#0f766e",
      yAxisLabel: "Health",
      domain: [0, 100] as [number, number],
      unit: "",
      strokeDasharray: undefined as string | undefined,
    },
    {
      key: "rms",
      title: "RMS",
      subtitle: "Overall vibration RMS (mm/s)",
      color: "#c2410c",
      yAxisLabel: "RMS",
      domain: undefined as [number, number] | undefined,
      unit: " mm/s",
      strokeDasharray: undefined as string | undefined,
    },
    {
      key: "rpm",
      title: "RPM",
      subtitle: "Kecepatan putaran motor",
      color: "#1d4ed8",
      yAxisLabel: "RPM",
      domain: undefined as [number, number] | undefined,
      unit: " rpm",
      strokeDasharray: "6 4",
    },
  ] as const;

  if (loading && data.length === 0) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-800/30">
        <div className="text-center">
          <div className="animate-spin inline-block h-10 w-10 border-4 border-slate-600 border-t-blue-400 rounded-full mx-auto"></div>
          <p className="mt-4 text-sm text-slate-400 font-medium">🔄 Memuat data...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-800/30 text-sm text-slate-400">
        <div className="text-center">
          <p className="text-2xl mb-2">📊</p>
          <p className="font-medium">Belum ada data time-series untuk ditampilkan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between border-b border-slate-600 pb-6">
        <div className="flex flex-wrap gap-4">
          {/* Time Range Filter */}
          <div className="flex gap-2 p-2 bg-slate-800/50 rounded-xl border border-slate-600">
            {(["1h", "24h", "7d"] as TimeRange[]).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeRange(range)}
                className={`text-xs font-semibold transition-all ${
                  timeRange === range
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "text-slate-300 hover:text-white hover:bg-slate-700"
                }`}
              >
                {range === "1h" && "1 Jam"}
                {range === "24h" && "24 Jam"}
                {range === "7d" && "7 Hari"}
              </Button>
            ))}
          </div>
        </div>

        {/* Refresh Info */}
        <div className="flex gap-4 items-center text-xs">
          <div className="text-slate-300 flex items-center gap-2">
            🔄 Update: {lastRefresh.toLocaleTimeString("id-ID")}
            {loading && <span className="inline-block animate-spin text-blue-400">⟳</span>}
          </div>
          
          {/* Device Status Indicator */}
          {deviceStatus && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
              deviceStatus.status === "online"
                ? "bg-green-600/20 text-green-300 border-green-500/30 shadow-lg shadow-green-500/10"
                : "bg-red-600/20 text-red-300 border-red-500/30 shadow-lg shadow-red-500/10"
            }`}>
              <div className={`h-2 w-2 rounded-full ${
                deviceStatus.status === "online" ? "bg-green-400 animate-pulse" : "bg-red-400 animate-pulse"
              }`}></div>
              <span className="font-bold">
                {deviceStatus.status === "online" ? "🟢 Online" : "🔴 Offline"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Separate Charts */}
      <div className="grid grid-cols-1 gap-5">
        {metricCharts.map((metric) => (
          <div key={metric.key} className="w-full rounded-xl bg-slate-800/30 p-5">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white">{metric.title}</h3>
              <p className="text-sm text-slate-400">{metric.subtitle}</p>
            </div>
            <div className="h-[340px] w-full lg:h-[380px]">
              <ResponsiveContainer>
                <LineChart data={data} margin={{ top: 16, right: 24, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#475569" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                    tick={{ fill: "#cbd5e1", fontSize: 12 }}
                  />
                  <YAxis
                    domain={metric.domain}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#cbd5e1", fontSize: 12 }}
                    label={{
                      value: metric.yAxisLabel,
                      angle: -90,
                      position: "insideLeft",
                      fill: metric.color,
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #475569",
                      backgroundColor: "#1e293b",
                      color: "#e2e8f0",
                    }}
                    labelFormatter={(_, payload) => {
                      const timestamp = payload?.[0]?.payload?.timestamp as string | undefined;
                      return timestamp ? formatTooltipDate(timestamp) : "";
                    }}
                    formatter={(value: number) => `${value}${metric.unit}`}
                  />
                  <Legend />

                  {deviceStatus?.status === "offline" && data.length > 0 && (
                    <ReferenceLine
                      x={data[data.length - 1]?.label}
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      label={{
                        value: "🔴 Koneksi Terputus",
                        position: "top",
                        fill: "#dc2626",
                        fontSize: 12,
                        fontWeight: "bold",
                        offset: 10,
                      }}
                    />
                  )}

                  <Line
                    type="monotone"
                    dataKey={metric.key}
                    name={metric.title}
                    stroke={metric.color}
                    strokeWidth={2.5}
                    strokeDasharray={metric.strokeDasharray}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
