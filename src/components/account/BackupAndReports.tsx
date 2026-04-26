import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText, Loader2, Database, Upload, Trash2, RefreshCw, Calendar, HardDrive } from "lucide-react";
import { generateMonthlyPdf, generateMonthlyXlsx, fetchMonthlyData } from "@/lib/monthlyReports";

interface BackupRow {
  id: string;
  file_path: string;
  file_size_bytes: number;
  source: string;
  triggered_by_name: string;
  total_clients: number;
  total_photos: number;
  total_records: number;
  created_at: string;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const BackupAndReports = () => {
  const { session } = useAuth();
  const now = new Date();
  const [yearMonth, setYearMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingXlsx, setGeneratingXlsx] = useState(false);
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<"merge" | "replace">("merge");

  const loadBackups = useCallback(async () => {
    setLoadingBackups(true);
    const { data, error } = await supabase
      .from("backup_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) toast.error("Erro ao carregar backups");
    else setBackups(data || []);
    setLoadingBackups(false);
  }, []);

  useEffect(() => { loadBackups(); }, [loadBackups]);

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      toast.info("Coletando dados do mês...");
      const data = await fetchMonthlyData(yearMonth);
      await generateMonthlyPdf(data, yearMonth);
      toast.success("PDF gerado!");
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally { setGeneratingPdf(false); }
  };

  const handleGenerateXlsx = async () => {
    setGeneratingXlsx(true);
    try {
      toast.info("Coletando dados do mês...");
      const data = await fetchMonthlyData(yearMonth);
      generateMonthlyXlsx(data, yearMonth);
      toast.success("Excel gerado!");
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally { setGeneratingXlsx(false); }
  };

  const handleCreateBackup = async (includePhotos: boolean) => {
    setCreatingBackup(true);
    try {
      toast.info(
        includePhotos
          ? "Gerando backup completo (com fotos)... pode levar 1-2 minutos."
          : "Gerando backup rápido (só dados)...",
        { duration: 6000 },
      );
      const { data, error } = await supabase.functions.invoke("monthly-backup", {
        body: {
          source: "manual",
          user_id: session?.user?.id,
          user_name: session?.user?.user_metadata?.full_name || session?.user?.email || "Admin",
          include_photos: includePhotos,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Falha");
      const truncMsg = data.photos_truncated ? ` (⚠️ ${data.photos_skipped} fotos não couberam, gere outro backup)` : "";
      toast.success(`Backup criado! ${data.total_records} registros + ${data.total_photos} fotos${truncMsg}`);
      loadBackups();
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally { setCreatingBackup(false); }
  };

  const handleDownload = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage.from("backups").createSignedUrl(filePath, 300);
      if (error || !data) throw error || new Error("Falha");
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = filePath.split("/").pop() || "backup.zip";
      a.click();
    } catch (e: any) {
      toast.error(`Erro ao baixar: ${e.message}`);
    }
  };

  const handleDelete = async (b: BackupRow) => {
    try {
      await supabase.storage.from("backups").remove([b.file_path]);
      await supabase.from("backup_history").delete().eq("id", b.id);
      toast.success("Backup removido");
      loadBackups();
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    }
  };

  const handleRestore = async (b: BackupRow) => {
    setRestoring(b.id);
    try {
      toast.info("Restaurando backup... Pode levar alguns minutos.", { duration: 8000 });
      const { data, error } = await supabase.functions.invoke("restore-backup", {
        body: { file_path: b.file_path, mode: restoreMode },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Falha");
      toast.success(`Restaurado: ${data.restored_rows} registros + ${data.restored_photos} fotos${data.total_errors > 0 ? ` (${data.total_errors} avisos)` : ""}`);
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally { setRestoring(null); }
  };

  const handleRestoreFromUpload = async (file: File) => {
    setRestoring("upload");
    try {
      // First upload to backups bucket as temporary
      const tmpPath = `restore-uploads/${Date.now()}_${file.name}`;
      toast.info("Enviando arquivo...");
      const { error: upErr } = await supabase.storage.from("backups").upload(tmpPath, file, { contentType: "application/zip" });
      if (upErr) throw upErr;

      toast.info("Restaurando dados... Pode levar alguns minutos.", { duration: 8000 });
      const { data, error } = await supabase.functions.invoke("restore-backup", {
        body: { file_path: tmpPath, mode: restoreMode },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Falha");
      toast.success(`Restaurado: ${data.restored_rows} registros + ${data.restored_photos} fotos`);
      // cleanup
      await supabase.storage.from("backups").remove([tmpPath]);
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally { setRestoring(null); }
  };

  return (
    <div className="space-y-4">
      {/* Monthly Reports */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Relatório Mensal
          </CardTitle>
          <CardDescription className="text-xs">
            Baixe todos os dados do mês organizados por categoria (creche, hotel, vacinas, antipulgas, fezes, medicação, táxi, tarefas, aniversariantes).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="ym" className="text-xs">Mês de referência</Label>
            <Input id="ym" type="month" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleGeneratePdf} disabled={generatingPdf} className="gap-1.5">
              {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              PDF
            </Button>
            <Button onClick={handleGenerateXlsx} disabled={generatingXlsx} variant="outline" className="gap-1.5">
              {generatingXlsx ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backup System */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" /> Backup Completo
          </CardTitle>
          <CardDescription className="text-xs">
            ZIP com TUDO: dados de todas as tabelas + todas as fotos (pets, tutores, hotel, mural). Backup automático todo dia 1º às 3h da manhã.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => handleCreateBackup(false)} disabled={creatingBackup} className="gap-1.5">
              {creatingBackup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              Backup Rápido
            </Button>
            <Button onClick={() => handleCreateBackup(true)} disabled={creatingBackup} variant="outline" className="gap-1.5">
              {creatingBackup ? <Loader2 className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
              Completo (c/ fotos)
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground -mt-1">
            <strong>Rápido</strong>: só dados das tabelas (poucos KB, sempre funciona). <strong>Completo</strong>: inclui todas as fotos (pode levar 1-2 min).
          </p>
          <div className="flex justify-end">
            <Button variant="outline" size="icon" onClick={loadBackups} disabled={loadingBackups}>
              <RefreshCw className={`w-4 h-4 ${loadingBackups ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Restore from upload */}
          <div className="border border-dashed border-border rounded-lg p-3 space-y-2 bg-muted/30">
            <Label className="text-xs flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /> Restaurar de arquivo ZIP</Label>
            <div className="flex gap-2 items-center">
              <Select value={restoreMode} onValueChange={(v: any) => setRestoreMode(v)}>
                <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="merge">Mesclar (seguro)</SelectItem>
                  <SelectItem value="replace">Substituir tudo</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="file"
                accept=".zip"
                disabled={restoring !== null}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleRestoreFromUpload(f);
                }}
                className="text-xs h-9"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              <strong>Mesclar</strong>: atualiza por ID, não apaga nada. <strong>Substituir</strong>: apaga tudo antes (cuidado).
            </p>
          </div>

          {/* Backup history */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Histórico ({backups.length})</p>
            {backups.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">Nenhum backup ainda</p>
            ) : (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {backups.map((b) => (
                  <div key={b.id} className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-lg border border-border">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {new Date(b.created_at).toLocaleString("pt-BR")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {b.source === "auto" ? "🤖 Auto" : "👤 Manual"} • {formatSize(b.file_size_bytes)} • {b.total_records} reg • {b.total_photos} fotos
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDownload(b.file_path)} title="Baixar ZIP">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600 hover:text-amber-700" title="Restaurar">
                          {restoring === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Restaurar este backup?</AlertDialogTitle>
                          <AlertDialogDescription asChild>
                            <div className="space-y-2 text-sm">
                              <p>Modo selecionado: <strong>{restoreMode === "merge" ? "Mesclar" : "Substituir tudo"}</strong></p>
                              {restoreMode === "replace" && (
                                <p className="text-destructive font-semibold">⚠️ Isso vai APAGAR todos os dados atuais antes de restaurar!</p>
                              )}
                              <p className="text-muted-foreground text-xs">Essa ação não pode ser desfeita facilmente. Faça outro backup antes se necessário.</p>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRestore(b)}>Sim, restaurar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Apagar">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Apagar backup?</AlertDialogTitle>
                          <AlertDialogDescription>O arquivo será removido permanentemente.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(b)} className="bg-destructive text-destructive-foreground">Apagar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupAndReports;
