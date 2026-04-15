"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

type UploadHistoryTableProps = {
  initialLogs: VibrationLog[];
};

const decimalFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});

function formatDate(dateValue: string) {
  return new Date(dateValue).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getHealthBadgeClasses(state: string): string {
  const normalized = state.toLowerCase();

  if (normalized.includes("critical") || normalized.includes("bad")) {
    return "bg-red-600/30 text-red-300 border border-red-500/30 hover:bg-red-600/40";
  }

  if (normalized.includes("warn")) {
    return "bg-orange-600/30 text-orange-300 border border-orange-500/30 hover:bg-orange-600/40";
  }

  return "bg-green-600/30 text-green-300 border border-green-500/30 hover:bg-green-600/40";
}

export function UploadHistoryTable({ initialLogs }: UploadHistoryTableProps) {
  const [logs, setLogs] = useState<VibrationLog[]>(initialLogs);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchLatestLogs = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/logs?hours=168&limit=100", {
        cache: "no-store",
      });
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        setLogs(result.data as VibrationLog[]);
        setError(null);
      } else {
        setError(result.error ?? "Gagal memuat riwayat upload.");
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Gagal memuat riwayat upload.");
    } finally {
      setIsRefreshing(false);
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLatestLogs();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchLatestLogs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span>
          🔄 Auto refresh: {lastRefresh.toLocaleTimeString("id-ID")}
          {isRefreshing && <span className="ml-2 inline-block animate-spin text-blue-400">⟳</span>}
        </span>
        {error ? <span className="text-red-300">⚠️ {error}</span> : null}
      </div>

      <div className="overflow-x-auto rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-800/50 border-b border-slate-600 hover:bg-slate-800/50">
              <TableHead className="text-slate-200 font-bold">Waktu</TableHead>
              <TableHead className="text-slate-200 font-bold">Device</TableHead>
              <TableHead className="text-slate-200 font-bold">RPM</TableHead>
              <TableHead className="text-slate-200 font-bold">Freq (Hz)</TableHead>
              <TableHead className="text-slate-200 font-bold">RMS (mm/s)</TableHead>
              <TableHead className="text-slate-200 font-bold">Kesehatan</TableHead>
              <TableHead className="text-slate-200 font-bold">Fault Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((item) => (
              <TableRow key={item.id} className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors">
                <TableCell className="whitespace-nowrap text-slate-300">{formatDate(item.created_at)}</TableCell>
                <TableCell className="font-medium text-slate-100">{item.device_id}</TableCell>
                <TableCell className="text-slate-300">{decimalFormatter.format(item.motor_rpm ?? 0)}</TableCell>
                <TableCell className="text-slate-300">{decimalFormatter.format(item.dominant_frequency_hz ?? 0)}</TableCell>
                <TableCell className="text-slate-300">
                  {decimalFormatter.format(item.overall_vibration_rms_mm_s ?? 0)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge className={`font-semibold px-3 py-1 rounded-full ${getHealthBadgeClasses(item.health_state ?? "good")}`}>
                      {item.health_state}
                    </Badge>
                    <span className="text-xs text-slate-400">{item.health_score ?? 0}/100</span>
                  </div>
                </TableCell>
                <TableCell className="text-slate-300">{item.fault_type}</TableCell>
              </TableRow>
            ))}

            {logs.length === 0 ? (
              <TableRow className="border-b border-slate-700">
                <TableCell colSpan={7} className="py-8 text-center text-slate-400">
                  📭 Belum ada data upload untuk ditampilkan.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}