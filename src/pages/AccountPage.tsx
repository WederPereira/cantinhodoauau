import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LogOut, User, Mail, Shield, Loader2, Save, KeyRound, Users, History, ClipboardList, Download, RefreshCw, Database } from "lucide-react";
import EmployeeManager from "@/components/account/EmployeeManager";
import ActionHistory from "@/components/account/ActionHistory";
import WorkTaskManager from "@/components/account/WorkTaskManager";
import BackupAndReports from "@/components/account/BackupAndReports";
import ThemeColorPicker from "@/components/account/ThemeColorPicker";
import NotificationSettings from "@/components/account/NotificationSettings";

const AccountPage = () => {
  const { session, signOut } = useAuth();
  const { isAdmin, role, loading: roleLoading } = useUserRole();
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [refreshingApp, setRefreshingApp] = useState(false);

  const ROLE_LABELS: Record<string, string> = {
    admin: "Administrador",
    monitor: "Monitor",
    noturnista: "Noturnista",
  };

  useEffect(() => {
    if (session?.user) {
      setFullName(session.user.user_metadata?.full_name || "");
    }
  }, [session]);

  const handleUpdateName = async () => {
    setSavingName(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    if (error) toast.error("Erro ao atualizar nome");
    else toast.success("Nome atualizado!");
    setSavingName(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error("A senha deve ter no mínimo 6 caracteres"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error("Erro ao alterar senha");
    else { toast.success("Senha alterada com sucesso!"); setNewPassword(""); }
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Você saiu da conta");
  };

  const handleRefreshApp = async () => {
    if (refreshingApp) return;

    setRefreshingApp(true);
    toast.loading("Abrindo a versão mais recente...", { id: "update" });

    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }

      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      }
    } catch {
      // ignore and continue with forced reload
    }

    const url = new URL(window.location.href);
    url.searchParams.set("refresh", Date.now().toString());
    toast.success("Recarregando agora...", { id: "update" });

    window.setTimeout(() => {
      window.location.replace(url.toString());
    }, 150);

    window.setTimeout(() => {
      setRefreshingApp(false);
    }, 4000);
  };

  return (
    <div className="container max-w-lg mx-auto px-4 py-6 space-y-4 animate-fade-in-up">
      <h1 className="text-xl font-bold text-foreground">Minha Conta</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">
                {session?.user?.user_metadata?.full_name || "Usuário"}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                <Mail className="w-3 h-3" /> {session?.user?.email}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="w-3 h-3" /> {role ? (ROLE_LABELS[role] || role) : "—"}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
            <div className="flex gap-2">
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
              <Button size="icon" onClick={handleUpdateName} disabled={savingName}>
                {savingName ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" /> Alterar Senha
          </CardTitle>
          <CardDescription className="text-xs">Mínimo de 6 caracteres</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nova senha" minLength={6} />
          <Button onClick={handleChangePassword} disabled={loading} className="w-full">
            {loading ? <Loader2 className="animate-spin" /> : "Salvar Nova Senha"}
          </Button>
        </CardContent>
      </Card>

      <ThemeColorPicker />

      <NotificationSettings />

      <Separator />
      <Tabs defaultValue={isAdmin ? "employees" : "tasks"} className="w-full">
        <TabsList className={`w-full grid ${isAdmin ? "grid-cols-4" : "grid-cols-1"}`}>
          {isAdmin && (
            <TabsTrigger value="employees" className="gap-1 text-xs">
              <Users className="w-3.5 h-3.5" /> Equipe
            </TabsTrigger>
          )}
          <TabsTrigger value="tasks" className="gap-1 text-xs">
            <ClipboardList className="w-3.5 h-3.5" /> Tarefas
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="history" className="gap-1 text-xs">
              <History className="w-3.5 h-3.5" /> Histórico
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="backup" className="gap-1 text-xs">
              <Database className="w-3.5 h-3.5" /> Backup
            </TabsTrigger>
          )}
        </TabsList>
        {isAdmin && (
          <TabsContent value="employees" className="mt-3">
            <EmployeeManager />
          </TabsContent>
        )}
        <TabsContent value="tasks" className="mt-3">
          <WorkTaskManager />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="history" className="mt-3">
            <ActionHistory />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="backup" className="mt-3">
            <BackupAndReports />
          </TabsContent>
        )}
      </Tabs>

      <Separator />
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            const deferredPrompt = (window as any).__pwaInstallPrompt;
            if (deferredPrompt) {
              deferredPrompt.prompt();
            } else if (window.matchMedia("(display-mode: standalone)").matches) {
              toast.info("O app já está instalado!");
            } else {
              toast.info("Abra no navegador e use 'Adicionar à tela inicial'");
            }
          }}
        >
          <Download className="mr-2 w-4 h-4" /> Baixar App
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleRefreshApp}
          disabled={refreshingApp}
        >
          {refreshingApp ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <RefreshCw className="mr-2 w-4 h-4" />}
          Atualizar App
        </Button>
      </div>

      <Button variant="destructive" onClick={handleLogout} className="w-full">
        <LogOut className="mr-2 w-4 h-4" /> Sair da Conta
      </Button>
    </div>
  );
};

export default AccountPage;
