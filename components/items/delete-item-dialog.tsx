"use client";

import React, { useTransition } from "react";
import { AlertTriangle, X } from "lucide-react";
import { deleteItem } from "@/app/items/actions";
import { Item } from "@/lib/types/database";

interface DeleteItemDialogProps {
  isOpen: boolean;
  item: Item | null;
  onClose: () => void;
  onDeleted?: (itemId: string) => void;
}

export function DeleteItemDialog({
  isOpen,
  item,
  onClose,
  onDeleted,
}: DeleteItemDialogProps) {
  const [isPending, startTransition] = useTransition();

  if (!isOpen || !item) return null;

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteItem(item.id);
      if (res.success) {
        if (onDeleted) onDeleted(item.id);
        onClose();
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md bg-[#0e1118] border border-white/[0.1] rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Delete Item</h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to remove this item?
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-slate-300">
          <span className="font-semibold text-white">{item.product_name}</span>
          {item.brand && <span className="text-slate-400"> &bull; {item.brand}</span>}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          This will permanently remove this item and any associated warranty notifications from your vault. This action cannot be undone.
        </p>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-400 hover:text-slate-200 rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs sm:text-sm font-semibold shadow-sm active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isPending ? "Deleting..." : "Delete Item"}
          </button>
        </div>
      </div>
    </div>
  );
}
