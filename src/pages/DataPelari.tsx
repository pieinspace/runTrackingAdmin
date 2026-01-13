import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Target,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RunnerUI {
  id: string;
  name: string;
  rank: string;
  email: string;
  totalSessions: number;
  totalDistance: number;
  targetStatus: "achieved" | "in_progress" | "not_started";
  joinDate: string;
}

type ApiRunner = {
  id: string;
  name: string;
  rank?: string | null;

  // bisa camelCase atau snake_case
  totalDistance?: number;
  totalSessions?: number;
  total_distance?: number;
  total_sessions?: number;

  createdAt?: string;
  created_at?: string;
};

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL?.toString?.() ||
  "http://localhost:4000";

// ✅ status berdasarkan totalDistance (3 level)
const toTargetStatus = (totalDistance: number): RunnerUI["targetStatus"] => {
  if (totalDistance >= 14) return "achieved";
  if (totalDistance >= 1) return "in_progress";
  return "not_started";
};

const formatJoinDate = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
};

const makeEmail = (name: string, rank: string) => {
  // target: mayor.budi@tni.mil.id, kapten.andi@tni.mil.id, dll
  const rankLower = (rank || "").toLowerCase().replace(/[^a-z]/g, "");
  const parts = name
    .trim()
    .split(/\s+/)
    .map((p) => p.replace(/[^A-Za-z]/g, ""))
    .filter(Boolean);

  if (!parts.length) return "-";

  // Jika name diawali pangkat (contoh: "Mayor Budi Hartono"), ambil kata setelah pangkat sebagai nama depan
  const firstWord = (parts[0] || "").toLowerCase();
  const secondWord = (parts[1] || "").toLowerCase();

  const firstName =
    rankLower && firstWord === rankLower && secondWord ? secondWord : firstWord;

  if (!rankLower || !firstName) return "-";
  return `${rankLower}.${firstName}@tni.mil.id`;
};

const getStatusBadge = (status: RunnerUI["targetStatus"]) => {
  switch (status) {
    case "achieved":
      return (
        <span className="badge-success">
          <Target className="mr-1 h-3 w-3" />
          Tercapai
        </span>
      );
    case "in_progress":
      return (
        <span className="badge-warning">
          <Clock className="mr-1 h-3 w-3" />
          Dalam Proses
        </span>
      );
    default:
      return <span className="badge-pending">Belum Mulai</span>;
  }
};

const DataPelari = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | RunnerUI["targetStatus"]
  >("all");

  const [runners, setRunners] = useState<RunnerUI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/runners`);
        const json = await res.json();
        const data: ApiRunner[] = Array.isArray(json?.data) ? json.data : [];

        const mapped: RunnerUI[] = data.map((x) => {
          const totalDistance =
            typeof x.totalDistance === "number"
              ? x.totalDistance
              : typeof x.total_distance === "number"
              ? x.total_distance
              : 0;

          const totalSessions =
            typeof x.totalSessions === "number"
              ? x.totalSessions
              : typeof x.total_sessions === "number"
              ? x.total_sessions
              : 0;

          const createdAt = x.createdAt ?? x.created_at ?? null;
          const rank = x.rank ?? "-";

          return {
            id: x.id,
            name: x.name,
            rank,
            email: makeEmail(x.name, rank),
            totalSessions,
            totalDistance,
            targetStatus: toTargetStatus(totalDistance),
            joinDate: formatJoinDate(createdAt),
          };
        });

        if (!cancelled) setRunners(mapped);
      } catch {
        if (!cancelled) setRunners([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRunners = useMemo(() => {
    return runners.filter((runner) => {
      const q = searchQuery.toLowerCase();

      const matchesSearch =
        runner.name.toLowerCase().includes(q) ||
        runner.id.toLowerCase().includes(q) ||
        runner.email.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "all" || runner.targetStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [runners, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Data Pelari</h1>
        <p className="page-description">
          Kelola dan pantau seluruh data pelari terdaftar
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, ID, atau email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-3">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as any)}
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status Target" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="achieved">Tercapai</SelectItem>
              <SelectItem value="in_progress">Dalam Proses</SelectItem>
              <SelectItem value="not_started">Belum Mulai</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Table Card (bentuk sama seperti tabel di Dashboard) */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden animate-slide-up">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30">
              <tr className="text-left text-sm text-muted-foreground">
                <th className="px-5 py-3 font-medium">Pangkat</th>
                <th className="px-5 py-3 font-medium">Nama</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Total Sesi</th>
                <th className="px-5 py-3 font-medium">Total Jarak</th>
                <th className="px-5 py-3 font-medium">Status Target</th>
                <th className="px-5 py-3 font-medium">Bergabung</th>
                <th className="px-5 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading...
                  </td>
                </tr>
              ) : filteredRunners.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-8 text-center text-sm text-muted-foreground"
                  >
                    Tidak ada data.
                  </td>
                </tr>
              ) : (
                filteredRunners.map((runner) => (
                  <tr key={runner.id} className="hover:bg-muted/30">
                    <td className="px-5 py-4 font-medium">{runner.rank}</td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {runner.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{runner.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ID : {runner.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-muted-foreground">
                      {runner.email}
                    </td>

                    <td className="px-5 py-4">{runner.totalSessions}</td>

                    <td className="px-5 py-4">
                      {runner.totalDistance.toFixed(2)} km
                    </td>

                    <td className="px-5 py-4">
                      {getStatusBadge(runner.targetStatus)}
                    </td>

                    <td className="px-5 py-4 text-muted-foreground">
                      {runner.joinDate}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link to={`/pelari/${runner.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (UI tetap) */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Menampilkan {filteredRunners.length} dari {runners.length} pelari
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="min-w-[40px]">
              1
            </Button>
            <Button variant="ghost" size="sm" className="min-w-[40px]">
              2
            </Button>
            <Button variant="ghost" size="sm" className="min-w-[40px]">
              3
            </Button>
            <Button variant="outline" size="sm">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataPelari;
