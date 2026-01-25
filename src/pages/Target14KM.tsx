import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  Trophy,
  ChevronDown,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TargetRunner {
  id: string;
  name: string;
  rank: string;
  distance: number;
  time: string;
  pace: string;
  achievedDate: string; // untuk ditampilkan (format Indonesia)
  achievedDateRaw: string; // YYYY-MM-DD untuk filter
  validationStatus: "validated" | "pending";
}

type ApiTargetRow = {
  id: string; // runner_id
  name: string;
  rank: string;
  distance_km: number;
  time_taken: string | null;
  pace: string | null;
  achieved_date: string; // YYYY-MM-DD
  validation_status: "validated" | "pending";
};

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL?.toString?.() ||
  "http://localhost:4000";

const formatDateID = (yyyyMmDd: string) => {
  // input: "2026-01-09"
  const d = new Date(`${yyyyMmDd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return yyyyMmDd;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
};

const isInPeriod = (yyyyMmDd: string, period: string) => {
  if (period === "all") return true;

  const date = new Date(`${yyyyMmDd}T00:00:00`);
  if (Number.isNaN(date.getTime())) return true;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === "today") {
    return date >= startOfToday;
  }

  if (period === "week") {
    // 7 hari terakhir termasuk hari ini
    const start = new Date(startOfToday);
    start.setDate(start.getDate() - 6);
    return date >= start;
  }

  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return date >= start;
  }

  return true;
};

const Target14KM = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const [targetRunners, setTargetRunners] = useState<TargetRunner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/targets/14km`);
        const json = await res.json();
        const data: ApiTargetRow[] = Array.isArray(json?.data) ? json.data : [];

        const mapped: TargetRunner[] = data.map((r) => ({
          id: r.id,
          name: r.name,
          rank: r.rank,
          distance: Number(r.distance_km ?? 0),
          time: r.time_taken ?? "0:00:00",
          pace: r.pace ?? "0:00/km",
          achievedDate: formatDateID(r.achieved_date),
          achievedDateRaw: r.achieved_date,
          validationStatus: r.validation_status,
        }));

        if (!cancelled) setTargetRunners(mapped);
      } catch (e) {
        if (!cancelled) setTargetRunners([]);
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
    return targetRunners.filter((runner) => {
      const matchesSearch =
        runner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        runner.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || runner.validationStatus === statusFilter;

      const matchesDate = isInPeriod(runner.achievedDateRaw, dateFilter);

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [targetRunners, searchQuery, statusFilter, dateFilter]);

  const validatedCount = useMemo(
    () => targetRunners.filter((r) => r.validationStatus === "validated").length,
    [targetRunners]
  );
  const pendingCount = useMemo(
    () => targetRunners.filter((r) => r.validationStatus === "pending").length,
    [targetRunners]
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="page-title">Target 14 KM</h1>
            <p className="page-description">
              Daftar pelari yang telah mencapai target 14 KM
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="stat-card">
          <p className="text-sm font-medium text-muted-foreground">
            Total Tercapai
          </p>
          <p className="text-2xl font-bold text-foreground">
            {targetRunners.length}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-sm font-medium text-muted-foreground">
            Tervalidasi
          </p>
          <p className="text-2xl font-bold text-success">{validatedCount}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm font-medium text-muted-foreground">
            Menunggu Validasi
          </p>
          <p className="text-2xl font-bold text-warning">{pendingCount}</p>
        </div>
      </div>

      {/* Filters - Grid Layout sama seperti Data Pelari */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="grid grid-cols-12 gap-4">
          {/* Search Nama */}
          <div className="col-span-12 sm:col-span-3">
            <label className="block text-sm font-medium text-foreground mb-2">
              Cari Nama
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama pelari..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filter Status Validasi */}
          <div className="col-span-12 sm:col-span-3">
            <label className="block text-sm font-medium text-foreground mb-2">
              Status Validasi
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="validated">Tervalidasi</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Periode Waktu */}
          <div className="col-span-12 sm:col-span-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Periode Waktu
            </label>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Semua Waktu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Waktu</SelectItem>
                <SelectItem value="today">Hari Ini</SelectItem>
                <SelectItem value="week">Minggu Ini</SelectItem>
                <SelectItem value="month">Bulan Ini</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Button */}
          <div className="col-span-12 sm:col-span-2 flex items-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <FileText className="mr-2 h-4 w-4" />
                  Export PDF
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pangkat</th>
                <th>Nama Pelari</th>
                <th>Jarak Tempuh</th>
                <th>Waktu Tempuh</th>
                <th>Pace Rata-rata</th>
                <th>Tanggal Pencapaian</th>
                <th>Status Validasi</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    Loading...
                  </td>
                </tr>
              ) : filteredRunners.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    Tidak ada data.
                  </td>
                </tr>
              ) : (
                filteredRunners.map((runner) => (
                  <tr key={`${runner.id}-${runner.achievedDateRaw}`}>
                    <td className="font-medium text-sm">{runner.rank}</td>
                    <td className="font-medium">{runner.name}</td>
                    <td className="font-semibold text-primary">
                      {runner.distance.toFixed(2)} km
                    </td>
                    <td>{runner.time}</td>
                    <td>{runner.pace}</td>
                    <td className="text-muted-foreground">{runner.achievedDate}</td>
                    <td>
                      {runner.validationStatus === "validated" ? (
                        <span className="badge-success">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Tervalidasi
                        </span>
                      ) : (
                        <span className="badge-pending">
                          <Clock className="mr-1 h-3 w-3" />
                          Pending
                        </span>
                      )}
                    </td>
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
        </div>
      </div>
    </div>
  );
};

export default Target14KM;