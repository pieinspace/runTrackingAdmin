import { useEffect, useState, useMemo } from 'react';
import { Search, Download, ChevronDown, FileText, FileSpreadsheet, Eye, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL?.toString?.() ||
  "http://localhost:4000";

interface ApiRunner {
  id: string;
  name: string;
  rank: string | null;
  totalDistance?: number;
  total_distance?: number;
  totalSessions?: number;
  total_sessions?: number;
  created_at?: string;
  createdAt?: string;
}

interface ApiTarget14 {
  id: string;
  distance_km: number;
  validation_status: "validated" | "pending";
}

interface Pelari {
  id: string;
  pangkat: string;
  nama: string;
  email: string;
  kesatuan: string; // Not in API yet, use placeholder
  subdis: string;   // Not in API yet, use placeholder
  totalSesi: number;
  totalJarak: number;
  statusTarget: string;
  bergabung: string;
}

const formatDateID = (isoString: string) => {
  if (!isoString) return "-";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "-";
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

const DataPelari = () => {
  const [loading, setLoading] = useState(true);
  const [pelariData, setPelariData] = useState<Pelari[]>([]);

  const [searchNama, setSearchNama] = useState('');
  const [filterKesatuan, setFilterKesatuan] = useState('');
  const [filterSubdis, setFilterSubdis] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [openKesatuan, setOpenKesatuan] = useState(false);
  const [openSubdis, setOpenSubdis] = useState(false);

  // Data dummy untuk dropdown (since API doesn't have these yet)
  const kesatuanList = ['Mabes TNI', 'Puspen TNI', 'Babek TNI', 'Satsiber TNI'];
  const subdisList = ['Subdis 1', 'Subdis 2'];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Runners
        const runnersRes = await fetch(`${API_BASE}/api/runners`);
        const runnersJson = await runnersRes.json();
        const runners: ApiRunner[] = Array.isArray(runnersJson?.data) ? runnersJson.data : [];

        // Fetch Targets
        const targetsRes = await fetch(`${API_BASE}/api/targets/14km`);
        const targetsJson = await targetsRes.json();
        const targets: ApiTarget14[] = Array.isArray(targetsJson?.data) ? targetsJson.data : [];

        // Map data
        const mappedData: Pelari[] = runners.map((r) => {
          const target = targets.find(t => t.id === r.id);

          let statusTarget = "Belum Mulai";
          if (target) {
            if (target.distance_km >= 14 && target.validation_status === "validated") {
              statusTarget = "Tercapai";
            } else if (target.distance_km >= 14 && target.validation_status === "pending") {
              // Technically reached distance but waiting validation. 
              // Could be "Dalam Proses" or separate status. treating as "Dalam Proses" / Pending
              statusTarget = "Dalam Proses";
            } else {
              statusTarget = "Dalam Proses";
            }
          } else {
            // Check if any distance
            const dist = Number(r.totalDistance ?? r.total_distance ?? 0);
            if (dist > 0) statusTarget = "Dalam Proses";
          }

          const rank = r.rank || "-";

          return {
            id: r.id,
            pangkat: rank,
            nama: r.name,
            email: makeEmail(r.name, rank),
            kesatuan: "Mabes TNI", // Placeholder
            subdis: "-",          // Placeholder
            totalSesi: Number(r.totalSessions ?? r.total_sessions ?? 0),
            totalJarak: Number(r.totalDistance ?? r.total_distance ?? 0),
            statusTarget: statusTarget,
            bergabung: formatDateID(r.createdAt ?? r.created_at ?? ""),
          };
        });

        setPelariData(mappedData);

      } catch (err) {
        console.error("Failed to fetch data in DataPelari:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);


  // Filter data
  const filteredData = useMemo(() => {
    return pelariData.filter(pelari => {
      const matchNama = pelari.nama.toLowerCase().includes(searchNama.toLowerCase());
      const matchKesatuan = !filterKesatuan || pelari.kesatuan === filterKesatuan;
      const matchSubdis = !filterSubdis || pelari.subdis === filterSubdis;
      const matchStatus = filterStatus === 'all' || !filterStatus || pelari.statusTarget === filterStatus;
      return matchNama && matchKesatuan && matchSubdis && matchStatus;
    });
  }, [pelariData, searchNama, filterKesatuan, filterSubdis, filterStatus]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Data Pelari</h1>
        <p className="page-description">Kelola dan pantau seluruh data pelari terdaftar</p>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
          {/* Search Nama */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-3 space-y-2">
            <Label>Cari Nama</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama pelari..."
                value={searchNama}
                onChange={(e) => setSearchNama(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Filter Kesatuan */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-3 space-y-2">
            <Label>Kesatuan</Label>
            <Popover open={openKesatuan} onOpenChange={setOpenKesatuan}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openKesatuan}
                  className="w-full justify-between font-normal"
                >
                  {filterKesatuan || "Semua Kesatuan"}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Cari kesatuan..." />
                  <CommandList>
                    <CommandEmpty>Tidak ada kesatuan.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value=""
                        onSelect={() => {
                          setFilterKesatuan("");
                          setOpenKesatuan(false);
                        }}
                      >
                        Semua Kesatuan
                      </CommandItem>
                      {kesatuanList.map((kesatuan) => (
                        <CommandItem
                          key={kesatuan}
                          value={kesatuan}
                          onSelect={(currentValue) => {
                            setFilterKesatuan(currentValue === filterKesatuan ? "" : currentValue);
                            setOpenKesatuan(false);
                          }}
                        >
                          {kesatuan}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Filter Subdis */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 space-y-2">
            <Label>Subdis</Label>
            <Popover open={openSubdis} onOpenChange={setOpenSubdis}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openSubdis}
                  className="w-full justify-between font-normal"
                >
                  {filterSubdis || "Semua Subdis"}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Cari subdis..." />
                  <CommandList>
                    <CommandEmpty>Tidak ada subdis.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value=""
                        onSelect={() => {
                          setFilterSubdis("");
                          setOpenSubdis(false);
                        }}
                      >
                        Semua Subdis
                      </CommandItem>
                      {subdisList.map((subdis) => (
                        <CommandItem
                          key={subdis}
                          value={subdis}
                          onSelect={(currentValue) => {
                            setFilterSubdis(currentValue === filterSubdis ? "" : currentValue);
                            setOpenSubdis(false);
                          }}
                        >
                          {subdis}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Filter Status */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 space-y-2">
            <Label>Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="Tercapai">Tercapai</SelectItem>
                <SelectItem value="Dalam Proses">Dalam Proses</SelectItem>
                <SelectItem value="Belum Mulai">Belum Mulai</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Button */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 flex items-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="w-full gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => alert("Export PDF")}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => alert("Export Excel")}>
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
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    Memuat data...
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((pelari) => (
                  <tr key={pelari.id}>
                    <td className="font-medium text-sm text-foreground">{pelari.pangkat}</td>
                    <td className="font-medium text-foreground">{pelari.nama}</td>
                    <td className="text-muted-foreground">{pelari.email}</td>
                    <td className="text-foreground">{pelari.totalSesi}</td>
                    <td className="font-semibold text-primary">{(pelari.totalJarak || 0).toFixed(2)} km</td>
                    <td>
                      {pelari.statusTarget === 'Tercapai' ? (
                        <span className="badge-success">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Tercapai
                        </span>
                      ) : pelari.statusTarget === 'Dalam Proses' ? (
                        <span className="badge-warning">
                          <Clock className="mr-1 h-3 w-3" />
                          Dalam Proses
                        </span>
                      ) : (
                        <span className="badge-pending">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Belum Mulai
                        </span>
                      )}
                    </td>
                    <td className="text-muted-foreground">{pelari.bergabung}</td>
                    <td className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/pelari/${pelari.id}`}>
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Detail</span>
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    Tidak ada data pelari yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-4 border-t border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Menampilkan {filteredData.length} dari {pelariData.length} pelari
          </p>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" disabled>
              ‹
            </Button>
            <Button variant="default" size="sm" className="h-8 w-8 p-0">
              1
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              2
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              3
            </Button>
            <Button variant="outline" size="sm" disabled>
              ›
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataPelari;