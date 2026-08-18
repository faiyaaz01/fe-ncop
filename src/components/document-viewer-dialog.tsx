import { useState, useEffect } from "react";
import {
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  Loader2,
  Maximize2,
  Minimize2,
  RotateCw,
  ZoomIn,
  ZoomOut,
  FileSpreadsheet,
  FileQuestion,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ClientDocument } from "@/lib/client-types";
import { DOCUMENT_TYPE_LABELS } from "@/lib/client-types";
import { getDocumentViewUrl, getDocumentDownloadUrl } from "@/lib/client-api";
import { userSessionService } from "@/lib/user-session";

interface DocumentViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  document: ClientDocument | null;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return "—";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function DocumentViewerDialog({
  open,
  onOpenChange,
  clientId,
  document,
}: DocumentViewerDialogProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const docId = document?.id || "";
  const viewUrl = document ? getDocumentViewUrl(clientId, docId) : "";
  const downloadUrl = document ? getDocumentDownloadUrl(clientId, docId) : "";

  const rawFilename =
    document?.originalFileName || document?.fileName || "Document";
  const ext = rawFilename.includes(".")
    ? rawFilename.substring(rawFilename.lastIndexOf(".")).toLowerCase()
    : "";

  const isPdf =
    document?.contentType?.includes("pdf") || ext === ".pdf";
  const isImage =
    document?.contentType?.includes("image") ||
    [".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"].includes(ext);
  const isDoc =
    document?.contentType?.includes("word") ||
    [".doc", ".docx"].includes(ext);
  const isSheet =
    document?.contentType?.includes("sheet") ||
    document?.contentType?.includes("excel") ||
    [".xls", ".xlsx", ".csv"].includes(ext);

  const docTypeLabel = document
    ? DOCUMENT_TYPE_LABELS[document.documentType] || document.documentType
    : "";

  // Fetch document bytes into a local Blob URL with Auth headers
  useEffect(() => {
    if (!open || !document) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    const session = userSessionService.getCurrentUser();
    const headers: HeadersInit = {};
    if (session?.token) {
      headers["Authorization"] = `Bearer ${session.token}`;
    }

    fetch(viewUrl, { headers })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(
            body || `Failed to load document (Status ${res.status}: ${res.statusText})`
          );
        }
        return res.blob();
      })
      .then((blob) => {
        if (!isMounted) return;
        const objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        if (!isMounted) return;
        console.error("Error loading document:", err);
        setErrorMessage(
          err.message ||
            "Unable to connect to the document server. Please ensure the backend is running."
        );
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [open, clientId, docId, reloadKey]);

  if (!document) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 250));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "glass flex flex-col p-0 overflow-hidden shadow-2xl transition-all duration-200",
          isFullscreen
            ? "!fixed !inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-none !max-h-none !rounded-none !border-0 !m-0 !p-0 z-50"
            : "max-sm:fixed max-sm:inset-0 max-sm:w-full max-sm:h-full max-sm:max-w-none max-sm:rounded-none max-sm:border-0 sm:w-[94vw] sm:max-w-5xl lg:max-w-6xl sm:h-[88vh] sm:rounded-2xl"
        )}
      >
        {/* ── Dialog Header ── */}
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border/60 px-5 py-3.5 space-y-0 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
              {isPdf ? (
                <FileText className="size-5" />
              ) : isImage ? (
                <ImageIcon className="size-5" />
              ) : isSheet ? (
                <FileSpreadsheet className="size-5" />
              ) : (
                <FileQuestion className="size-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-semibold truncate leading-tight">
                  {rawFilename}
                </DialogTitle>
                <Badge variant="outline" className="text-[11px] font-medium shrink-0">
                  {docTypeLabel}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {document.fileSize ? formatBytes(document.fileSize) : ""}{" "}
                {document.storageType ? `• Stored via ${document.storageType}` : ""}{" "}
                {document.uploadedAt
                  ? `• Uploaded ${new Date(document.uploadedAt).toLocaleDateString()}`
                  : ""}
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-1.5 shrink-0 pr-8">
            {isImage && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                >
                  <ZoomOut className="size-4" />
                </Button>
                <span className="text-xs font-mono text-muted-foreground w-10 text-center">
                  {zoom}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={handleZoomIn}
                  title="Zoom In"
                >
                  <ZoomIn className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={handleRotate}
                  title="Rotate 90°"
                >
                  <RotateCw className="size-4" />
                </Button>
                <div className="h-4 w-px bg-border mx-1" />
              </>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="size-4" />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </Button>

            {blobUrl && (
              <a
                href={blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in new tab"
              >
                <Button variant="ghost" size="icon" className="size-8">
                  <ExternalLink className="size-4" />
                </Button>
              </a>
            )}

            <a href={downloadUrl} download={rawFilename} title="Download file">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Download className="size-3.5" />
                Download
              </Button>
            </a>
          </div>
        </DialogHeader>

        {/* ── Document Content Area ── */}
        <div className="relative flex-1 bg-muted/30 overflow-auto flex items-center justify-center p-4">
          {/* Loading Indicator */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
              <Loader2 className="size-8 animate-spin text-primary mb-2" />
              <p className="text-sm font-medium text-muted-foreground">
                Loading document preview…
              </p>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="max-w-md w-full p-8 text-center bg-background rounded-2xl border shadow-sm space-y-4 z-10">
              <div className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive mx-auto">
                <AlertCircle className="size-7" />
              </div>
              <div>
                <h3 className="text-base font-semibold">Unable to load document preview</h3>
                <p className="text-xs text-muted-foreground mt-1.5">{errorMessage}</p>
              </div>
              <div className="flex justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setReloadKey((k) => k + 1)}
                >
                  <RefreshCw className="size-3.5" /> Retry
                </Button>
                <a href={downloadUrl} download={rawFilename}>
                  <Button size="sm" className="gap-1.5">
                    <Download className="size-3.5" /> Download File
                  </Button>
                </a>
              </div>
            </div>
          )}

          {/* PDF Viewer via Blob Object URL */}
          {isPdf && !errorMessage && blobUrl && (
            <div className="relative w-full h-full bg-background rounded-lg border shadow-sm overflow-hidden flex flex-col">
              <object
                data={blobUrl}
                type="application/pdf"
                className="w-full h-full"
              >
                <iframe
                  src={`${blobUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                  className="w-full h-full border-0"
                  title={rawFilename}
                />
              </object>
            </div>
          )}

          {/* Image Viewer via Blob Object URL */}
          {isImage && !errorMessage && blobUrl && (
            <div className="w-full h-full flex items-center justify-center overflow-auto">
              <div
                className="transition-transform duration-150 ease-out origin-center"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                }}
              >
                <img
                  src={blobUrl}
                  alt={rawFilename}
                  className="max-h-[70vh] max-w-full rounded-lg shadow-md object-contain border bg-background"
                />
              </div>
            </div>
          )}

          {/* Word / Office Doc Card */}
          {isDoc && !errorMessage && (
            <div className="max-w-md w-full p-8 text-center bg-background rounded-2xl border shadow-sm space-y-4">
              <div className="grid size-16 place-items-center rounded-2xl bg-blue-500/10 text-blue-600 mx-auto">
                <FileText className="size-8" />
              </div>
              <div>
                <h3 className="text-base font-semibold">{rawFilename}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Microsoft Word Document • {formatBytes(document.fileSize)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Word documents can be downloaded to view in Microsoft Word, or opened via Office viewer.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <a href={downloadUrl} download={rawFilename}>
                  <Button className="gap-2">
                    <Download className="size-4" /> Download to View
                  </Button>
                </a>
              </div>
            </div>
          )}

          {/* Spreadsheet Card */}
          {isSheet && !errorMessage && (
            <div className="max-w-md w-full p-8 text-center bg-background rounded-2xl border shadow-sm space-y-4">
              <div className="grid size-16 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 mx-auto">
                <FileSpreadsheet className="size-8" />
              </div>
              <div>
                <h3 className="text-base font-semibold">{rawFilename}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Spreadsheet / Table • {formatBytes(document.fileSize)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Spreadsheet data can be downloaded and opened in Microsoft Excel or Google Sheets.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <a href={downloadUrl} download={rawFilename}>
                  <Button className="gap-2">
                    <Download className="size-4" /> Download Spreadsheet
                  </Button>
                </a>
              </div>
            </div>
          )}

          {/* Generic File Fallback */}
          {!isPdf && !isImage && !isDoc && !isSheet && !errorMessage && (
            <div className="max-w-md w-full p-8 text-center bg-background rounded-2xl border shadow-sm space-y-4">
              <div className="grid size-16 place-items-center rounded-2xl bg-muted text-muted-foreground mx-auto">
                <FileQuestion className="size-8" />
              </div>
              <div>
                <h3 className="text-base font-semibold">{rawFilename}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {docTypeLabel} • {formatBytes(document.fileSize)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Preview is not supported for this file format in browser. Please download the file to inspect its content.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <a href={downloadUrl} download={rawFilename}>
                  <Button className="gap-2">
                    <Download className="size-4" /> Download File
                  </Button>
                </a>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
