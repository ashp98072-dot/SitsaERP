import { ClipboardList, Package, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BRAND } from "@/lib/brand";
import { InventoryAdjustmentsPanel } from "./InventoryAdjustmentsPanel";
import { InventoryKardexPanel } from "./InventoryKardexPanel";
import { InventoryKpiCards } from "./InventoryKpiCards";
import { InventoryStockTable } from "./InventoryStockTable";

export function InventoryPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventario"
        description={`Control de stock, kardex y ajustes · ${BRAND.company} · fuente única de verdad logística`}
      />

      <InventoryKpiCards />

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="stock" className="gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Stock
          </TabsTrigger>
          <TabsTrigger value="kardex" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            Kardex
          </TabsTrigger>
          <TabsTrigger value="adjustments" className="gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Ajustes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <InventoryStockTable />
        </TabsContent>

        <TabsContent value="kardex">
          <InventoryKardexPanel />
        </TabsContent>

        <TabsContent value="adjustments">
          <InventoryAdjustmentsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
