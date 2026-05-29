import { Badge } from "@/components/ui/badge";

type StatusBadgeProps = {
  active: boolean;
};

export function StatusBadge({ active }: StatusBadgeProps) {
  if (active) {
    return (
      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
        Activo
      </Badge>
    );
  }
  return <Badge variant="outline">Inactivo</Badge>;
}
