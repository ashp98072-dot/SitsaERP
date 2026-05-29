import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GRUPO SITSA ERP — Sistema de Bodega" },
      { name: "description", content: "Plataforma industrial de control de bodega, inventario y despacho de mercadería." },
    ],
  }),
  component: Index,
});

function Index() {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Cargando…</div>;
  return <Navigate to={session ? "/dashboard" : "/login"} replace />;
}
