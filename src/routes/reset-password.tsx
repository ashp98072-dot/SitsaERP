import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLoginHero } from "@/components/brand/Logos";
import { pageTitle } from "@/lib/brand";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: pageTitle("Restablecer contraseña") }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    setReady(hash.includes("type=recovery") || hash.includes("access_token"));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Contraseña actualizada");
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <form onSubmit={submit} className="industrial-card p-8 w-full max-w-sm space-y-5">
        <BrandLoginHero className="items-center mx-auto" />
        <h2 className="text-lg font-semibold text-center">Definir nueva contraseña</h2>
        {!ready && <p className="text-sm text-muted-foreground text-center">Abre el enlace desde tu correo para continuar.</p>}
        <div className="space-y-1.5">
          <Label>Nueva contraseña</Label>
          <Input type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy || !ready} className="w-full">Actualizar</Button>
      </form>
    </div>
  );
}
