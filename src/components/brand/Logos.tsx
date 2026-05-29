import { BRAND_ASSETS } from "@/assets/branding";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  variant?: "light" | "dark";
};

/** Logo principal — GRUPO SITSA */
export function SitsaLogo({ className = "h-10 w-auto", variant = "light" }: LogoProps) {
  const src = variant === "dark" ? BRAND_ASSETS.sitsa.dark : BRAND_ASSETS.sitsa.light;
  return (
    <img
      src={src}
      alt={BRAND.company}
      className={cn("object-contain object-left", className)}
      decoding="async"
      loading="lazy"
    />
  );
}

/** Logo secundario — división ECOPLANET */
export function EcoplanetLogo({ className = "h-6 w-auto opacity-90" }: LogoProps) {
  return (
    <img
      src={BRAND_ASSETS.ecoplanet.secondary}
      alt={BRAND.division}
      className={cn("object-contain", className)}
      decoding="async"
      loading="lazy"
    />
  );
}

/** Lockup sidebar / header: SITSA grande + ECOPLANET pequeño */
export function BrandLockup({
  compact = false,
  showSubtitle = true,
  variant = "light",
}: {
  compact?: boolean;
  showSubtitle?: boolean;
  variant?: "light" | "dark";
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <SitsaLogo
          variant={variant}
          className={compact ? "h-8 w-auto max-w-[140px]" : "h-10 w-auto max-w-[180px]"}
        />
        {!compact && (
          <>
            <div className="h-8 w-px shrink-0 bg-sidebar-border/50" />
            <EcoplanetLogo className="h-6 w-auto max-w-[72px]" />
          </>
        )}
      </div>
      {showSubtitle && !compact && (
        <p className="text-[9px] uppercase tracking-[0.22em] text-sidebar-foreground/55 pl-0.5 truncate">
          {BRAND.tagline}
        </p>
      )}
    </div>
  );
}

/** Hero login: marca principal + división debajo */
export function BrandLoginHero({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-start gap-4", className)}>
      <SitsaLogo variant="light" className="h-14 md:h-16 w-auto max-w-[280px]" />
      <div className="flex items-center gap-3">
        <div className="h-px w-8 bg-sidebar-foreground/25" />
        <EcoplanetLogo className="h-7 w-auto max-w-[88px]" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/45">
          {BRAND.division}
        </span>
      </div>
    </div>
  );
}
