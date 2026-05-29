import { BRAND } from "@/lib/brand";
import { SitsaLogo, EcoplanetLogo } from "@/components/brand/Logos";
import type { DispatchPdfData } from "@/pdf/types";

export function DispatchPdfPreviewContent({ data }: { data: DispatchPdfData }) {
  const totalQty = data.items.reduce((s, i) => s + Number(i.quantity), 0);
  const totalWeight = data.items.reduce((s, i) => s + Number(i.weight), 0);

  return (
    <article className="dispatch-preview-doc mx-auto max-w-[820px] bg-white text-foreground shadow-sm border print:shadow-none print:border-0">
      <header className="bg-[#1a2e24] text-white px-6 py-5 flex items-start justify-between gap-4">
        <SitsaLogo variant="light" className="h-14 w-auto" />
        <div className="text-center flex-1">
          <h1 className="text-lg font-bold tracking-wide">COMPROBANTE DE DESPACHO</h1>
          <p className="text-xs opacity-80 mt-1">{BRAND.systemName}</p>
        </div>
        <EcoplanetLogo className="h-10 w-auto opacity-90" />
      </header>

      <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3 border-b text-sm">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Correlativo</div>
          <div className="font-mono font-bold text-lg text-primary">{data.correlative}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Fecha</div>
          <div className="font-medium">{data.date}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Estado</div>
          <div className="font-semibold">{data.statusLabel}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Responsable</div>
          <div>{data.issuedBy ?? "—"}</div>
        </div>
      </div>

      <section className="px-6 py-4 border-b">
        <h2 className="text-xs font-bold uppercase text-primary mb-2">Cliente</h2>
        <p className="font-semibold">{data.client.company}</p>
        <div className="grid md:grid-cols-2 gap-1 text-sm text-muted-foreground mt-1">
          {data.client.nit && <span>NIT: {data.client.nit}</span>}
          {data.client.phone && <span>Tel: {data.client.phone}</span>}
          {data.client.contact_name && <span>Contacto: {data.client.contact_name}</span>}
          {data.client.address && <span>{data.client.address}</span>}
          {data.warehouseName && <span>Bodega: {data.warehouseName}</span>}
        </div>
      </section>

      {(data.driver || data.vehicle || data.destination) && (
        <section className="px-6 py-4 border-b text-sm">
          <h2 className="text-xs font-bold uppercase text-primary mb-2">Logística</h2>
          {data.driver && <p>Piloto: {data.driver}</p>}
          {data.vehicle && <p>Vehículo: {data.vehicle}</p>}
          {data.destination && <p>Destino: {data.destination}</p>}
          {data.logisticsNotes && <p className="text-muted-foreground mt-1">{data.logisticsNotes}</p>}
        </section>
      )}

      <section className="px-6 py-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#1a2e24] text-white text-left text-xs">
              <th className="p-2">Código</th>
              <th className="p-2">Producto</th>
              <th className="p-2 text-right">Cant.</th>
              <th className="p-2 text-right">Peso</th>
              <th className="p-2">Unidad</th>
              <th className="p-2">Obs.</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i} className={i % 2 === 1 ? "bg-muted/40" : ""}>
                <td className="p-2 font-mono text-xs">{item.code}</td>
                <td className="p-2">{item.name}</td>
                <td className="p-2 text-right tabular-nums">{Number(item.quantity).toFixed(2)}</td>
                <td className="p-2 text-right tabular-nums">{Number(item.weight).toFixed(2)}</td>
                <td className="p-2">{item.unit}</td>
                <td className="p-2 text-xs text-muted-foreground">{item.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex justify-between text-sm font-semibold bg-muted/50 px-3 py-2 rounded">
          <span>Total cantidad: {totalQty.toFixed(2)}</span>
          <span>Total peso: {totalWeight.toFixed(2)}</span>
        </div>
      </section>

      <footer className="px-6 py-6 border-t grid grid-cols-4 gap-4 text-center text-xs text-muted-foreground">
        {["Entrega", "Supervisor", "Recibe", "Sello"].map((label) => (
          <div key={label}>
            <div className="border-t border-foreground/40 pt-8 mt-2" />
            <div className="font-semibold text-foreground">{label}</div>
          </div>
        ))}
      </footer>
    </article>
  );
}
