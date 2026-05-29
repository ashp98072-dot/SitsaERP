export type DispatchPdfClient = {
  company: string;
  nit?: string | null;
  address?: string | null;
  contact_name?: string | null;
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
  folio: number;
  date: string;
  client: DispatchPdfClient;
  driver?: string | null;
  vehicle?: string | null;
  notes?: string | null;
  items: DispatchPdfLine[];
  issuedBy?: string | null;
};
