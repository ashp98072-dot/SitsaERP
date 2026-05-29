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
import type { Client } from "@/types";

type ClientFormValues = {
  company: string;
  nit: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  active: boolean;
};

type ClientFormProps = {
  editing: Client | null;
  onSave: (values: ClientFormValues) => void;
  busy: boolean;
};

function initialValues(editing: Client | null): ClientFormValues {
  return {
    company: editing?.company ?? "",
    nit: editing?.nit ?? "",
    contact_name: editing?.contact_name ?? "",
    email: editing?.email ?? "",
    phone: editing?.phone ?? "",
    address: editing?.address ?? "",
    notes: editing?.notes ?? "",
    active: editing?.active ?? true,
  };
}

export function ClientForm({ editing, onSave, busy }: ClientFormProps) {
  const [values, setValues] = useState(() => initialValues(editing));

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label>Empresa *</Label>
          <Input
            value={values.company}
            onChange={(event) => setValues({ ...values, company: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>NIT</Label>
          <Input value={values.nit} onChange={(event) => setValues({ ...values, nit: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Contacto</Label>
          <Input
            value={values.contact_name}
            onChange={(event) => setValues({ ...values, contact_name: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input
            type="email"
            value={values.email}
            onChange={(event) => setValues({ ...values, email: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Teléfono</Label>
          <Input
            value={values.phone}
            onChange={(event) => setValues({ ...values, phone: event.target.value })}
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Dirección</Label>
          <Input
            value={values.address}
            onChange={(event) => setValues({ ...values, address: event.target.value })}
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Notas</Label>
          <Input
            value={values.notes}
            onChange={(event) => setValues({ ...values, notes: event.target.value })}
          />
        </div>
      </div>
      <DialogFooter>
        <Button disabled={busy || !values.company} onClick={() => onSave(values)}>
          Guardar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
