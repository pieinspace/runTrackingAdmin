import { useEffect, useMemo, useState } from "react";
import { FileText, FileSpreadsheet, Calendar, BarChart3, Users, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import html2pdf from "html2pdf.js";
import * as XLSX from "xlsx";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL?.toString?.() ||
  "http://localhost:4000";

/* ================== TIPE LAPORAN ================== */
const reportTypes = [
  {
    id: "active",
    title: "Laporan Pelari Aktif",
    description: "Data pelari yang aktif berdasarkan periode tertentu",
    icon: Users,
  },
  {
    id: "target",
    title: "Laporan Pencapaian Target",
    description: "Statistik pencapaian target seluruh pelari",
    icon: Target,
  },
  {
    id: "14km",
    title: "Laporan Khusus Target 14 KM",
    description: "Detail lengkap pelari yang mencapai target 14 KM",
    icon: BarChart3,
  },
] as const;

type ReportTypeId = (typeof reportTypes)[number]["id"];

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
  id: string; // runner_id
  name: string;
  rank: string;
  distance_km: number;
  time_taken: string | null;
  pace: string | null;
  achieved_date: string; // YYYY-MM-DD
  validation_status: "validated" | "pending";
};

type ReportRow = {
  no: number;
  id: string;
  nama: string;
  pangkat: string;
  jarakKm: number;
  waktu: string;
  pace: string;
  tanggal: string;
  status: string;
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

const isInPeriod = (dateYYYYMMDD: string, period: string) => {
  // period: daily/weekly/monthly
  const date = new Date(`${dateYYYYMMDD}T00:00:00`);
  if (Number.isNaN(date.getTime())) return true;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === "daily") {
    return date >= startOfToday;
  }

  if (period === "weekly") {
    const start = new Date(startOfToday);
    start.setDate(start.getDate() - 6);
    return date >= start;
  }

  if (period === "monthly") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return date >= start;
  }

  return true;
};

