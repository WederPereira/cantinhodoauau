import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

const NotificationSettings = () => {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PermissionState);
  }, []);

  const handleEnable = async () => {
    if (permission === "unsupported") {
      toast.error("Seu dispositivo não suporta notificações do navegador.");
      return;
    }
    if (permission === "denied") {
      toast.info("Permissão bloqueada — libere nas configurações do navegador.");
      return;
    }
    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      if (result === "granted") {
        toast.success("Notificações ativadas!");
        try {
          new Notification("🔔 Notificações ativadas", {
            body: "Você receberá avisos importantes do app.",
            icon: "/app-icon.png",
          });
        } catch {
          // ignore
        }
      } else if (result === "denied") {
        toast.error("Permissão negada.");
      }
    } catch {
      toast.error("Não foi possível ativar as notificações.");
    } finally {
      setRequesting(false);
    }
  };

  const status = (() => {
    switch (permission) {
      case "granted":
        return { label: "Ativadas", color: "text-[hsl(142,70%,40%)]", icon: BellRing };
      case "denied":
        return { label: "Bloqueadas no navegador", color: "text-destructive", icon: BellOff };
      case "unsupported":
        return { label: "Não disponível neste dispositivo", color: "text-muted-foreground", icon: BellOff };
      default:
        return { label: "Desativadas", color: "text-muted-foreground", icon: Bell };
    }
  })();

  const Icon = status.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" /> Notificações
        </CardTitle>
        <CardDescription className="text-xs">
          Avisos importantes: tarefas atrasadas, medicação atrasada e check-out do hotel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${status.color}`} />
            <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
          </div>
        </div>
        {permission !== "granted" && (
          <Button
            onClick={handleEnable}
            disabled={requesting || permission === "unsupported"}
            className="w-full"
          >
            <Bell className="mr-2 w-4 h-4" />
            {permission === "denied" ? "Como liberar permissão" : "Ativar notificações"}
          </Button>
        )}
        {permission === "denied" && (
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Para liberar: abra as configurações do site no seu navegador (ícone de cadeado na barra de
            endereço) e permita notificações para este app.
          </p>
        )}
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Os avisos aparecem dentro do app (popup) sempre. Quando o app estiver em segundo plano, com
          notificações ativadas, você também recebe pelo navegador.
        </p>
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;