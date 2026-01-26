import { Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const admins = [
  { id: 1, name: "Admin SISFORUN", email: "admin@sisforun.id", role: "Super Admin" },
  { id: 2, name: "Operator 1", email: "operator1@sisforun.id", role: "Operator" },
];

const Pengaturan = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Pengaturan Akun</h1>
        <p className="page-description">
          Kelola konfigurasi akun admin
        </p>
      </div>

      {/* Change Password */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-semibold text-foreground mb-4">Ubah Password</h3>
        <div className="grid gap-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="current-password">Password Saat Ini</Label>
            <Input id="current-password" type="password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Password Baru</Label>
            <Input id="new-password" type="password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Konfirmasi Password</Label>
            <Input id="confirm-password" type="password" />
          </div>
          <Button className="w-fit">
            <Save className="mr-2 h-4 w-4" />
            Simpan Password
          </Button>
        </div>
      </div>

      {/* Admin List */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Daftar Admin</h3>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Admin
          </Button>
        </div>
        <div className="space-y-3">
          {admins.map((admin) => (
            <div
              key={admin.id}
              className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium">
                  {admin.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{admin.name}</p>
                  <p className="text-sm text-muted-foreground">{admin.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{admin.role}</span>
                {admin.role !== "Super Admin" && (
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pengaturan;