const Laporan = () => {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [selectedReport, setSelectedReport] = useState<ReportTypeId | null>(null);

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  /* ================== GET CURRENT DATE PERIOD ================== */
  const getCurrentPeriodText = () => {
    const now = new Date();
    const currentYear = now.getFullYear();

    if (period === "daily") {
      return now.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } else if (period === "weekly") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

      const startStr = startOfWeek.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
      });
      const endStr = endOfWeek.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      return `${startStr} s.d. ${endStr}`;
    } else if (period === "monthly") {
      return now.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      });
    }

    return `${currentYear}`;
  };

  /* ================== LOAD DATA ASLI DARI API ================== */
  useEffect(() => {
    if (!selectedReport) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        if (selectedReport === "14km") {
          const res = await fetch(`${API_BASE}/api/targets/14km`);
          const json = await res.json();
          const data: ApiTarget14[] = Array.isArray(json?.data) ? json.data : [];

          // filter periode berdasarkan achieved_date
          const filtered = data.filter((x) => isInPeriod(x.achieved_date, period));

          const mapped: ReportRow[] = filtered.map((x, i) => ({
            no: i + 1,
            id: x.id,
            nama: x.name,
            pangkat: x.rank,
            jarakKm: Number(x.distance_km ?? 0),
            waktu: x.time_taken ?? "-",
            pace: x.pace ?? "-",
            tanggal: formatDateID(x.achieved_date),
            status: x.validation_status === "validated" ? "Tervalidasi" : "Pending",
          }));

          if (!cancelled) setRows(mapped);
        } else {
          // report "active" & "target" sementara pakai runners (karena DB kamu belum punya tabel detail aktivitas harian)
          const res = await fetch(`${API_BASE}/api/runners`);
          const json = await res.json();
          const data: ApiRunner[] = Array.isArray(json?.data) ? json.data : [];

          const mapped: ReportRow[] = data.map((x, i) => {
            const totalDistance =
              typeof x.totalDistance === "number"
                ? x.totalDistance
                : typeof x.total_distance === "number"
                ? x.total_distance
                : 0;

            const created = (x.createdAt ?? x.created_at ?? "").toString();
            const dateYYYYMMDD = created ? created.slice(0, 10) : "1970-01-01";
            const dateOk = isInPeriod(dateYYYYMMDD, period);

            if (!dateOk) return null;

            const status =
              totalDistance >= 14 ? "Tercapai" : totalDistance >= 1 ? "Dalam Proses" : "Belum Mulai";

            return {
              no: i + 1,
              id: x.id,
              nama: x.name,
              pangkat: x.rank ?? "-",
              jarakKm: totalDistance,
              waktu: "-",
              pace: "-",
              tanggal: created ? formatDateID(dateYYYYMMDD) : "-",
              status,
            };
          }).filter(Boolean) as ReportRow[];

          if (!cancelled) setRows(mapped);
        }
      } catch (e) {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [selectedReport, period]);

  /* ================== GENERATE PDF ================== */
  const generatePDF = () => {
    const element = document.getElementById("report-preview");
    if (!element || !selectedReport) return;

    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
      filename: `laporan-${selectedReport}-${period}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" as const },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };

    // @ts-ignore
    html2pdf().set(opt).from(element).save();
  };

  /* ================== GENERATE EXCEL ================== */
  const generateExcel = () => {
    if (!selectedReport) return;

    const excelData = rows.map((r) => ({
      No: r.no,
      "ID Pelari": r.id,
      Nama: r.nama,
      Pangkat: r.pangkat,
      "Jarak (km)": r.jarakKm,
      Waktu: r.waktu,
      Pace: r.pace,
      Tanggal: r.tanggal,
      Status: r.status,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    const titleRows = [
      ["Laporan Monitoring"],
      ["SISFORUN - Admin Panel"],
      [`Periode ${getCurrentPeriodText()}`],
      [""] // empty
    ];

    XLSX.utils.sheet_add_aoa(ws, titleRows, { origin: "A1" });

    const dataRange = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let row = dataRange.e.r; row >= 4; row--) {
      for (let col = dataRange.s.c; col <= dataRange.e.c; col++) {
        const fromCell = XLSX.utils.encode_cell({ r: row, c: col });
        const toCell = XLSX.utils.encode_cell({ r: row + 4, c: col });
        if (ws[fromCell]) {
          ws[toCell] = ws[fromCell];
          delete ws[fromCell];
        }
      }
    }

    ws["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: dataRange.e.r + 4, c: dataRange.e.c },
    });

    XLSX.utils.book_append_sheet(wb, ws, "Laporan");

    XLSX.writeFile(wb, `laporan-${selectedReport}-${period}.xlsx`);
  };

  const tableTitle = useMemo(() => {
    if (selectedReport === "14km") return "Laporan Khusus Target 14 KM";
    if (selectedReport === "target") return "Laporan Pencapaian Target";
    return "Laporan Pelari Aktif";
  }, [selectedReport]);

  return (
    <div className="space-y-6">
      {/* ================= HEADER ================= */}
      <div>
        <h1 className="text-2xl font-bold">Laporan</h1>
        <p className="text-sm text-muted-foreground">
          Generate dan unduh laporan monitoring
        </p>
      </div>

      {/* ================= PILIH PERIODE ================= */}
      <div className="flex items-center gap-4">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium">Periode:</span>
        <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Harian</SelectItem>
            <SelectItem value="weekly">Mingguan</SelectItem>
            <SelectItem value="monthly">Bulanan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ================= JENIS LAPORAN ================= */}
      <div className="grid gap-4 md:grid-cols-3">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          const isSelected = selectedReport === report.id;

          return (
            <Card
              key={report.id}
              className={`cursor-pointer transition-all ${
                isSelected ? "ring-2 ring-primary" : "hover:shadow"
              }`}
              onClick={() => setSelectedReport(report.id)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{report.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{report.description}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ================= PREVIEW & DOWNLOAD ================= */}
      {selectedReport && (
        <>
          <div id="report-preview" className="bg-white rounded-lg border shadow">
            {/* ----------- JUDUL LAPORAN ----------- */}
            <div className="p-6 text-center">
              <h2 className="font-bold text-lg uppercase">{tableTitle}</h2>
              <p className="text-sm">
                SISFORUN - Admin Panel <br />
                Periode {getCurrentPeriodText()}
              </p>
            </div>

            {/* ----------- TABEL ----------- */}
            <div className="p-4 overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    {[
                      "No",
                      "ID Pelari",
                      "Nama",
                      "Pangkat",
                      "Jarak (km)",
                      "Waktu",
                      "Pace",
                      "Tanggal",
                      "Status",
                    ].map((h) => (
                      <th
                        key={h}
                        className="border border-black p-1 text-center font-bold"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="border border-black p-2 text-center" colSpan={9}>
                        Loading...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td className="border border-black p-2 text-center" colSpan={9}>
                        Tidak ada data.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={`${row.id}-${row.no}`}>
                        <td className="border border-black p-1 text-center">{row.no}</td>
                        <td className="border border-black p-1">{row.id}</td>
                        <td className="border border-black p-1">{row.nama}</td>
                        <td className="border border-black p-1">{row.pangkat}</td>
                        <td className="border border-black p-1 text-right">{row.jarakKm}</td>
                        <td className="border border-black p-1 text-center">{row.waktu}</td>
                        <td className="border border-black p-1 text-center">{row.pace}</td>
                        <td className="border border-black p-1 text-center">{row.tanggal}</td>
                        <td className="border border-black p-1 text-center">{row.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ----------- TOMBOL DOWNLOAD ----------- */}
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" className="gap-2" onClick={generatePDF} disabled={loading || rows.length === 0}>
              <FileText className="h-4 w-4" />
              Download PDF
            </Button>
            <Button variant="default" className="gap-2" onClick={generateExcel} disabled={loading || rows.length === 0}>
              <FileSpreadsheet className="h-4 w-4" />
              Download Excel
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default Laporan;
