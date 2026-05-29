import { useEffect, useState } from "react";
import { Download, Eye, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { loadDispatchPdfBlob, loadDispatchPdfPreviewData } from "@/pdf";
import type { Dispatch } from "@/types";
import type { DispatchPdfData } from "@/pdf/types";
import { getErrorMessage } from "@/utils/errors";
import { toast } from "sonner";
import { DispatchPdfPreviewContent } from "./DispatchPdfPreviewContent";

type Props = {
  dispatch: Dispatch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DispatchPdfPreviewDialog({ dispatch, open, onOpenChange }: Props) {
  const [preview, setPreview] = useState<DispatchPdfData | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"screen" | "pdf">("screen");

  useEffect(() => {
    if (!open || !dispatch) {
      setPreview(null);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const data = await loadDispatchPdfPreviewData(dispatch);
        if (cancelled) return;
        setPreview(data);
        const blob = await loadDispatchPdfBlob(dispatch);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, dispatch?.id]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  async function handleDownload() {
    if (!dispatch) return;
    try {
      const blob = await loadDispatchPdfBlob(dispatch);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Despacho-${dispatch.correlative ?? dispatch.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col print:max-w-none print:max-h-none">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Vista previa — {dispatch?.correlative ?? "Despacho"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 print:hidden shrink-0">
          <Button size="sm" variant={tab === "screen" ? "default" : "outline"} onClick={() => setTab("screen")}>
            Diseño
          </Button>
          <Button size="sm" variant={tab === "pdf" ? "default" : "outline"} onClick={() => setTab("pdf")} disabled={!pdfUrl}>
            PDF embebido
          </Button>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5 mr-1" />
            Imprimir
          </Button>
          <Button size="sm" onClick={() => void handleDownload()} disabled={loading}>
            <Download className="h-3.5 w-3.5 mr-1" />
            Descargar
          </Button>
        </div>

        <div className="flex-1 overflow-auto min-h-0 border rounded-lg bg-muted/30 p-4 print:border-0 print:p-0 print:bg-white">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-12">Generando vista previa…</p>
          ) : tab === "pdf" && pdfUrl ? (
            <iframe title="PDF preview" src={pdfUrl} className="w-full h-[min(70vh,720px)] bg-white" />
          ) : preview ? (
            <DispatchPdfPreviewContent data={preview} />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
