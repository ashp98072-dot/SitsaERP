import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DISPATCH_STATUS_LABELS, type DispatchTimelineEntry } from "@/types/dispatch";

export function DispatchHistoryTimeline({ entries }: { entries: DispatchTimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin historial de cambios.</p>;
  }

  return (
    <ol className="relative border-l border-border ml-2 space-y-4">
      {entries.map((entry) => (
        <li key={entry.id} className="ml-4">
          <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
          <div className="text-xs text-muted-foreground">
            {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
          </div>
          <div className="text-sm font-medium">
            {entry.from_status
              ? `${DISPATCH_STATUS_LABELS[entry.from_status]} → ${DISPATCH_STATUS_LABELS[entry.to_status]}`
              : DISPATCH_STATUS_LABELS[entry.to_status]}
          </div>
          <div className="text-xs text-muted-foreground">
            {entry.changed_by_name ?? entry.changed_by_email ?? "Sistema"}
          </div>
          {entry.notes && <p className="text-xs mt-1 text-foreground/80">{entry.notes}</p>}
        </li>
      ))}
    </ol>
  );
}
