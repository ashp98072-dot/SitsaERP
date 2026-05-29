import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useState, FormEvent } from "react";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { getAuthErrorDetails, isAuthDebugEnabled, logAuthError } from "@/lib/auth-errors";
import {
  AuthSignInError,
  completePostLoginSetup,
  sendPasswordReset,
  signInWithPassword,
  signOut,
} from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLoginHero } from "@/components/brand/Logos";
import { BRAND, PAGE_TITLES } from "@/lib/brand";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { DEFAULT_CORPORATE_EMAIL_DOMAIN } from "@/utils/constants";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: PAGE_TITLES.login }] }),
  component: LoginPage,
});

function LoginPage() {
  const { session, loading, bootstrapping } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [userMessage, setUserMessage] = useState<string | null>(null);
  const [technicalError, setTechnicalError] = useState<string | null>(null);

  if (!loading && !bootstrapping && session) {
    return <Navigate to="/dashboard" replace />;
  }

  function setError(err: unknown, rawProbe?: unknown) {
    const details =
      err instanceof AuthSignInError
        ? err.details
        : getAuthErrorDetails(err, rawProbe ?? (err instanceof AuthSignInError ? err.rawProbe : undefined));
    setUserMessage(details.userMessage);
    setTechnicalError(details.technicalJson);
    logAuthError("login", err, { status: details.status, code: details.code });
    toast.error(details.userMessage);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setUserMessage(null);
    setTechnicalError(null);

    try {
      if (mode === "signin") {
        const { session: newSession } = await signInWithPassword(email, password);
        const { access, roles } = await completePostLoginSetup(newSession);

        if (!access.allowed) {
          await signOut();
          throw new Error(access.reason ?? "Correo no autorizado");
        }

        if (roles.length === 0) {
          toast.warning("Sesión válida pero sin rol. Reintenta o visita /debug/auth.");
        }

        navigate({ to: "/dashboard" });
      } else {
        await sendPasswordReset(email);
        toast.success("Correo de recuperación enviado.");
        setMode("signin");
      }
    } catch (err: unknown) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    setUserMessage(null);
    setTechnicalError(null);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) {
      setError(r.error);
      setBusy(false);
      return;
    }
    if (r.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between p-10 text-sidebar-foreground login-panel-industrial relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_20%_10%,white,transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,oklch(0_0_0/0.25)_100%)]" />
        <div className="absolute -bottom-40 -right-20 h-[28rem] w-[28rem] rounded-full bg-primary/15 blur-3xl" />
        <BrandLoginHero className="relative z-10" />
        <div className="relative z-10 max-w-md">
          <div className="text-[11px] uppercase tracking-[0.28em] text-sidebar-foreground/50 mb-3">
            {BRAND.productName}
          </div>
          <h1 className="text-3xl xl:text-4xl font-bold leading-tight tracking-tight">
            {BRAND.systemNameEn}
          </h1>
          <p className="mt-4 text-sidebar-foreground/65 text-sm leading-relaxed">
            Plataforma corporativa de bodega, inventario y despacho para operaciones logísticas,
            exportación y control industrial de mercadería.
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs text-sidebar-foreground/55">
            <ShieldCheck className="h-4 w-4 text-sidebar-primary" />
            Acceso restringido · correos corporativos autorizados
          </div>
        </div>
        <div className="relative z-10 text-xs text-sidebar-foreground/40">{BRAND.copyrightWithDivision}</div>
      </div>

      <div className="flex items-center justify-center p-6 bg-background">
        <form onSubmit={submit} className="w-full max-w-sm industrial-card p-8 space-y-5">
          <div className="md:hidden mb-2">
            <BrandLoginHero className="items-center" />
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

          {userMessage && (
            <div
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive space-y-2"
              role="alert"
            >
              <p className="font-medium">{userMessage}</p>
              {technicalError && (
                <pre className="text-[10px] leading-snug whitespace-pre-wrap break-all opacity-90 max-h-48 overflow-auto font-mono text-left">
                  {technicalError}
                </pre>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Correo corporativo</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={`usuario@${DEFAULT_CORPORATE_EMAIL_DOMAIN}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}

          <Button type="submit" disabled={busy || bootstrapping} className="w-full">
            {(busy || bootstrapping) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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

          <p className="text-center text-xs text-muted-foreground">
            <Link to="/debug/auth" className="underline hover:text-primary">
              Diagnóstico de autenticación
            </Link>
            {isAuthDebugEnabled() ? " · debug activo" : null}
          </p>

          <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
            {mode === "forgot" ? (
              <button type="button" className="hover:text-primary" onClick={() => setMode("signin")}>
                ← Iniciar sesión
              </button>
            ) : (
              <button type="button" className="hover:text-primary" onClick={() => setMode("forgot")}>
                ¿Olvidaste tu contraseña?
              </button>
            )}
            <span className="text-[11px] text-muted-foreground/70">Acceso solo por invitación</span>
          </div>
        </form>
      </div>
    </div>
  );
}
