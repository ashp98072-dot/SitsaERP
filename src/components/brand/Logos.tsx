import ecoplanet from "@/assets/ecoplanet-mark.png";
import sitsa from "@/assets/sitsa-mark.png";

export function EcoplanetLogo({ className = "h-10 w-auto" }: { className?: string }) {
  return <img src={ecoplanet} alt="ECOPLANET" className={className} width={512} height={512} loading="lazy" />;
}
export function SitsaLogo({ className = "h-10 w-auto" }: { className?: string }) {
  return <img src={sitsa} alt="GRUPO SITSA" className={className} width={512} height={512} loading="lazy" />;
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <EcoplanetLogo className={compact ? "h-7 w-auto" : "h-9 w-auto"} />
      <div className="h-6 w-px bg-sidebar-border/60" />
      <SitsaLogo className={compact ? "h-7 w-auto" : "h-9 w-auto"} />
      {!compact && (
        <div className="ml-2 leading-tight">
          <div className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60">Sistema</div>
          <div className="text-sm font-bold text-sidebar-foreground">Bodega · Despacho</div>
        </div>
      )}
    </div>
  );
}