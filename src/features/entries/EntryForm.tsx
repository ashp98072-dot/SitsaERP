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
import type { ProductMinimal, SupplierMinimal, UnitType, WarehouseEntryInsert } from "@/types";

type EntryFormProps = {
  products: ProductMinimal[];
  suppliers: SupplierMinimal[];
  onSave: (payload: WarehouseEntryInsert) => void;
  busy: boolean;
};

export function EntryForm({ products, suppliers, onSave, busy }: EntryFormProps) {
  const [values, setValues] = useState({
    product_id: "",
    supplier_id: "",
    quantity: 0,
    weight: 0,
    unit: "lbs" as UnitType,
    entry_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nuevo ingreso a bodega</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label>Producto *</Label>
          <Select
            value={values.product_id}
            onValueChange={(productId) => {
              const product = products.find((row) => row.id === productId);
              setValues({ ...values, product_id: productId, unit: product?.unit ?? values.unit });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar…" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.code} · {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Proveedor</Label>
          <Select
            value={values.supplier_id}
            onValueChange={(supplierId) => setValues({ ...values, supplier_id: supplierId })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Opcional" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Fecha</Label>
          <Input
            type="date"
            value={values.entry_date}
            onChange={(event) => setValues({ ...values, entry_date: event.target.value })}
          />
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
        <div className="space-y-1.5">
          <Label>Cantidad *</Label>
          <Input
            type="number"
            step="0.01"
            value={values.quantity}
            onChange={(event) => setValues({ ...values, quantity: Number(event.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Peso *</Label>
          <Input
            type="number"
            step="0.01"
            value={values.weight}
            onChange={(event) => setValues({ ...values, weight: Number(event.target.value) })}
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Notas</Label>
          <Input value={values.notes} onChange={(event) => setValues({ ...values, notes: event.target.value })} />
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={busy || !values.product_id || values.quantity <= 0}
          onClick={() =>
            onSave({
              ...values,
              supplier_id: values.supplier_id || null,
              notes: values.notes || null,
            })
          }
        >
          Guardar ingreso
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
