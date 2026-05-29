import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UNIT_TYPES } from "@/utils/constants";
import type { Product, UnitType } from "@/types";

type ProductFormValues = {
  code: string;
  name: string;
  category: string;
  description: string;
  unit: UnitType;
  price: number;
  min_stock: number;
  unit_weight: number;
  active: boolean;
};

type ProductFormProps = {
  editing: Product | null;
  onSave: (values: ProductFormValues) => void;
  busy: boolean;
};

function initialValues(editing: Product | null): ProductFormValues {
  return {
    code: editing?.code ?? "",
    name: editing?.name ?? "",
    category: editing?.category ?? "",
    description: editing?.description ?? "",
    unit: editing?.unit ?? "lbs",
    price: editing?.price ?? 0,
    min_stock: editing?.min_stock ?? 0,
    unit_weight: editing?.unit_weight ?? 0,
    active: editing?.active ?? true,
  };
}

export function ProductForm({ editing, onSave, busy }: ProductFormProps) {
  const [values, setValues] = useState(() => initialValues(editing));

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? "Editar producto" : "Nuevo producto"}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Código *</Label>
          <Input value={values.code} onChange={(event) => setValues({ ...values, code: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Unidad</Label>
          <Select value={values.unit} onValueChange={(unit) => setValues({ ...values, unit: unit as UnitType })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNIT_TYPES.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Nombre *</Label>
          <Input value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Categoría</Label>
          <Input
            value={values.category}
            onChange={(event) => setValues({ ...values, category: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Precio</Label>
          <Input
            type="number"
            step="0.01"
            value={values.price}
            onChange={(event) => setValues({ ...values, price: Number(event.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Stock mínimo</Label>
          <Input
            type="number"
            step="0.01"
            value={values.min_stock}
            onChange={(event) => setValues({ ...values, min_stock: Number(event.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Peso por unidad</Label>
          <Input
            type="number"
            step="0.01"
            value={values.unit_weight}
            onChange={(event) => setValues({ ...values, unit_weight: Number(event.target.value) })}
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Descripción</Label>
          <Input
            value={values.description}
            onChange={(event) => setValues({ ...values, description: event.target.value })}
          />
        </div>
      </div>
      <DialogFooter>
        <Button disabled={busy || !values.code || !values.name} onClick={() => onSave(values)}>
          Guardar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
