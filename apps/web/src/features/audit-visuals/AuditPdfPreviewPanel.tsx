import { ExternalLink, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  FreeAuditReportPreview,
  type FreeAuditReportPreviewData,
} from "@/features/audit-visuals/FreeAuditReportPreview";

type AuditPdfPreviewPanelProps = {
  pdfUrl: string;
  title: string;
  filename: string;
  report: FreeAuditReportPreviewData;
  onDownload: () => void;
};

export function AuditPdfPreviewPanel({
  pdfUrl,
  title,
  filename,
  report,
  onDownload,
}: AuditPdfPreviewPanelProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="space-y-4 overflow-x-hidden">
        <div className="rounded-2xl border bg-muted/40 p-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Mobile browsers cannot embed PDFs reliably. Open the file in your device viewer, or read the
            mobile-friendly report layout below.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" className="w-full sm:w-auto" asChild>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open PDF
              </a>
            </Button>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onDownload}>
              <FileDown className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{filename}</p>
        </div>
        <FreeAuditReportPreview report={report} variant="mobile" />
      </div>
    );
  }

  return (
    <object
      title={title}
      data={pdfUrl}
      type="application/pdf"
      className="h-[min(64vh,720px)] w-full max-w-full rounded-2xl border bg-muted"
    >
      <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
        <p>PDF preview could not be embedded in this browser.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" size="sm" asChild>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              Open PDF
            </a>
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onDownload}>
            Download PDF
          </Button>
        </div>
      </div>
    </object>
  );
}
