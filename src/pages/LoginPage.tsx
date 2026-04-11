import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { LogIn, Loader2, PawPrint } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-primary/15 via-background to-accent/15 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      
      <div className="w-full max-w-sm space-y-6 animate-fade-in relative z-10">
        <div className="text-center space-y-3">
          <div className="relative inline-block">
            <img src="/app-icon.png" alt="Cantinho do AuAu" className="mx-auto w-24 h-24 rounded-3xl shadow-xl ring-4 ring-primary/20" />
            <div className="absolute -bottom-1 -right-1 bg-accent text-accent-foreground rounded-full p-1.5 shadow-lg">
              <PawPrint size={14} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Cantinho do AuAu</h1>
          <p className="text-sm text-muted-foreground">Gestão de Creche & Hotel Pet</p>
        </div>

        <Card className="border-0 shadow-2xl bg-card/90 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-center">Entrar</CardTitle>
            <CardDescription className="text-center">Acesse sua conta para continuar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required className="rounded-xl" />
              </div>
              <Button type="submit" className="w-full rounded-xl h-11 font-semibold shadow-lg shadow-primary/25" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <><LogIn className="mr-2" size={18} /> Entrar</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
