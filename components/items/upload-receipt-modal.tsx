"use client";

import React, { useState, useRef, useTransition } from "react";
import {
  X,
  UploadCloud,
  FileText,
  Sparkles,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { uploadAndExtractReceipt } from "@/app/items/upload-action";
import { EnrichedExtractionResult } from "@/lib/ai/receipt-extractor";

interface UploadReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtracted: (
    extraction: EnrichedExtractionResult,
    receiptUrl?: string
  ) => void;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export function UploadReceiptModal({
  isOpen,
  onClose,
  onExtracted,
}: UploadReceiptModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    setError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Unsupported format. Please choose a JPG, PNG, WEBP, or PDF receipt.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("File is too large. Maximum allowed size is 10MB.");
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith("image/") && typeof URL.createObjectURL === "function") {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      if (typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUploadAndExtract = () => {
    if (!selectedFile) return;

    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const res = await uploadAndExtractReceipt(formData);

        if (!res.success || !res.data) {
          setError(res.error || "Could not extract receipt data. Please try manual entry.");
          return;
        }

        onExtracted(res.data, res.receiptUrl);
        onClose();
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during extraction."
        );
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div className="relative w-full max-w-lg bg-[#0d1322] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#111726]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h2 id="upload-modal-title" className="text-base font-semibold text-white">
                Upload Receipt
              </h2>
              <p className="text-xs text-slate-400">
                AI extracts product, purchase date, price, and warranty automatically
              </p>
            </div>
          </div>
          <button
            id="close-upload-modal-btn"
            onClick={onClose}
            disabled={isPending}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close upload modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!selectedFile ? (
            /* Dropzone */
            <div
              id="receipt-dropzone"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? "border-blue-500 bg-blue-500/10 scale-[1.01]"
                  : "border-slate-800 hover:border-slate-700 bg-[#111726]/40 hover:bg-[#111726]/80"
              }`}
            >
              <input
                id="receipt-file-input"
                ref={fileInputRef}
                type="file"
                aria-label="Upload receipt file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">
                  Click to browse or drag & drop receipt
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports JPG, PNG, WEBP, and PDF up to 10MB
                </p>
              </div>
            </div>
          ) : (
            /* File Preview Card */
            <div className="rounded-xl border border-slate-800 bg-[#111726] p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatFileSize(selectedFile.size)} &bull; {selectedFile.type || "Document"}
                    </p>
                  </div>
                </div>

                {!isPending && (
                  <button
                    id="remove-receipt-file-btn"
                    onClick={handleClearFile}
                    title="Remove file"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {previewUrl && (
                <div className="relative rounded-lg overflow-hidden border border-slate-800/80 max-h-48 flex items-center justify-center bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Receipt Preview"
                    className="object-contain max-h-48 w-auto rounded-lg"
                  />
                </div>
              )}
            </div>
          )}

          {/* AI Info pill */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              Our Vision AI model parses items, dates, totals, and infers manufacturer warranty duration automatically.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#111726]/50 flex items-center justify-end gap-3">
          <button
            id="cancel-upload-btn"
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="scan-receipt-btn"
            type="button"
            onClick={handleUploadAndExtract}
            disabled={!selectedFile || isPending}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-medium shadow-md shadow-blue-600/30 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Scanning with AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Scan & Extract</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
