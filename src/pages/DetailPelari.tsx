import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Calendar,
  Target,
  Clock,
  TrendingUp,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL?.toString?.() ||
  "http://localhost:4000";

type ApiRunner = {
  id: string;
  name: string;
  rank: string | null;
  status: string | null;
  total_distance?: number;
  total_sessions?: number;
  totalDistance?: number;
  totalSessions?: number;
  created_at?: string;
  createdAt?: string;
};

type ApiTarget14 = {
  id: string; // runner_id dari API targets.ts kamu (t.runner_id AS id)
  name: string;
  rank: string;
  distance_km: number;
  time_taken: string | null;
  pace: string | null;
  achieved_date: string; // YYYY-MM-DD
  validation_status: "validated" | "pending";
};

const formatDateID = (yyyyMmDd: string) => {
  const d = new Date(`${yyyyMmDd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return yyyyMmDd;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
};

const makeEmail = (name: string, rank: string) => {
  const rankLower = (rank || "").toLowerCase().replace(/[^a-z]/g, "");
  const parts = name
    .trim()
    .split(/\s+/)
    .map((p) => p.replace(/[^A-Za-z]/g, ""))
    .filter(Boolean);

  if (!parts.length) return "-";

  const firstWord = (parts[0] || "").toLowerCase();
  const secondWord = (parts[1] || "").toLowerCase();

  const firstName =
    rankLower && firstWord === rankLower && secondWord ? secondWord : firstWord;

  if (!rankLower || !firstName) return "-";
  return `${rankLower}.${firstName}@tni.mil.id`;
};

const calcTargetAchieved = (totalDistance: number) => totalDistance >= 14;

const DetailPelari = () => {
  const { id } = useParams();
  const runnerId = id || "";

  const [runner, setRunner] = useState<{
    id: string;
    name: string;
    rank: string;
    email: string;
    joinDate: string;
    totalDistance: number;
    totalTime: string;
    avgPace: string;
    totalSessions: number;
    targetAchieved: boolean;
    achievedDate: string;
  } | null>(null);

  const [sessionHistory, setSessionHistory] = useState<
    { date: string; distance: number; time: string; pace: string; targetMet: boolean }[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        // 1) ambil semua runners, cari id
        const runnersRes = await fetch(`${API_BASE}/api/runners`);
        const runnersJson = await runnersRes.json();
        const runners: ApiRunner[] = Array.isArray(runnersJson?.data)
          ? runnersJson.data
          : [];

        const r = runners.find((x) => x.id === runnerId);
        if (!r) {
          throw new Error(`Pelari dengan ID ${runnerId} tidak ditemukan.`);
        }

        const totalDistance =
          typeof r.totalDistance === "number"
            ? r.totalDistance
            : typeof r.total_distance === "number"
            ? r.total_distance
            : 0;

        const totalSessions =
          typeof r.totalSessions === "number"
            ? r.totalSessions
            : typeof r.total_sessions === "number"
            ? r.total_sessions
            : 0;

        const createdAt = (r.createdAt ?? r.created_at ?? "").toString();
        const joinDate =
          createdAt && createdAt.length >= 10 ? formatDateID(createdAt.slice(0, 10)) : "-";

        // 2) ambil target 14km untuk jadi history (kalau ada record)
        const targetRes = await fetch(`${API_BASE}/api/targets/14km`);
        const targetJson = await targetRes.json();
        const targets: ApiTarget14[] = Array.isArray(targetJson?.data)
          ? targetJson.data
          : [];

        const myTargets = targets
          .filter((x) => x.id === runnerId)
          .sort((a, b) => (a.achieved_date < b.achieved_date ? 1 : -1));

        const history = myTargets.map((x) => ({
          date: formatDateID(x.achieved_date),
          distance: Number(x.distance_km ?? 0),
          time: x.time_taken ?? "-",
          pace: x.pace ?? "-",
          targetMet: Number(x.distance_km ?? 0) >= 14,
        }));

        // ambil achievedDate terbaru dari history (kalau ada)
        const achievedDate = myTargets[0]?.achieved_date
          ? formatDateID(myTargets[0].achieved_date)
          : "N/A";

        // avg pace & total time (karena belum ada table sessions lengkap, fallback)
        const avgPace = myTargets[0]?.pace ?? "-";
        const totalTime = myTargets[0]?.time_taken ?? "-";

        const rank = r.rank ?? "-";
        const name = r.name;

        const payload = {
          id: r.id,
          name,
          rank,
          email: makeEmail(name, rank),
          joinDate,
          totalDistance,
          totalTime,
          avgPace,
          totalSessions,
          targetAchieved: calcTargetAchieved(totalDistance),
          achievedDate,
        };

        if (!cancelled) {
          setRunner(payload);
          setSessionHistory(history);
        }
      } catch (e: any) {
        if (!cancelled) setErrorMsg(e?.message || "Gagal memuat data pelari.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (runnerId) load();
    return () => {
      cancelled = true;
    };
  }, [runnerId]);

  // Progress chart: dibuat dari data asli yang tersedia (riwayat target_14km untuk runner ini)
  // Kalau belum ada, chart tetap tampil tapi kosong.
  const progressData = useMemo(() => {
    // pakai maksimal 6 data paling akhir sebagai W1..W6
    const latest = [...sessionHistory].reverse().slice(-6); // oldest -> newest
    return latest.map((s, idx) => ({
      week: `W${idx + 1}`,
      distance: s.distance,
    }));
  }, [sessionHistory]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (errorMsg || !runner) {
    return (
      <div className="space-y-6">
        <Link to="/pelari">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Data Pelari
          </Button>
        </Link>

        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <p className="text-sm text-destructive">{errorMsg || "Data tidak ditemukan."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link to="/pelari">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Data Pelari
        </Button>
      </Link>

      {/* Profile Header */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold">
            {runner.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div>
                <div className="text-sm font-medium text-primary">{runner.rank}</div>
                <h1 className="text-2xl font-bold text-foreground">{runner.name}</h1>
              </div>
              {runner.targetAchieved && (
                <span className="badge-success">
                  <Target className="mr-1 h-3 w-3" />
                  14 KM Tercapai
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="font-mono">{runner.id}</span>
              </span>
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {runner.email}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Bergabung {runner.joinDate}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Jarak</p>
              <p className="text-xl font-bold">{runner.totalDistance} km</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <Clock className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Waktu</p>
              <p className="text-xl font-bold">{runner.totalTime}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <Activity className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rata-rata Pace</p>
              <p className="text-xl font-bold">{runner.avgPace}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <Target className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Sesi</p>
              <p className="text-xl font-bold">{runner.totalSessions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and History */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Progress Chart */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <h3 className="font-semibold text-foreground mb-4">
            Perkembangan Jarak per Minggu
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 15%, 90%)" />
                <XAxis dataKey="week" tick={{ fill: "hsl(210, 10%, 45%)", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(210, 10%, 45%)", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(0, 0%, 100%)",
                    border: "1px solid hsl(210, 15%, 90%)",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="distance"
                  stroke="hsl(85, 45%, 45%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(85, 45%, 45%)", strokeWidth: 2 }}
                  name="Jarak (km)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {progressData.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Belum ada data sesi di database untuk grafik (isi tabel target_14km atau buat tabel run_sessions).
            </p>
          )}
        </div>

        {/* Session History */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <h3 className="font-semibold text-foreground mb-4">Riwayat Sesi Lari</h3>

          {sessionHistory.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Belum ada riwayat sesi di database untuk pelari ini.
            </div>
          ) : (
            <div className="space-y-3">
              {sessionHistory.map((session, index) => (
                <div
                  key={`${session.date}-${index}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        session.targetMet ? "bg-success" : "bg-muted-foreground"
                      }`}
                    />
                    <div>
                      <p className="font-medium text-sm">{session.distance} km</p>
                      <p className="text-xs text-muted-foreground">{session.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{session.time}</p>
                    <p className="text-xs text-muted-foreground">{session.pace}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetailPelari;
