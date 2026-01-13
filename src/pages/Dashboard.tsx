import { useEffect, useMemo, useState } from "react";
import { Users, Target, Activity } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import RecentRunnersTable from "@/components/dashboard/RecentRunnersTable";
import TargetChart from "@/components/dashboard/TargetChart";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL?.toString?.() ||
  "http://localhost:4000";

type ApiRunner = {
  id: string;
  name: string;
  rank: string | null;
  totalDistance?: number;
  totalSessions?: number;
  total_distance?: number;
  total_sessions?: number;
};

type ApiTarget14 = {
  id: string; // runner_id
  name: string;
  rank: string;
  distance_km: number;
  achieved_date: string; // YYYY-MM-DD
  validation_status: "validated" | "pending";
};

const Dashboard = () => {
  const [runners, setRunners] = useState<ApiRunner[]>([]);
  const [targets, setTargets] = useState<ApiTarget14[]>([]);

  useEffect(() => {
    // total runners
    fetch(`${API_BASE}/api/runners`)
      .then((r) => r.json())
      .then((j) => setRunners(Array.isArray(j?.data) ? j.data : []))
      .catch(() => setRunners([]));

    // target 14km
    fetch(`${API_BASE}/api/targets/14km`)
      .then((r) => r.json())
      .then((j) => setTargets(Array.isArray(j?.data) ? j.data : []))
      .catch(() => setTargets([]));
  }, []);

  const totalRunners = runners.length;

  const totalTarget = targets.length;
  const validatedCount = targets.filter((t) => t.validation_status === "validated").length;
  const pendingCount = targets.filter((t) => t.validation_status === "pending").length;

  // data untuk tabel dashboard "Target 14 KM Tercapai"
  const recentTableData = useMemo(() => {
    // ambil 8 terbaru
    const latest = [...targets].slice(0, 8);
    return latest.map((t) => ({
      id: t.id,
      name: t.name,
      rank: t.rank,
      distanceKm: Number(t.distance_km),
      targetKm: 14,
      status: t.validation_status, // RecentRunnersTable sudah handle pending/validated
    }));
  }, [targets]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Ringkasan aktivitas dan pencapaian pelari</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Pelari"
          value={String(totalRunners)}
          subtitle="Terdaftar di sistem"
          icon={Users}
          trend={{ value: 0, isPositive: true }}
        />
        <StatCard
          title="Target Tercapai"
          value={String(totalTarget)}
          subtitle="Mencapai 14 KM"
          icon={Target}
          trend={{ value: 0, isPositive: true }}
          variant="primary"
        />
        <StatCard
          title="Menunggu Validasi"
          value={String(pendingCount)}
          subtitle={`Tervalidasi: ${validatedCount}`}
          icon={Activity}
          trend={{ value: 0, isPositive: true }}
        />
      </div>

      {/* Charts (kalau TargetChart masih mock di dalamnya, nanti kita sambungkan juga) */}
      <div className="grid gap-6">
        <TargetChart />
      </div>

      {/* Recent Runners Table from DB */}
      <RecentRunnersTable runners={recentTableData} />
    </div>
  );
};

export default Dashboard;
