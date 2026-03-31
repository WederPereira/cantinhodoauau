import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Loader2, Users, Shield, Eye, EyeOff, Trash2, Pencil } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Employee {
  id: string;
  full_name: string;
  cargo: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  monitor: "Monitor",
  noturnista: "Noturnista",
};

const EmployeeManager = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("monitor");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  const fetchEmployees = async () => {
    const { data } = await supabase.from("profiles").select("id, full_name, cargo");
    if (data) setEmployees(data);
  };

  const handleDelete = async (empId: string, empName: string) => {
    setDeleting(empId);
    const { data, error } = await supabase.functions.invoke("delete-employee", {
      body: { user_id: empId },
    });
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Erro ao excluir funcionário");
    } else {
      toast.success(`${empName || "Funcionário"} removido com sucesso`);
      fetchEmployees();
    }
    setDeleting(null);
  };

  const handleUpdateRole = async (empId: string, newRole: string) => {
    setUpdatingRole(empId);
    const { data, error } = await supabase.functions.invoke("update-employee-role", {
      body: { user_id: empId, new_role: newRole },
    });
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Erro ao atualizar cargo");
    } else {
      toast.success("Cargo atualizado!");
      setEditingRole(null);
      fetchEmployees();
    }
    setUpdatingRole(null);
  };

  useEffect(() => { fetchEmployees(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast.error("Preencha todos os campos");
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("create-employee", {
      body: { email, password, full_name: fullName, role },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Erro ao criar funcionário");
    } else {
      toast.success("Funcionário criado com sucesso!");
      setEmail(""); setPassword(""); setFullName("");
      fetchEmployees();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" /> Criar Funcionário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1">
              <Label>Nome Completo</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nome do funcionário" required />
            </div>
            <div className="space-y-1">
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" required />
            </div>
            <div className="space-y-1">
              <Label>Senha</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Cargo</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monitor">Monitor</SelectItem>
                  <SelectItem value="noturnista">Noturnista</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <><UserPlus className="mr-2 w-4 h-4" /> Criar Conta</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {employees.map(emp => (
              <div key={emp.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">{emp.full_name || "Sem nome"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {editingRole === emp.id ? (
                    <Select
                      defaultValue={emp.cargo}
                      onValueChange={(v) => handleUpdateRole(emp.id, v)}
                      disabled={updatingRole === emp.id}
                    >
                      <SelectTrigger className="h-7 w-28 text-xs">
                        {updatingRole === emp.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <SelectValue />}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monitor" className="text-xs">Monitor</SelectItem>
                        <SelectItem value="noturnista" className="text-xs">Noturnista</SelectItem>
                        <SelectItem value="admin" className="text-xs">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-xs cursor-pointer hover:bg-primary/10 transition-colors gap-1"
                      onClick={() => setEditingRole(emp.id)}
                    >
                      {ROLE_LABELS[emp.cargo] || emp.cargo}
                      <Pencil className="w-2.5 h-2.5" />
                    </Badge>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                        {deleting === emp.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir funcionário?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso removerá permanentemente <strong>{emp.full_name || "este funcionário"}</strong> do sistema. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(emp.id, emp.full_name)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
            {employees.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum funcionário cadastrado</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeManager;
