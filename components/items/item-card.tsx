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
} from "lucide-react";
import { Item, ItemStatus } from "@/lib/types/database";

interface ItemCardProps {
  item: Item;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onDraftClaim?: (item: Item) => void;
}

export function ItemCard({
  item,
  onEdit,
  onDelete,
  onDraftClaim,
}: ItemCardProps) {
  const getStatusBadge = (status: ItemStatus) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Active
          </span>
        );
      case "expiring_soon":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            Expiring Soon
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            Expired
          </span>
        );
      case "archived":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            Archived
          </span>
        );
      default:
        return null;
    }
  };

  const formatPrice = (price: number | null, currency: string) => {
    if (price === null) return "—";
    try {
      return `${currency} ${price.toLocaleString()}`;
    } catch {
      return `${currency} ${price}`;
    }
  };

  return (
    <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between group shadow-sm hover:shadow-md">
      <div className="space-y-3">
        {/* Header: Brand, Category, Status */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              {item.brand && (
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
                  {item.brand}
                </span>
              )}
              {item.brand && item.category && (
                <span className="text-slate-600">&bull;</span>
              )}
              {item.category && (
                <span className="text-xs text-slate-400">{item.category}</span>
              )}
            </div>
            <h3 className="mt-1 text-base font-semibold text-white group-hover:text-blue-300 transition-colors">
              {item.product_name}
            </h3>
          </div>
          {getStatusBadge(item.status)}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/60 text-slate-400">
          <div>
            <span className="text-slate-500">Purchased:</span>{" "}
            <span className="text-slate-300">
              {item.purchase_date ?? "Not specified"}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Expires:</span>{" "}
            <span className="text-slate-300 font-medium">
              {item.warranty_expiry_date ?? "Not specified"}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Seller:</span>{" "}
            <span className="text-slate-300">
              {item.seller ?? "Not specified"}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Price:</span>{" "}
            <span className="text-slate-300 font-medium">
              {formatPrice(item.price, item.currency)}
            </span>
          </div>
        </div>

        {item.receipt_file_url && (
          <div className="pt-1">
            <a
              href={item.receipt_file_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline"
            >
              <FileText className="w-3 h-3" />
              <span>View Receipt / Doc</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        )}
      </div>

      {/* Card Footer: Duration & Actions */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {item.warranty_months
            ? `${item.warranty_months} mo coverage`
            : "No warranty info"}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onEdit(item)}
            title="Edit item"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(item)}
            title="Delete item"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/60 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            id={`claim-btn-${item.id}`}
            onClick={() => onDraftClaim && onDraftClaim(item)}
            aria-label={`Draft warranty claim for ${item.product_name}`}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 border border-blue-500/30 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <FileText className="w-3 h-3" />
            <span>Claim</span>
          </button>
        </div>
      </div>
    </div>
  );
}
