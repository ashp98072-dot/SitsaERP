import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState, FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EcoplanetLogo, SitsaLogo } from "@/components/brand/Logos";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Iniciar sesión · ECOPLANET / GRUPO SITSA" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && session) return <Navigate to="/dashboard" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Correo de recuperación enviado.");
        setMode("signin");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) { toast.error(r.error.message ?? "Error con Google"); setBusy(false); return; }
    if (r.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between p-10 text-sidebar-foreground bg-sidebar relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_30%_20%,white,transparent_60%)]" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <EcoplanetLogo className="h-10 w-auto" />
          <div className="h-8 w-px bg-sidebar-border" />
          <SitsaLogo className="h-10 w-auto" />
        </div>
        <div className="relative">
          <div className="text-[11px] uppercase tracking-[0.25em] text-primary/80 mb-3">Sistema corporativo</div>
          <h1 className="text-4xl font-bold leading-tight">Control de Bodega<br/>y Despacho Industrial</h1>
          <p className="mt-4 text-sidebar-foreground/70 max-w-md">
            Plataforma de gestión de inventario, ingresos y despachos de mercadería con
            comprobantes corporativos imprimibles.
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs text-sidebar-foreground/60">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Acceso restringido a correos corporativos autorizados
          </div>
        </div>
        <div className="relative text-xs text-sidebar-foreground/40">© ECOPLANET · GRUPO SITSA</div>
      </div>

      <div className="flex items-center justify-center p-6 bg-background">
        <form onSubmit={submit} className="w-full max-w-sm industrial-card p-8 space-y-5">
          <div className="md:hidden flex items-center justify-center gap-3 mb-2">
            <EcoplanetLogo className="h-8" /><SitsaLogo className="h-8" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              {mode === "signin" ? "Iniciar sesión" : "Recuperar contraseña"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "signin"
                ? "Accede con tus credenciales corporativas autorizadas."
                : "Te enviaremos un enlace al correo."}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Correo corporativo</Label>
            <Input id="email" type="email" placeholder="usuario@grupo.sitsa.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
          )}

          <Button type="submit" disabled={busy} className="w-full">
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "signin" ? "Entrar" : "Enviar enlace"}
          </Button>

          {mode === "signin" && (
            <>
              <div className="relative text-center text-xs text-muted-foreground">
                <span className="bg-card px-2 relative z-10">o continúa con</span>
                <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
              </div>
              <Button type="button" variant="outline" className="w-full" onClick={google} disabled={busy}>
                Continuar con Google
              </Button>
            </>
          )}

          <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
            {mode === "forgot" ? (
              <button type="button" className="hover:text-primary" onClick={() => setMode("signin")}>← Iniciar sesión</button>
            ) : (
              <button type="button" className="hover:text-primary" onClick={() => setMode("forgot")}>¿Olvidaste tu contraseña?</button>
            )}
            <span className="text-[11px] text-muted-foreground/70">Acceso solo por invitación</span>
          </div>
        </form>
      </div>
    </div>
  );
}
