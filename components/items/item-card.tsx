"use client";

import React from "react";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Pencil,
  Trash2,
  ExternalLink,
  Laptop,
  Home,
  Smartphone,
  Watch,
  Shirt,
  Car,
  Wrench,
  Dumbbell,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { Item, ItemStatus } from "@/lib/types/database";
import { getWarrantyProgress, formatDisplayDate } from "@/lib/domain/warranty";

interface ItemCardProps {
  item: Item;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onDraftClaim?: (item: Item) => void;
}

function getCategoryIcon(category: string | null) {
  const cat = (category || "").toLowerCase();
  if (cat.includes("electronics")) return Laptop;
  if (cat.includes("appliances") || cat.includes("furniture")) return Home;
  if (cat.includes("mobile") || cat.includes("phone")) return Smartphone;
  if (cat.includes("watch") || cat.includes("jewelry")) return Watch;
  if (cat.includes("apparel") || cat.includes("footwear")) return Shirt;
  if (cat.includes("automotive") || cat.includes("car")) return Car;
  if (cat.includes("tools") || cat.includes("hardware")) return Wrench;
  if (cat.includes("fitness")) return Dumbbell;
  return ShieldCheck;
}

export function ItemCard({
  item,
  onEdit,
  onDelete,
  onDraftClaim,
}: ItemCardProps) {
  const progress = getWarrantyProgress(
    item.purchase_date,
    item.warranty_expiry_date
  );
  const CategoryIcon = getCategoryIcon(item.category);

  const getStatusBadge = (status: ItemStatus) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Active
          </span>
        );
      case "expiring_soon":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            Expiring Soon
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-500/10 text-slate-400 border border-slate-700/40">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Expired
          </span>
        );
      case "archived":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            Archived
          </span>
        );
      default:
        return null;
    }
  };

  const formatPrice = (price: number | null, currency: string) => {
    if (price === null) return null;
    const curr = currency || "INR";
    const symbolMap: Record<string, string> = {
      INR: "₹",
      USD: "$",
      EUR: "€",
      GBP: "£",
      CAD: "CA$",
      AUD: "A$",
    };
    const symbol = symbolMap[curr] || `${curr} `;
    try {
      return `${symbol}${price.toLocaleString()}`;
    } catch {
      return `${symbol}${price}`;
    }
  };

  return (
    <div className="bg-[#11141c] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between group shadow-sm hover:shadow-xl hover:shadow-black/30 relative">
      <div className="space-y-4">
        {/* Header with Icon, Brand, Title, Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-300 shrink-0 group-hover:text-white group-hover:bg-white/[0.08] transition-colors">
              <CategoryIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {item.brand && (
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate">
                    {item.brand}
                  </span>
                )}
                {item.brand && item.category && (
                  <span className="text-slate-600 text-xs">&bull;</span>
                )}
                {item.category && (
                  <span className="text-[11px] text-slate-400 truncate">
                    {item.category}
                  </span>
                )}
              </div>
              <h3 className="mt-0.5 text-base font-semibold text-white tracking-tight group-hover:text-slate-100 transition-colors truncate">
                {item.product_name}
              </h3>
            </div>
          </div>
          <div className="shrink-0">{getStatusBadge(item.status)}</div>
        </div>

        {/* Visual Warranty Progress Timeline */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{progress.label}</span>
            </span>
            <span className="text-slate-400 text-[11px] tabular-nums font-medium">
              {item.warranty_months ? `${item.warranty_months} mo coverage` : "No period set"}
            </span>
          </div>

          <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                item.status === "expired"
                  ? "bg-slate-600"
                  : item.status === "expiring_soon"
                  ? "bg-gradient-to-r from-amber-500 to-amber-400"
                  : "bg-gradient-to-r from-emerald-500 to-teal-400"
              }`}
              style={{ width: `${Math.max(5, progress.percentageElapsed)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
            <span>Bought {formatDisplayDate(item.purchase_date)}</span>
            <span>Ends {formatDisplayDate(item.warranty_expiry_date)}</span>
          </div>
        </div>

        {/* Context metadata (Seller, Price, Receipt) */}
        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-1.5 truncate text-slate-400">
            {item.seller ? (
              <>
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{item.seller}</span>
              </>
            ) : (
              <span className="text-slate-400">Direct purchase</span>
            )}
          </div>

          {formatPrice(item.price, item.currency) && (
            <div className="text-right tabular-nums font-semibold text-slate-200">
              {formatPrice(item.price, item.currency)}
            </div>
          )}
        </div>

        {item.receipt_file_url && (
          <div className="pt-0.5">
            <a
              href={item.receipt_file_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>View Receipt</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>
        )}
      </div>

      {/* Card Footer: Actions */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
        <div className="text-[11px] text-slate-400">
          {item.status === "expiring_soon" ? (
            <span className="text-amber-400/90 font-medium">Action recommended</span>
          ) : item.status === "expired" ? (
            <span>Coverage lapsed</span>
          ) : (
            <span className="text-emerald-400/80">Protected</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onEdit(item)}
            title="Edit item"
            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] text-slate-400 hover:text-slate-200 border border-white/[0.06] transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(item)}
            title="Delete item"
            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/[0.06] transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            id={`claim-btn-${item.id}`}
            onClick={() => onDraftClaim && onDraftClaim(item)}
            aria-label={`Draft warranty claim for ${item.product_name}`}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.1] flex items-center gap-1.5 font-medium transition-all active:scale-95 cursor-pointer"
          >
            <FileText className="w-3 h-3 text-blue-400" />
            <span>Claim</span>
          </button>
        </div>
      </div>
    </div>
  );
}

