"use client";

import { useEffect, useState } from "react";

type DeviceStatus = {
  status: "online" | "offline";
  lastUpdate: string;
  timeSinceLastUpdateSeconds: number;
  device_id: string;
};

export function DeviceStatusIndicator() {
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/device-status");
      const data = await response.json();
      if (data.success) {
        setDeviceStatus(data.data);
      }
    } catch (error) {
      console.error("Error fetching device status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Refresh status setiap 10 detik
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !deviceStatus) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 bg-slate-500 rounded-full animate-pulse"></div>
        <span className="text-sm text-slate-300">Mengecek status...</span>
      </div>
    );
  }

  const isOnline = deviceStatus.status === "online";
  const statusColor = isOnline ? "bg-green-500" : "bg-red-500";
  const statusTextId = isOnline ? "Aktif" : "Tidak Aktif";

  const lastUpdateTime = new Date(deviceStatus.lastUpdate).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <div className={`h-3 w-3 ${statusColor} rounded-full ${isOnline ? "" : "animate-pulse"}`}></div>
        <span className="text-sm font-semibold text-slate-200">{statusTextId}</span>
      </div>
      <span className="text-xs text-slate-400">
        🕐 {lastUpdateTime}
      </span>
    </div>
  );
}
