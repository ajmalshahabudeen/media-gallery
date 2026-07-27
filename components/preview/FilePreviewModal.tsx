"use client";

import { useState } from "react";
import { MediaFile } from "@/store/useMediaStore";
import { formatFileSize } from "@/lib/formatSize";
import { VideoPreview } from "./VideoPreview";
import { PhotoPreview } from "./PhotoPreview";
import { AudioPreview } from "./AudioPreview";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Check,
  ExternalLink,
  FileText,
  Calendar,
  HardDrive,
  Folder,
  Info,
} from "lucide-react";

interface FilePreviewModalProps {
  file: MediaFile | null;
  onClose: () => void;
}

export function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  const [copied, setCopied] = useState(false);

  if (!file) return null;

  const fileUrl = `/api/media/file?path=${encodeURIComponent(file.path)}`;

  const copyPath = () => {
    navigator.clipboard.writeText(file.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderMediaContent = () => {
    switch (file.type) {
      case "video":
        return <VideoPreview src={fileUrl} title={file.name} />;
      case "image":
        return <PhotoPreview src={fileUrl} title={file.name} />;
      case "audio":
        return <AudioPreview src={fileUrl} title={file.name} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center p-12 bg-muted/20 border rounded-lg gap-4 text-center">
            <div className="size-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
              <FileText className="size-8" />
            </div>
            <div>
              <h4 className="font-semibold text-base">{file.name}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Document / Binary File ({file.extension})
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 gap-6">
        <DialogHeader className="flex flex-row items-start justify-between gap-4 border-b pb-4">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="uppercase text-[10px]">
                {file.extension.replace(".", "") || file.type}
              </Badge>
              <DialogTitle className="text-lg font-bold truncate" title={file.name}>
                {file.name}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs truncate font-mono text-muted-foreground" title={file.path}>
              {file.path}
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="xs"
              onClick={copyPath}
              className="gap-1.5 text-xs"
            >
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              <span>{copied ? "Copied" : "Copy Path"}</span>
            </Button>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="xs" className="gap-1.5 text-xs">
                <ExternalLink className="size-3.5" />
                <span>Open File</span>
              </Button>
            </a>
          </div>
        </DialogHeader>

        {/* Media Preview Section */}
        <div className="w-full">{renderMediaContent()}</div>

        {/* Detailed Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-muted/20 border p-4 rounded-lg text-xs">
          <div className="flex items-center gap-2">
            <HardDrive className="size-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col truncate">
              <span className="text-muted-foreground font-medium">File Size</span>
              <span className="font-semibold">{formatFileSize(file.size)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Info className="size-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col truncate">
              <span className="text-muted-foreground font-medium">MIME Type</span>
              <span className="font-semibold truncate">{file.mimeType}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Folder className="size-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col truncate">
              <span className="text-muted-foreground font-medium">Folder</span>
              <span className="font-semibold truncate">{file.folder}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col truncate">
              <span className="text-muted-foreground font-medium">Modified</span>
              <span className="font-semibold">
                {new Date(file.modifiedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
