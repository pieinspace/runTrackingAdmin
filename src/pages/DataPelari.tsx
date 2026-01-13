import { useEffect, useState } from "react";
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

interface Runner {
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
  status?: string | null; // validated | pending | dll
  totalDistance?: number;
  totalSessions?: number;
  total_distance?: number; // kalau API masih snake_case
  total_sessions?: number;
  createdAt?: string;
  created_at?: string;
};

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL?.toString?.() ||
  "http://localhost:4000";

const toTargetStatus = (status?: string | null): Runner["targetStatus"] => {
  if (status === "validated") return "achieved";
  if (status === "pending") return "in_progress";
  return "not_started";
};

const makeEmailFromName = (name: string) => {
  // bikin mirip contoh UI: "budi.hartono@tni.mil.id"
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(".");
  return cleaned ? `${cleaned}@tni.mil.id` : "-";
};

const formatJoinDate = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  // contoh: "01 Des 2025"
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
};

const getStatusBadge = (status: Runner["targetStatus"]) => {
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
  const [statusFilter, setStatusFilter] = useState("all");

  const [runners, setRunners] = useState<Runner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/runners`);
        const json = await res.json();

        const data: ApiRunner[] = Array.isArray(json?.data) ? json.data : [];

        const mapped: Runner[] = data.map((x) => {
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

          return {
            id: x.id,
            name: x.name,
            rank: x.rank ?? "-",
            email: makeEmailFromName(x.name),
            totalSessions,
            totalDistance,
            targetStatus: toTargetStatus(x.status),
            joinDate: formatJoinDate(createdAt),
          };
        });

        if (!cancelled) setRunners(mapped);
      } catch (e) {
        // kalau API down, biarkan kosong (UI tetap)
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

  const filteredRunners = runners.filter((runner) => {
    const matchesSearch =
      runner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      runner.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      runner.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || runner.targetStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Pangkat</th>
              <th>Nama</th>
              <th>Email</th>
              <th>Total Sesi</th>
              <th>Total Jarak</th>
              <th>Status Target</th>
              <th>Bergabung</th>
              <th className="text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : filteredRunners.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                  Tidak ada data.
                </td>
              </tr>
            ) : (
              filteredRunners.map((runner) => (
                <tr key={runner.id}>
                  <td className="font-medium">{runner.rank}</td>
                  <td>
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
                          ID: {runner.id}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="text-muted-foreground">{runner.email}</td>
                  <td>{runner.totalSessions}</td>
                  <td>{runner.totalDistance.toFixed(1)} km</td>
                  <td>{getStatusBadge(runner.targetStatus)}</td>
                  <td className="text-muted-foreground">{runner.joinDate}</td>
                  <td className="text-right">
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

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Menampilkan {filteredRunners.length} dari {runners.length} pelari
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
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
