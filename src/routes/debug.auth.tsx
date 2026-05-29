import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  getAuthDiagnosticsSnapshot,
  probePasswordToken,
  probeSupabaseAuthHealth,
  probeSupabaseAuthSettings,
} from "@/lib/auth-debug";
import { serializeAuthError } from "@/lib/auth-errors";
import { validateSupabaseEnvironment } from "@/lib/supabase-config";
import { getCurrentSession, signInWithPassword } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_CORPORATE_EMAIL_DOMAIN,
  INITIAL_ADMIN_EMAIL,
  INITIAL_ADMIN_USER_ID,
} from "@/utils/constants";

export const Route = createFileRoute("/debug/auth")({
  head: () => ({ meta: [{ title: "Debug Auth · ECOPLANET" }] }),
  component: DebugAuthPage,
});

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="text-xs font-mono bg-muted/50 p-3 rounded-md overflow-auto max-h-80 whitespace-pre-wrap break-all">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function DebugAuthPage() {
  const { session, roles, loading, bootstrapping } = useAuth();
  const [snapshot, setSnapshot] = useState(() => getAuthDiagnosticsSnapshot());
  const [health, setHealth] = useState<unknown>(null);
  const [settings, setSettings] = useState<unknown>(null);
  const [testEmail, setTestEmail] = useState(INITIAL_ADMIN_EMAIL);
  const [testPassword, setTestPassword] = useState("");
  const [probeResult, setProbeResult] = useState<unknown>(null);
  const [signInResult, setSignInResult] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      setSnapshot(getAuthDiagnosticsSnapshot());
      setHealth(await probeSupabaseAuthHealth());
      setSettings(await probeSupabaseAuthSettings());
      const current = await getCurrentSession();
      if (current) {
        setSignInResult({ from: "getSession", session: { id: current.user.id, email: current.user.email } });
      }
    })();
  }, []);

  async function runRawProbe() {
    setBusy(true);
    setProbeResult(null);
    try {
      const result = await probePasswordToken(testEmail, testPassword);
      setProbeResult(result);
    } finally {
      setBusy(false);
    }
  }

  async function runClientSignIn() {
    setBusy(true);
    setSignInResult(null);
    try {
      const { session: s } = await signInWithPassword(testEmail, testPassword);
      setSignInResult({
        ok: true,
        userId: s.user.id,
        email: s.user.email,
        expiresAt: s.expires_at,
      });
    } catch (error) {
      setSignInResult({ ok: false, error: serializeAuthError(error) });
    } finally {
      setBusy(false);
    }
  }

  const envValidation = validateSupabaseEnvironment();

  return (
    <div className="min-h-screen bg-background p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Diagnóstico de autenticación</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Herramienta temporal para producción/staging. No compartas contraseñas.
          </p>
        </div>
        <Link to="/login" className="text-sm underline text-primary">
          ← Volver al login
        </Link>
      </div>

      <Card className="p-4 space-y-2">
        <h2 className="font-semibold">Variables / proyecto</h2>
        <JsonBlock value={snapshot} />
        <p className={envValidation.ok ? "text-sm text-primary" : "text-sm text-destructive"}>
          {envValidation.ok ? "Configuración Supabase válida" : envValidation.issues.join(" · ")}
        </p>
      </Card>

      <Card className="p-4 space-y-2">
        <h2 className="font-semibold">Conexión Auth API</h2>
        <p className="text-xs text-muted-foreground">GET /auth/v1/health</p>
        <JsonBlock value={health} />
        <p className="text-xs text-muted-foreground">GET /auth/v1/settings</p>
        <JsonBlock value={settings} />
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Sesión actual (app)</h2>
        <JsonBlock
          value={{
            loading,
            bootstrapping,
            hasSession: Boolean(session),
            userId: session?.user.id,
            expectedAdminUserId: INITIAL_ADMIN_USER_ID,
            userIdMatchesBootstrap: session?.user.id === INITIAL_ADMIN_USER_ID,
            email: session?.user.email,
            expectedAdminEmail: INITIAL_ADMIN_EMAIL,
            roles,
          }}
        />
      </Card>

      <Card className="p-4 space-y-4">
        <h2 className="font-semibold">Probar credenciales</h2>
        <p className="text-sm text-muted-foreground">
          Prueba con <span className="font-mono">{INITIAL_ADMIN_EMAIL}</span> o{" "}
          <span className="font-mono">usuario@{DEFAULT_CORPORATE_EMAIL_DOMAIN}</span>
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} type="email" />
          </div>
          <div className="space-y-1.5">
            <Label>Contraseña</Label>
            <Input
              value={testPassword}
              onChange={(e) => setTestPassword(e.target.value)}
              type="password"
              autoComplete="off"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => void runRawProbe()}>
            Probe raw POST /token
          </Button>
          <Button type="button" disabled={busy} onClick={() => void runClientSignIn()}>
            signInWithPassword (cliente)
          </Button>
        </div>
        {probeResult ? (
          <>
            <p className="text-xs font-medium">Resultado probe raw (payload real Supabase):</p>
            <JsonBlock value={probeResult} />
          </>
        ) : null}
        {signInResult ? (
          <>
            <p className="text-xs font-medium">Resultado cliente:</p>
            <JsonBlock value={signInResult} />
          </>
        ) : null}
      </Card>

      <Card className="p-4 text-sm text-muted-foreground space-y-2">
        <p className="font-medium text-foreground">Checklist Vercel + Supabase</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY del mismo proyecto</li>
          <li>Site URL = dominio Vercel · Redirect URLs incluyen localhost y producción</li>
          <li>Email provider habilitado · usuario confirmado · no baneado</li>
          <li>400 invalid_grant = contraseña incorrecta o usuario inexistente en ESTE proyecto</li>
        </ul>
      </Card>
    </div>
  );
}
