import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

export function SearchField({ value, onChange, placeholder }: SearchFieldProps) {
  return (
    <div className="relative max-w-sm mb-3">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        className="pl-9"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
