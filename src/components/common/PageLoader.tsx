import { Loader2 } from "lucide-react";

type PageLoaderProps = {
  label?: string;
};

export function PageLoader({ label = "Cargando…" }: PageLoaderProps) {
  return (
    <div className="flex min-h-[240px] items-center justify-center text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      {label}
    </div>
  );
}
