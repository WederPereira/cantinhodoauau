import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { LogIn, Loader2 } from "lucide-react";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error("Erro ao entrar: " + error.message);
    } else {
      toast.success("Login realizado com sucesso!");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/15 via-background to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-xl scale-110" />
            <img src="/app-icon.png" alt="Cantinho do AuAu" className="relative mx-auto w-24 h-24 rounded-3xl shadow-xl ring-4 ring-primary/10" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight" style={{ fontFamily: 'Nunito, sans-serif' }}>
              Cantinho do AuAu
            </h1>
            <p className="text-sm text-muted-foreground font-medium mt-1">Gestão de Creche & Hotel Pet 🐾</p>
          </div>
        </div>

        <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: 'Nunito, sans-serif' }}>Bem-vindo de volta</h2>
              <p className="text-sm text-muted-foreground mt-1">Entre com suas credenciais</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[13px] font-semibold">E-mail</Label>
                <Input
                  id="email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com" required
                  className="h-11 rounded-xl bg-muted/50 border-border/60 focus:bg-card"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[13px] font-semibold">Senha</Label>
                <Input
                  id="password" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" minLength={6} required
                  className="h-11 rounded-xl bg-muted/50 border-border/60 focus:bg-card"
                />
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl font-bold text-[14px] shadow-md" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <><LogIn className="mr-2" size={16} /> Entrar</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
