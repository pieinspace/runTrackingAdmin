import { useState } from "react";
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

/* ================== DATA DUMMY ================== */
const reportData = [
  {
    no: 1,
    nama: "Syaiful Latif, S.Pd., M.M.",
    pangkat: "Kolonel Inf",
    nip: "11970017100171",
    jabatan: "Kasubdis Binsisfomin Disinfolahtad",
    umur: 54,
    aktivitas: "Lari",
    jarak: 3200,
    ket: "",
  },
  {
    no: 2,
    nama: "Eko Widiyanto",
    pangkat: "Letkol Cke",
    nip: "2920016170171",
    jabatan: "Kabagisfominlog Subdis Binsisfomin",
    umur: 53,
    aktivitas: "Lari",
    jarak: 3000,
    ket: "",
  },
];

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
];

const Laporan = () => {
  const [period, setPeriod] = useState("weekly");
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  /* ================== GET CURRENT DATE PERIOD ================== */
  const getCurrentPeriodText = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    if (period === "daily") {
      return now.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    } else if (period === "weekly") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
      
      const startStr = startOfWeek.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long"
      });
      const endStr = endOfWeek.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
      
      return `${startStr} s.d. ${endStr}`;
    } else if (period === "monthly") {
      return now.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric"
      });
    }
    
    return "";
  };

  /* ================== GENERATE PDF ================== */
  const generatePDF = () => {
    const element = document.getElementById("report-preview");
    if (!element) return;

    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
      filename: `laporan-${selectedReport}-${period}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" as const },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };

    html2pdf().set(opt).from(element).save();
  };

  /* ================== GENERATE EXCEL ================== */
  const generateExcel = () => {
    // Prepare data for Excel
    const excelData = reportData.map(row => ({
      'No': row.no,
      'Nama': row.nama,
      'Pangkat / Korps': row.pangkat,
      'NRP / NIP': row.nip,
      'Jabatan': row.jabatan,
      'Umur': row.umur,
      'Lari / Jalan': row.aktivitas,
      'Jarak (m)': row.jarak,
      'Ket': row.ket
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Add title rows
    const titleRows = [
      ['Laporan Pencapaian Pembinaan Fisik Mingguan'],
      ['Subdis Binsisfomin Disinfolahtad'],
      [`Periode ${getCurrentPeriodText()}`],
      [''] // Empty row
    ];

    XLSX.utils.sheet_add_aoa(ws, titleRows, { origin: 'A1' });

    // Move data down to make room for titles
    const dataRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
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

    // Update the range
    ws['!ref'] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: dataRange.e.r + 4, c: dataRange.e.c }
    });

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');

    // Generate filename and save
    const filename = `laporan-${selectedReport}-${period}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

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
        <Select value={period} onValueChange={setPeriod}>
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
          <div
            id="report-preview"
            className="bg-white rounded-lg border shadow"
          >
          {/* ----------- JUDUL LAPORAN ----------- */}
          <div className="p-6 text-center">
            <h2 className="font-bold text-lg uppercase">
              Laporan Pencapaian Pembinaan Fisik Mingguan
            </h2>
            <p className="text-sm">
              Subdis Binsisfomin Disinfolahtad <br />
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
                    "Nama",
                    "Pangkat / Korps",
                    "NRP / NIP",
                    "Jabatan",
                    "Umur",
                    "Lari / Jalan",
                    "Jarak (m)",
                    "Ket",
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
                {reportData.map((row) => (
                  <tr key={row.no}>
                    <td className="border border-black p-1 text-center">
                      {row.no}
                    </td>
                    <td className="border border-black p-1">
                      {row.nama}
                    </td>
                    <td className="border border-black p-1">
                      {row.pangkat}
                    </td>
                    <td className="border border-black p-1">
                      {row.nip}
                    </td>
                    <td className="border border-black p-1">
                      {row.jabatan}
                    </td>
                    <td className="border border-black p-1 text-center">
                      {row.umur}
                    </td>
                    <td className="border border-black p-1 text-center">
                      {row.aktivitas}
                    </td>
                    <td className="border border-black p-1 text-right">
                      {row.jarak}
                    </td>
                    <td className="border border-black p-1 text-center">
                      {row.ket}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ----------- TOMBOL DOWNLOAD (DI LUAR PDF) ----------- */}
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" className="gap-2" onClick={generatePDF}>
            <FileText className="h-4 w-4" />
            Download PDF
          </Button>
          <Button variant="default" className="gap-2" onClick={generateExcel}>
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
