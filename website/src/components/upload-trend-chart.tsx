"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type UploadTrendPoint = {
  timestamp: string;
  label: string;
  healthScore: number;
  rms: number;
  rpm: number;
};

type UploadTrendChartProps = {
  data: UploadTrendPoint[];
};

function formatTooltipDate(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UploadTrendChart({ data }: UploadTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-500">
        Belum ada data time-series untuk ditampilkan.
      </div>
    );
  }

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 16, right: 24, left: 4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#e4e4e7" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tick={{ fill: "#52525b", fontSize: 12 }}
          />
          <YAxis
            yAxisId="health"
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#52525b", fontSize: 12 }}
            label={{ value: "Health", angle: -90, position: "insideLeft", fill: "#0f766e" }}
          />
          <YAxis
            yAxisId="rms"
            orientation="right"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#52525b", fontSize: 12 }}
            label={{ value: "RMS", angle: 90, position: "insideRight", fill: "#9a3412" }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: "1px solid #e4e4e7",
              backgroundColor: "#ffffff",
            }}
            labelFormatter={(_, payload) => {
              const timestamp = payload?.[0]?.payload?.timestamp as string | undefined;
              return timestamp ? formatTooltipDate(timestamp) : "";
            }}
          />
          <Legend />
          <Line
            yAxisId="health"
            type="monotone"
            dataKey="healthScore"
            name="Health Score"
            stroke="#0f766e"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5 }}
          />
          <Line
            yAxisId="rms"
            type="monotone"
            dataKey="rms"
            name="RMS (mm/s)"
            stroke="#c2410c"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5 }}
          />
          <Line
            yAxisId="rms"
            type="monotone"
            dataKey="rpm"
            name="RPM"
            stroke="#1d4ed8"
            strokeWidth={1.75}
            strokeDasharray="6 4"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
