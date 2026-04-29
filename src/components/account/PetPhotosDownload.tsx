import { useState } from "react";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ImageDown } from "lucide-react";
import { toast } from "sonner";

const sanitize = (s: string) =>
  (s || "sem-nome")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "_") || "sem-nome";

const extFromUrl = (url: string) => {
  const m = url.split("?")[0].match(/\.(jpg|jpeg|png|webp|gif)$/i);
  return m ? m[1].toLowerCase() : "jpg";
};

const PetPhotosDownload = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDownload = async () => {
    setLoading(true);
    setProgress(0);
    try {
      toast.info("Buscando lista de pets...");
      const { data: pets, error } = await supabase
        .from("clients")
        .select("id, name, photo")
        .not("photo", "is", null);
      if (error) throw error;

      const withPhoto = (pets || []).filter((p) => p.photo && p.photo.startsWith("http"));
      if (withPhoto.length === 0) {
        toast.warning("Nenhum pet com foto encontrado");
        return;
      }

      toast.info(`Baixando ${withPhoto.length} fotos...`, { duration: 4000 });
      const zip = new JSZip();
      const usedNames = new Map<string, number>();
      let done = 0;
      let failed = 0;

      for (const p of withPhoto) {
        try {
          const res = await fetch(p.photo!);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          let base = sanitize(p.name);
          const count = usedNames.get(base) || 0;
          usedNames.set(base, count + 1);
          const fileName = count === 0 ? base : `${base}_${count + 1}`;
          zip.file(`${fileName}.${extFromUrl(p.photo!)}`, blob);
        } catch {
          failed++;
        }
        done++;
        setProgress(Math.round((done / withPhoto.length) * 100));
      }

      toast.info("Compactando ZIP...");
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fotos-pets-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(
        `ZIP gerado! ${withPhoto.length - failed} fotos${failed > 0 ? ` (${failed} falharam)` : ""}`,
      );
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ImageDown className="w-4 h-4 text-primary" /> Fotos dos Pets
        </CardTitle>
        <CardDescription className="text-xs">
          Baixe um ZIP com todas as fotos dos pets, cada arquivo nomeado com o nome do pet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={handleDownload} disabled={loading} className="w-full gap-1.5">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageDown className="w-4 h-4" />}
          {loading ? `Baixando... ${progress}%` : "Baixar todas as fotos (ZIP)"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PetPhotosDownload;
