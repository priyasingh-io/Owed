"use client";

import React, { useState, useTransition } from "react";
import {
  X,
  FileText,
  Sparkles,
  Copy,
  Check,
  Mail,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  Clock,
  Paperclip,
} from "lucide-react";
import { Item } from "@/lib/types/database";
import { ClaimOutputData } from "@/lib/validation/claim";
import { generateClaimDraft } from "@/app/claims/actions";

interface ClaimAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  onClaimCreated?: (claimData: ClaimOutputData, claimId?: string) => void;
}

const COMMON_ISSUES = [
  {
    label: "Won't turn on / Power failure",
    text: "The device abruptly stopped turning on or taking a charge during ordinary usage.",
  },
  {
    label: "Screen / Display malfunction",
    text: "The screen started displaying distortion, lines, and flickering before turning completely black.",
  },
  {
    label: "Battery draining rapidly",
    text: "The battery no longer holds a charge and depletes within minutes after being disconnected.",
  },
  {
    label: "Physical defect on delivery",
    text: "The product arrived with a manufacturing flaw and visible cosmetic/structural damage.",
  },
];

export function ClaimAssistantModal({
  isOpen,
  onClose,
  item,
  onClaimCreated,
}: ClaimAssistantModalProps) {
  const [step, setStep] = useState<"input" | "review">("input");
  const [issueDescription, setIssueDescription] = useState("");
  const [desiredResolution, setDesiredResolution] = useState<
    "repair" | "replacement" | "refund"
  >("repair");
  const [error, setError] = useState<string | null>(null);
  const [generatedClaim, setGeneratedClaim] = useState<ClaimOutputData | null>(
    null
  );
  const [editableBody, setEditableBody] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!isOpen || !item) return null;

  const handleGenerate = () => {
    if (issueDescription.trim().length < 10) {
      setError("Please describe the issue in at least 10 characters.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const res = await generateClaimDraft(
          {
            itemId: item.id || "demo-item",
            issueDescription: issueDescription.trim(),
            desiredResolution,
          },
          item
        );

        if (!res.success || !res.data) {
          setError(res.error || "Failed to generate claim draft.");
          return;
        }

        setGeneratedClaim(res.data);
        setEditableBody(res.data.body);
        setStep("review");
        if (onClaimCreated) {
          onClaimCreated(res.data, res.claimId);
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred while drafting claim."
        );
      }
    });
  };

  const handleCopyLetter = async () => {
    if (!generatedClaim) return;
    const fullText = `Subject: ${generatedClaim.subject}\nTo: ${generatedClaim.recipient_suggestion}\n\n${editableBody}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopySubject = async () => {
    if (!generatedClaim) return;
    try {
      await navigator.clipboard.writeText(generatedClaim.subject);
      setCopiedSubject(true);
      setTimeout(() => setCopiedSubject(false), 2000);
    } catch {
      // Fallback
    }
  };

  const mailtoUrl = generatedClaim
    ? `mailto:?subject=${encodeURIComponent(
        generatedClaim.subject
      )}&body=${encodeURIComponent(editableBody)}`
    : "#";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="claim-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-[#0e1118] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#131722]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-slate-200">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 id="claim-modal-title" className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Warranty Claim Resolution</span>
                <span className="text-[10px] uppercase font-semibold tracking-wide px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-300 border border-white/[0.08]">
                  Statutory Rights
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Draft a formal warranty claim letter grounded in consumer protection terms
              </p>
            </div>
          </div>
          <button
            id="close-claim-modal-btn"
            onClick={onClose}
            disabled={isPending}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Close claim modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 p-3 text-xs text-rose-300 bg-rose-950/30 border border-rose-800/40 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Item Reference Card */}
          <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="flex items-center gap-2 text-slate-400 font-medium">
                {item.brand && <span className="text-slate-300 font-semibold uppercase tracking-wider">{item.brand}</span>}
                {item.brand && <span>&bull;</span>}
                <span>{item.category || "General"}</span>
              </div>
              <h3 className="text-sm font-semibold text-white mt-0.5">{item.product_name}</h3>
              <p className="text-slate-400 mt-1">
                Seller: <span className="text-slate-200">{item.seller || "Not specified"}</span> &bull; Purchased:{" "}
                <span className="text-slate-200">{item.purchase_date || "Unknown"}</span>
              </p>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-white/[0.06]">
              <div className="flex items-center sm:justify-end gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>Expires: <strong className="text-slate-200">{item.warranty_expiry_date || "Active"}</strong></span>
              </div>
              <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" />
                Coverage Active
              </span>
            </div>
          </div>

          {step === "input" ? (
            /* Step 1: Input Details */
            <div className="space-y-4">
              {/* Quick issue chips */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Common Issue Templates:
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_ISSUES.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setIssueDescription(chip.text)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 transition-colors text-left cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Detailed Description */}
              <div>
                <label
                  htmlFor="issue-description-input"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Describe the Problem in Detail <span className="text-rose-400">*</span>
                </label>
                <textarea
                  id="issue-description-input"
                  rows={4}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Describe what happened, when it started, and any symptoms or error codes..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#11141c] border border-white/[0.08] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-white/[0.2] transition-all resize-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Min 10 characters. Formulates statutory consumer warranty claims based on purchase terms.
                </p>
              </div>

              {/* Desired Resolution */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Requested Resolution:
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setDesiredResolution("repair")}
                    className={`p-2.5 rounded-xl border text-center font-medium transition-all cursor-pointer ${
                      desiredResolution === "repair"
                        ? "bg-white/[0.1] border-white/[0.25] text-white"
                        : "bg-white/[0.02] border-white/[0.08] text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Free Repair
                  </button>
                  <button
                    type="button"
                    onClick={() => setDesiredResolution("replacement")}
                    className={`p-2.5 rounded-xl border text-center font-medium transition-all cursor-pointer ${
                      desiredResolution === "replacement"
                        ? "bg-white/[0.1] border-white/[0.25] text-white"
                        : "bg-white/[0.02] border-white/[0.08] text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Replacement
                  </button>
                  <button
                    type="button"
                    onClick={() => setDesiredResolution("refund")}
                    className={`p-2.5 rounded-xl border text-center font-medium transition-all cursor-pointer ${
                      desiredResolution === "refund"
                        ? "bg-white/[0.1] border-white/[0.25] text-white"
                        : "bg-white/[0.02] border-white/[0.08] text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Full Refund
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Step 2: Review Generated Draft */
            <div className="space-y-4">
              {generatedClaim && (
                <>
                  {/* Recipient & Attachments Card */}
                  <div className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-xs space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Target Department:</span>
                      <span className="text-slate-200 font-medium">
                        {generatedClaim.recipient_suggestion}
                      </span>
                    </div>
                    {generatedClaim.suggested_attachments?.length > 0 && (
                      <div className="flex items-start gap-2 pt-2 border-t border-white/[0.06]">
                        <Paperclip className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                        <div className="flex flex-wrap gap-1.5">
                          {generatedClaim.suggested_attachments.map((att, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[11px] text-slate-300 border border-white/[0.08]"
                            >
                              {att}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Subject Line */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Email Subject Line:</span>
                      <button
                        id="copy-subject-btn"
                        onClick={handleCopySubject}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                      >
                        {copiedSubject ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Subject</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#11141c] border border-white/[0.08] text-xs font-mono text-slate-200">
                      {generatedClaim.subject}
                    </div>
                  </div>

                  {/* Letter Body */}
                  <div className="space-y-1">
                    <label
                      htmlFor="claim-body-textarea"
                      className="block text-xs font-medium text-slate-400"
                    >
                      Formal Claim Letter (Editable):
                    </label>
                    <textarea
                      id="claim-body-textarea"
                      rows={9}
                      value={editableBody}
                      onChange={(e) => setEditableBody(e.target.value)}
                      className="w-full p-3.5 rounded-xl bg-[#11141c] border border-white/[0.08] text-slate-200 text-xs font-mono leading-relaxed focus:outline-none focus:border-white/[0.2] transition-all resize-none"
                    />
                  </div>

                  {/* Legal Disclaimer */}
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] text-slate-400 flex items-start gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      Disclaimer: This letter is an advisory draft for your personal reference and does not constitute formal legal representation.
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#131722]/50 flex items-center justify-between gap-3">
          {step === "input" ? (
            <>
              <button
                id="cancel-claim-btn"
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-400 hover:text-slate-200 rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="generate-claim-btn"
                type="button"
                onClick={handleGenerate}
                disabled={issueDescription.trim().length < 10 || isPending}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-950 text-xs sm:text-sm font-semibold shadow-sm active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                    <span>Drafting claim letter...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 text-slate-900" />
                    <span>Generate Claim Letter</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                id="back-to-input-btn"
                type="button"
                onClick={() => setStep("input")}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Edit Issue</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  id="copy-claim-btn"
                  type="button"
                  onClick={handleCopyLetter}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-white/[0.1] text-xs font-medium transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied to Clipboard</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Letter</span>
                    </>
                  )}
                </button>

                <a
                  id="mailto-claim-btn"
                  href={mailtoUrl}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-950 text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-900" />
                  <span>Open in Mail</span>
                </a>

                <button
                  id="finish-claim-btn"
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
