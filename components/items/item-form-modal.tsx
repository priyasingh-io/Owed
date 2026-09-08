"use client";

import React, { useState, useTransition } from "react";
import { X, Sparkles, AlertCircle, Tag, Store, Clock, FileText } from "lucide-react";
import { ITEM_CATEGORIES, getDefaultWarrantyMonths } from "@/lib/domain/categories";
import { calculateWarrantyExpiryDate } from "@/lib/domain/warranty";
import { createItem, updateItem } from "@/app/items/actions";
import { Item } from "@/lib/types/database";

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Item | null;
  onSuccess?: (item: Item) => void;
  isAiExtracted?: boolean;
}

export function ItemFormModal({
  isOpen,
  onClose,
  initialData,
  onSuccess,
  isAiExtracted = false,
}: ItemFormModalProps) {
  const isEditing = Boolean(initialData && initialData.id && !isAiExtracted);

  const [productName, setProductName] = useState(initialData?.product_name ?? "");
  const [brand, setBrand] = useState(initialData?.brand ?? "");
  const [category, setCategory] = useState<string>(initialData?.category ?? "Electronics");
  const [seller, setSeller] = useState(initialData?.seller ?? "");
  const [purchaseDate, setPurchaseDate] = useState(() => {
    if (initialData?.purchase_date) return initialData.purchase_date;
    return new Date().toISOString().split("T")[0];
  });
  const [price, setPrice] = useState(
    initialData?.price !== undefined && initialData?.price !== null
      ? initialData.price.toString()
      : ""
  );
  const [currency, setCurrency] = useState(initialData?.currency ?? "INR");
  const [warrantyMonths, setWarrantyMonths] = useState(
    initialData?.warranty_months !== undefined && initialData?.warranty_months !== null
      ? initialData.warranty_months.toString()
      : "12"
  );
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState(() => {
    if (initialData?.warranty_expiry_date) return initialData.warranty_expiry_date;
    const today = new Date().toISOString().split("T")[0];
    return calculateWarrantyExpiryDate(today, 12) ?? "";
  });
  const [receiptUrl, setReceiptUrl] = useState(initialData?.receipt_file_url ?? "");

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Handle category change: update suggested warranty months if not custom
  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    const suggestedMonths = getDefaultWarrantyMonths(newCat);
    setWarrantyMonths(suggestedMonths.toString());

    if (purchaseDate) {
      const newExpiry = calculateWarrantyExpiryDate(purchaseDate, suggestedMonths);
      if (newExpiry) setWarrantyExpiryDate(newExpiry);
    }
  };

  // Handle purchase date change: recompute expiry
  const handlePurchaseDateChange = (newDate: string) => {
    setPurchaseDate(newDate);
    const months = parseInt(warrantyMonths, 10);
    if (newDate && !isNaN(months) && months > 0) {
      const newExpiry = calculateWarrantyExpiryDate(newDate, months);
      if (newExpiry) setWarrantyExpiryDate(newExpiry);
    }
  };

  // Handle warranty months change: recompute expiry
  const handleMonthsChange = (newMonthsStr: string) => {
    setWarrantyMonths(newMonthsStr);
    const months = parseInt(newMonthsStr, 10);
    if (purchaseDate && !isNaN(months) && months > 0) {
      const newExpiry = calculateWarrantyExpiryDate(purchaseDate, months);
      if (newExpiry) setWarrantyExpiryDate(newExpiry);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!productName.trim()) {
      setError("Product name is required.");
      return;
    }

    const parsedPrice = price.trim() ? parseFloat(price) : null;
    if (parsedPrice !== null && (isNaN(parsedPrice) || parsedPrice <= 0)) {
      setError("Price must be a positive number.");
      return;
    }

    const parsedMonths = warrantyMonths.trim()
      ? parseInt(warrantyMonths, 10)
      : null;
    if (parsedMonths !== null && (isNaN(parsedMonths) || parsedMonths <= 0)) {
      setError("Warranty months must be a positive number.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          product_name: productName.trim(),
          brand: brand.trim() || null,
          category: category.trim() || null,
          seller: seller.trim() || null,
          purchase_date: purchaseDate.trim() || null,
          price: parsedPrice,
          currency: currency.trim() || "INR",
          warranty_months: parsedMonths,
          warranty_expiry_date: warrantyExpiryDate.trim() || null,
          receipt_file_url: receiptUrl.trim() || null,
        };

        if (isEditing && initialData) {
          const res = await updateItem(initialData.id, payload);
          if (res.error) {
            setError(res.error);
            return;
          }
          if (res.data && onSuccess) {
            onSuccess(res.data as Item);
          }
        } else {
          const res = await createItem(payload);
          if (res.error) {
            setError(res.error);
            return;
          }
          if (res.data && onSuccess) {
            onSuccess(res.data as Item);
          }
        }

        onClose();
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred."
        );
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="relative w-full max-w-xl bg-[#0e1118] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#131722]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-slate-200">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 id="modal-title" className="text-sm font-semibold text-white">
                {isAiExtracted
                  ? "Review AI Extracted Item"
                  : isEditing
                  ? "Edit Tracked Item"
                  : "Add Item Manually"}
              </h2>
              <p className="text-xs text-slate-400">
                {isAiExtracted
                  ? "Verify extracted details and warranty terms before saving"
                  : isEditing
                  ? "Update purchase details and warranty duration"
                  : "Track an item with custom warranty duration"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
          {isAiExtracted && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-slate-300">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Extracted Details</span>
                  {initialData?.extraction_confidence && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 text-[10px] font-medium border border-blue-500/20">
                      {Math.round(initialData.extraction_confidence * 100)}% confidence
                    </span>
                  )}
                </div>
                <p className="text-slate-400">
                  Please verify the extracted product details, date, and warranty duration below before saving.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2.5 p-3 text-xs text-rose-300 bg-rose-950/30 border border-rose-800/40 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Name */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300">
              Product Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sony WH-1000XM5"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#11141c] border border-white/[0.08] focus:border-white/[0.2] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition-all"
            />
          </div>

          {/* Brand & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">
                Brand / Manufacturer
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Sony, Apple, Samsung"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#11141c] border border-white/[0.08] focus:border-white/[0.2] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition-all"
                />
                <Tag className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="category-select" className="block text-xs font-medium text-slate-300">
                Category
              </label>
              <select
                id="category-select"
                aria-label="Category"
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#11141c] border border-white/[0.08] focus:border-white/[0.2] rounded-xl text-sm text-slate-200 focus:outline-none transition-all cursor-pointer"
              >
                {ITEM_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Seller / Retailer & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">
                Seller / Retailer
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Amazon, Croma, Apple Store"
                  value={seller}
                  onChange={(e) => setSeller(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#11141c] border border-white/[0.08] focus:border-white/[0.2] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition-all"
                />
                <Store className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">
                Purchase Price
              </label>
              <div className="flex gap-2">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  aria-label="Currency"
                  className="w-24 px-2.5 py-2.5 bg-[#11141c] border border-white/[0.08] focus:border-white/[0.2] rounded-xl text-sm text-slate-200 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="29990"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 bg-[#11141c] border border-white/[0.08] focus:border-white/[0.2] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition-all tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Purchase Date, Duration, and Expiry */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">
                Purchase Date
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => handlePurchaseDateChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#11141c] border border-white/[0.08] focus:border-white/[0.2] rounded-xl text-sm text-slate-200 focus:outline-none transition-all cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">
                Duration (Months)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="120"
                  placeholder="12"
                  value={warrantyMonths}
                  onChange={(e) => handleMonthsChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#11141c] border border-white/[0.08] focus:border-white/[0.2] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition-all tabular-nums"
                />
                <Clock className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">
                Warranty Expiry
              </label>
              <input
                type="date"
                value={warrantyExpiryDate}
                onChange={(e) => setWarrantyExpiryDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#11141c] border border-white/[0.08] focus:border-white/[0.2] rounded-xl text-sm text-slate-200 focus:outline-none transition-all cursor-pointer"
              />
            </div>
          </div>

          {/* Optional Receipt URL / Reference */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300">
              Receipt File URL or Reference (Optional)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="https://... or invoice reference number"
                value={receiptUrl}
                onChange={(e) => setReceiptUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#11141c] border border-white/[0.08] focus:border-white/[0.2] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition-all"
              />
              <FileText className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-400 hover:text-slate-200 rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-950 text-xs sm:text-sm font-semibold active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-sm"
            >
              {isPending ? (
                <span>Saving...</span>
              ) : (
                <span>{isEditing ? "Save Changes" : "Add Item"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
