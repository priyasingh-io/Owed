"use client";

import React from "react";
import {
  Clock,
  FileText,
  Pencil,
  Trash2,
  Laptop,
  Home,
  Smartphone,
  Watch,
  Shirt,
  Car,
  Wrench,
  Dumbbell,
  ShieldCheck,
} from "lucide-react";
import { Item, ItemStatus } from "@/lib/types/database";
import { getWarrantyProgress, formatDisplayDate } from "@/lib/domain/warranty";

interface ItemListRowProps {
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

export function ItemListRow({
  item,
  onEdit,
  onDelete,
  onDraftClaim,
}: ItemListRowProps) {
  const progress = getWarrantyProgress(
    item.purchase_date,
    item.warranty_expiry_date
  );
  const CategoryIcon = getCategoryIcon(item.category);

  const getStatusBadge = (status: ItemStatus) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Active
          </span>
        );
      case "expiring_soon":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/25 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            Expiring Soon
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-500/10 text-slate-400 border border-slate-700/40 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Expired
          </span>
        );
      default:
        return null;
    }
  };

  const formatPrice = (price: number | null, currency: string) => {
    if (price === null) return "—";
    const curr = currency || "INR";
    const symbolMap: Record<string, string> = {
      INR: "₹",
      USD: "$",
      EUR: "€",
      GBP: "£",
    };
    const symbol = symbolMap[curr] || `${curr} `;
    try {
      return `${symbol}${price.toLocaleString()}`;
    } catch {
      return `${symbol}${price}`;
    }
  };

  return (
    <div className="bg-[#11141c] hover:bg-[#151923] border border-white/[0.06] hover:border-white/[0.14] rounded-xl px-4 py-3.5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group">
      {/* Product & Category info */}
      <div className="flex items-center gap-3 min-w-0 md:w-5/12">
        <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-300 shrink-0 group-hover:text-white group-hover:bg-white/[0.08] transition-colors">
          <CategoryIcon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px]">
            {item.brand && (
              <span className="font-semibold uppercase tracking-wider text-slate-400 truncate">
                {item.brand}
              </span>
            )}
            {item.brand && item.category && (
              <span className="text-slate-600">&bull;</span>
            )}
            {item.category && (
              <span className="text-slate-400 truncate">{item.category}</span>
            )}
          </div>
          <h4 className="text-sm font-semibold text-white truncate group-hover:text-slate-100 transition-colors">
            {item.product_name}
          </h4>
        </div>
      </div>

      {/* Expiry & Progress Bar */}
      <div className="md:w-3/12 min-w-0 space-y-1">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{progress.label}</span>
          </span>
          <span className="tabular-nums">Ends {formatDisplayDate(item.warranty_expiry_date)}</span>
        </div>
        <div className="h-1 w-full bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              item.status === "expired"
                ? "bg-slate-600"
                : item.status === "expiring_soon"
                ? "bg-amber-400"
                : "bg-emerald-400"
            }`}
            style={{ width: `${Math.max(5, progress.percentageElapsed)}%` }}
          />
        </div>
      </div>

      {/* Seller & Price */}
      <div className="flex items-center justify-between md:justify-end gap-6 md:w-4/12">
        <div className="text-right hidden sm:block">
          <div className="text-xs font-semibold text-slate-200 tabular-nums">
            {formatPrice(item.price, item.currency)}
          </div>
          <div className="text-[11px] text-slate-400 truncate max-w-[120px]">
            {item.seller || "Direct"}
          </div>
        </div>

        <div className="shrink-0">{getStatusBadge(item.status)}</div>

        {item.receipt_file_url && (
          <a
            href={item.receipt_file_url}
            target="_blank"
            rel="noreferrer"
            title="View receipt document"
            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.06] transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
          </a>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
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
            className="text-xs px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.1] flex items-center gap-1 font-medium transition-all cursor-pointer"
          >
            <FileText className="w-3 h-3 text-blue-400" />
            <span>Claim</span>
          </button>
        </div>
      </div>
    </div>
  );
}
