import { useEffect, useMemo, useState } from "react";
import { FileText, FileSpreadsheet, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import html2pdf from "html2pdf.js";
import * as XLSX from "xlsx";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL?.toString?.() ||
  "http://localhost:4000";

type ApiTarget14 = {
  id: string; // runner_id
  name: string;
  rank: string;
  distance_km: number;
  time_taken: string | null;
  pace: string | null;
  achieved_date: string; // YYYY-MM-DD
  validation_status: "validated" | "pending";
  kesatuan?: string;
  subdis?: string;
};

type ReportRow = {
  no: number;
  id: string;
  nama: string;
  pangkat: string; // PANGKAT/KORPS
  nrp: string; // NRP/NIP
  jabatan: string;
  umur: string;
  lariJalan: string;
  jarakKm: number; // JARAK TEMPUH METER (dikonversi dari km)
  dataAplikasi: string;
  ket: string;
  kesatuan: string;
  subdis: string;
};

const formatDateID = (yyyyMmDd: string) => {
  const d = new Date(`${yyyyMmDd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return yyyyMmDd;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
};

// Data dummy untuk kesatuan dan subdis
const kesatuanList = [
  "Kesatuan A",
  "Kesatuan B",
  "Kesatuan C",
  "Kesatuan D",
  "Kesatuan E",
];

const subdisList = [
  "Subdis 1",
  "Subdis 2",
  "Subdis 3",
  "Subdis 4",
  "Subdis 5",
];

const Laporan = () => {
  const [filterKesatuan, setFilterKesatuan] = useState("");
  const [filterSubdis, setFilterSubdis] = useState("");
  const [openKesatuan, setOpenKesatuan] = useState(false);
  const [openSubdis, setOpenSubdis] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  /* ================== LOAD DATA ASLI DARI API ================== */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/targets/14km`);
        const json = await res.json();
        const data: ApiTarget14[] = Array.isArray(json?.data) ? json.data : [];

        const mapped: ReportRow[] = data.map((x, i) => ({
          no: i + 1,
          id: x.id,
          nama: x.name,
          pangkat: x.rank,
          nrp: x.id, // Menggunakan ID sebagai placeholder NRP
          jabatan: "-", // Data belum ada
          umur: "-", // Data belum ada
          lariJalan: "", // Kosong sesuai template
          jarakKm: Number(x.distance_km ?? 0),
          dataAplikasi: x.time_taken ? `${x.time_taken} / ${x.pace}` : "-",
          ket: x.validation_status === "validated" ? "" : "Belum Valid",
          kesatuan: x.kesatuan ?? "Kesatuan A",
          subdis: x.subdis ?? "Subdis 1",
        }));

        if (!cancelled) setRows(mapped);
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
  }, []);

  /* ================== FILTER DATA BERDASARKAN KESATUAN & SUBDIS ================== */
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchKesatuan = !filterKesatuan || row.kesatuan === filterKesatuan;
      const matchSubdis = !filterSubdis || row.subdis === filterSubdis;
      return matchKesatuan && matchSubdis;
    });
  }, [rows, filterKesatuan, filterSubdis]);

  /* ================== GENERATE PDF ================== */
  const handlePreviewPDF = () => {
    const element = document.getElementById("report-print");
    if (!element) return;

    // Show the hidden element specifically for capture
    element.style.display = 'block';

    const opt = {
      margin: [0.2, 0.2, 0.2, 0.2] as [number, number, number, number],
      filename: `laporan-binsik-mingguan.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: "in", format: "a4", orientation: "landscape" as const },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };

    // @ts-ignore
    html2pdf().set(opt).from(element).output('bloburl').then((blobUrl: string) => {
      setPreviewUrl(blobUrl);
      setIsPreviewOpen(true);
      // Hide it again after capture
      element.style.display = 'none';
    });
  };

  /* ================== GENERATE EXCEL ================== */
  const generateExcel = () => {
    const excelData = filteredRows.map((r, i) => ({
      URT: i + 1,
      BAG: Math.ceil((i + 1) / 5), // Dummy grouping
      NAMA: r.nama,
      "PANGKAT/KORPS": r.pangkat,
      "NRP/NIP": r.nrp,
      JABATAN: r.jabatan,
      "UMUR (TAHUN)": r.umur,
      "LARI / JALAN": r.lariJalan,
      "JARAK TEMPUH (METER)": (r.jarakKm * 1000).toLocaleString('id-ID'),
      "DATA APLIKASI": r.dataAplikasi,
      KET: r.ket,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    const titleRows = [
      ["DINAS INFORMASI DAN PENGOLAHAN DATA TNI AD"],
      ["SUBDIS BINSISFOMIN"],
      [""],
      ["LAPORAN PENCAPAIAN PEMBINAAN FISIK MINGGUAN"],
      ["SUBDIS BINSISFOMIN DISINFOLAHTAD"],
      [`PERIODE TANGGAL ... S.D. ${new Date().toLocaleDateString("id-ID").toUpperCase()}`],
      [""]
    ];

    XLSX.utils.sheet_add_aoa(ws, titleRows, { origin: "A1" });
    XLSX.writeFile(wb, `laporan-binsik-mingguan.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* ================= HEADER ================= */}
      <div>
        <h1 className="text-2xl font-bold">Laporan Mingguan</h1>
        <p className="text-sm text-muted-foreground">
          Rekapitulasi hasil pembinaan fisik lari/jalan
        </p>
      </div>

      {/* ================= FILTER KESATUAN & SUBDIS ================= */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Popover open={openKesatuan} onOpenChange={setOpenKesatuan}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={openKesatuan} className="w-full justify-between">
                  {filterKesatuan || "Semua Kesatuan"}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandInput placeholder="Cari kesatuan..." />
                  <CommandList>
                    <CommandEmpty>Tidak ada kesatuan.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem value="" onSelect={() => { setFilterKesatuan(""); setOpenKesatuan(false); }}>Semua Kesatuan</CommandItem>
                      {kesatuanList.map((kesatuan) => (
                        <CommandItem key={kesatuan} value={kesatuan} onSelect={(currentValue) => { setFilterKesatuan(currentValue === filterKesatuan ? "" : currentValue); setOpenKesatuan(false); }}>{kesatuan}</CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex-1">
            <Popover open={openSubdis} onOpenChange={setOpenSubdis}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={openSubdis} className="w-full justify-between">
                  {filterSubdis || "Semua Subdis"}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandInput placeholder="Cari subdis..." />
                  <CommandList>
                    <CommandEmpty>Tidak ada subdis.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem value="" onSelect={() => { setFilterSubdis(""); setOpenSubdis(false); }}>Semua Subdis</CommandItem>
                      {subdisList.map((subdis) => (
                        <CommandItem key={subdis} value={subdis} onSelect={(currentValue) => { setFilterSubdis(currentValue === filterSubdis ? "" : currentValue); setOpenSubdis(false); }}>{subdis}</CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Tombol Download */}
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handlePreviewPDF} disabled={loading || filteredRows.length === 0}>
              <FileText className="h-4 w-4" /> PDF
            </Button>
            <Button variant="default" className="gap-2" onClick={generateExcel} disabled={loading || filteredRows.length === 0}>
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
          </div>
        </div>
      </div>

      {/* ================= PDF PREVIEW DIALOG ================= */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Preview Laporan PDF</DialogTitle>
          </DialogHeader>
          <div className="flex-1 w-full h-full min-h-[500px] bg-gray-100 rounded-md overflow-hidden">
            {previewUrl ? (
              <iframe src={previewUrl} className="w-full h-full" title="PDF Preview" />
            ) : (
              <div className="flex items-center justify-center h-full">Memuat Preview...</div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Tutup</Button>
            <Button onClick={() => {
              const link = document.createElement('a');
              link.href = previewUrl || "";
              link.download = `laporan-binsik-mingguan.pdf`;
              link.click();
            }}>Download PDF</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================= TABEL DATA (VIEW LAYAR) ================= */}
      <div className="bg-white rounded-lg border shadow overflow-hidden">
        <div className="p-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-center">No</th>
                <th className="border p-2 text-left">Nama</th>
                <th className="border p-2 text-left">Pangkat</th>
                <th className="border p-2 text-right">Jarak (KM)</th>
                <th className="border p-2 text-center">Waktu / Pace</th>
                <th className="border p-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-4 text-center">Loading...</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-center">Tidak ada data.</td></tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td className="border p-2 text-center">{row.no}</td>
                    <td className="border p-2">{row.nama}</td>
                    <td className="border p-2">{row.pangkat}</td>
                    <td className="border p-2 text-right">{row.jarakKm.toFixed(2)}</td>
                    <td className="border p-2 text-center">{row.dataAplikasi}</td>
                    <td className="border p-2 text-center">{row.ket || "Tervalidasi"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= PRINT LAYOUT (HIDDEN) ================= */}
      <div style={{ display: 'none' }}>
        <div id="report-print" className="p-8 bg-white text-black text-[10px] leading-tight font-sans w-[11.69in]">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="text-left font-bold top-0">
              <p>DINAS INFORMASI DAN PENGOLAHAN DATA TNI AD</p>
              <p className="underline">SUBDIS BINSISFOMIN</p>
            </div>
            <div className="text-left w-1/3">
              <p>Lampiran I (Rekapitulasi hasil pembinaan fisik lari/jalan) Subdis Binsisfomin Disinfolahtad</p>
              <div className="w-full h-px bg-black mt-1"></div>
            </div>
          </div>

          <div className="text-center font-bold mb-4">
            <p>LAPORAN PENCAPAIAN PEMBINAAN FISIK MINGGUAN</p>
            <p>SUBDIS BINSISFOMIN DISINFOLAHTAD</p>
            <p className="uppercase">PERIODE TANGGAL ... S.D. {formatDateID(new Date().toISOString().split('T')[0]).toUpperCase()}</p>
          </div>

          {/* Table */}
          <table className="w-full border-collapse border border-black mb-8">
            <thead>
              <tr className="text-center font-bold">
                <th rowSpan={2} className="border border-black p-1 w-8">NO<br /><br />URT</th>
                <th rowSpan={2} className="border border-black p-1 w-8">BAG</th>
                <th rowSpan={2} className="border border-black p-1">NAMA</th>
                <th rowSpan={2} className="border border-black p-1">PANGKAT/<br />KORPS</th>
                <th rowSpan={2} className="border border-black p-1">NRP/NIP</th>
                <th rowSpan={2} className="border border-black p-1">JABATAN</th>
                <th rowSpan={2} className="border border-black p-1 w-12">UMUR<br />(THN)</th>
                <th colSpan={2} className="border border-black p-1">LARI / JALAN</th>
                <th rowSpan={2} className="border border-black p-1">DATA APLIKASI</th>
                <th rowSpan={2} className="border border-black p-1">KET</th>
              </tr>
              <tr className="text-center font-bold">
                <th className="border border-black p-1">LARI/<br />JALAN</th>
                <th className="border border-black p-1">JARAK TEMPUH<br />(METER)</th>
              </tr>
              <tr className="text-center text-[9px] bg-gray-100">
                {Array.from({ length: 11 }).map((_, i) => (
                  <th key={i} className="border border-black p-1">{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Grouping Dummy: Militer */}
              <tr>
                <td className="border border-black p-1 text-center font-bold"></td>
                <td className="border border-black p-1 text-center font-bold">A</td>
                <td colSpan={9} className="border border-black p-1 font-bold">MILITER</td>
              </tr>

              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td className="border border-black p-1 text-center">{row.no}</td>
                  <td className="border border-black p-1 text-center">{row.no}</td> {/* Dummy BAG */}
                  <td className="border border-black p-1">{row.nama}</td>
                  <td className="border border-black p-1 text-center">{row.pangkat}</td>
                  <td className="border border-black p-1 text-center">{row.nrp}</td>
                  <td className="border border-black p-1">{row.jabatan}</td>
                  <td className="border border-black p-1 text-center">{row.umur}</td>
                  <td className="border border-black p-1 text-center"></td>
                  <td className="border border-black p-1 text-center">{(row.jarakKm * 1000).toLocaleString('id-ID')}</td>
                  <td className="border border-black p-1 text-center">{row.dataAplikasi}</td>
                  <td className="border border-black p-1 text-center">{row.ket}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer / Signatures */}
          <div className="flex justify-between text-center break-inside-avoid">
            <div className="text-left w-1/3">
              <p>Mengetahui</p>
              <p>a.n. Kepala Disinfolahta TNI AD</p>
              <p>Sekretaris,</p>
              <br /><br /><br />
              <p className="font-bold underline">Moch. Zaenal Abidin</p>
              <p>Kolonel Arh NRP 1920041090570</p>
            </div>
            <div className="w-1/3">
              <p className="text-left mb-4">Jakarta, &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {formatDateID(new Date().toISOString().split('T')[0])} <br /> Kasubdis Binsisfomin,</p>
              <br /><br /><br /><br />
              <div className="text-left">
                <p className="font-bold underline">Syaiful Latif, S.Pd., M.M.</p>
                <p>Kolonel Inf NRP 11970017100171</p>
              </div>
            </div>
          </div>

          {/* Rekapitulasi Box */}
          <div className="mt-8 border border-black p-2 w-1/3 text-xs">
            <p className="font-bold underline mb-1">Rekapitulasi :</p>
            <div className="flex">
              <div className="w-6">A.</div>
              <div>
                <p>Militer : {filteredRows.length} Orang</p>
                <div className="pl-4">
                  <p>1. Tercapai : {filteredRows.filter(r => !r.ket).length} Orang</p>
                  <p>2. Tidak tercapai : {filteredRows.filter(r => r.ket).length} Orang</p>
                </div>
              </div>
            </div>
            <div className="flex mt-2">
              <div className="w-6">B.</div>
              <div>
                <p>ASN : 0 Orang</p>
                <div className="pl-4">
                  <p>1. Tercapai : 0 Orang</p>
                  <p>2. Tidak tercapai : 0 Orang</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Laporan;