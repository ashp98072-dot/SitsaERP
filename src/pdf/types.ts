import type { DispatchStatus } from "@/types/dispatch";

export type DispatchPdfClient = {
  company: string;
  nit?: string | null;
  address?: string | null;
  contact_name?: string | null;
  phone?: string | null;
};

export type DispatchPdfLine = {
  code: string;
  name: string;
  quantity: number;
  weight: number;
  unit: string;
  notes?: string | null;
};

export type DispatchPdfData = {
  dispatchId: string;
  correlative: string;
  folio: number;
  date: string;
  generatedAt: string;
  status: DispatchStatus;
  statusLabel: string;
  client: DispatchPdfClient;
  driver?: string | null;
  vehicle?: string | null;
  destination?: string | null;
  notes?: string | null;
  logisticsNotes?: string | null;
  warehouseName?: string | null;
  items: DispatchPdfLine[];
  issuedBy?: string | null;
  qrPayload: string;
};
