"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DeviceStatusData = {
  status: "online" | "offline";
  lastUpdate: string;
  timeSinceLastUpdateSeconds: number;
  device_id: string;
};

export function DeviceStatusCard() {
  const [statusData, setStatusData] = useState<DeviceStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/device-status");
      const data = await response.json();
      if (data.success) {
        setStatusData(data.data);
      }
    } catch (error) {
      console.error("Error fetching device status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Refresh setiap 10 detik
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !statusData) {
    return null;
  }

  const isOnline = statusData.status === "online";
  const borderColor = isOnline ? "border-0 bg-gradient-to-br from-green-600/20 to-green-500/10" : "border-0 bg-gradient-to-br from-red-600/20 to-red-500/10";
  const textColor = isOnline ? "text-green-300" : "text-red-300";
  const descColor = isOnline ? "text-green-200" : "text-red-200";
  const statusBgColor = isOnline ? "bg-green-500/20" : "bg-red-500/20";

  const timeString = 
    statusData.timeSinceLastUpdateSeconds === Infinity
      ? "Belum ada data"
      : statusData.timeSinceLastUpdateSeconds < 60
      ? `${statusData.timeSinceLastUpdateSeconds} detik`
      : `${Math.floor(statusData.timeSinceLastUpdateSeconds / 60)} menit`;

  const lastUpdateFormatted = new Date(statusData.lastUpdate).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <Card className={`${borderColor} backdrop-blur-sm shadow-2xl border-0`}>
      <CardHeader className={`${statusBgColor} border-b border-slate-600`}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={`${textColor} text-2xl font-bold`}>
              {isOnline ? "🟢 Device Online" : "🔴 Device Offline"}
            </CardTitle>
            <CardDescription className={`${descColor} mt-2`}>
              Device ID: {statusData.device_id}
            </CardDescription>
          </div>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${statusBgColor} border-2 ${isOnline ? "border-green-400" : "border-red-400"}`}>
            <div className={`w-3 h-3 rounded-full ${isOnline ? "bg-green-400 animate-pulse" : "bg-red-400 animate-pulse"}`}></div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4 text-sm">
          <div className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg">
            <span className="text-slate-300 font-medium">Update Terakhir:</span>
            <span className="text-slate-100">{lastUpdateFormatted}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg">
            <span className="text-slate-300 font-medium">Waktu Sejak Update:</span>
            <span className="text-slate-100">{timeString}</span>
          </div>
          <div className={`mt-4 p-4 rounded-lg ${statusBgColor} border ${isOnline ? "border-green-400/30" : "border-red-400/30"}`}>
            {isOnline ? (
              <p className="text-green-300 font-semibold">✓ ESP32 sedang aktif dan mengirim data dengan stabil</p>
            ) : (
              <p className="text-red-300 font-semibold">✗ ESP32 tidak merespons (tidak ada data &gt; 1 menit)</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
