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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="relative w-full max-w-xl bg-[#0d1322] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#111726]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 id="modal-title" className="text-base font-semibold text-white">
                {isAiExtracted
                  ? "Review AI Extracted Item"
                  : isEditing
                  ? "Edit Tracked Item"
                  : "Add Item Manually"}
              </h2>
              <p className="text-xs text-slate-400">
                {isAiExtracted
                  ? "Verify extracted details and warranty duration before adding"
                  : isEditing
                  ? "Update purchase details and warranty duration"
                  : "Track an item without uploading a receipt"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
          {isAiExtracted && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Extracted with Vision AI</span>
                  {initialData?.extraction_confidence && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-medium border border-blue-500/30">
                      {Math.round(initialData.extraction_confidence * 100)}% accuracy
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
            <div className="flex items-center gap-2 p-3 text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Name & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Product Name <span className="text-blue-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sony WH-1000XM5"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full px-3 py-2 bg-[#111726] border border-slate-700/80 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Brand
              </label>
              <input
                type="text"
                placeholder="e.g. Sony, Apple, Samsung"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 bg-[#111726] border border-slate-700/80 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Category & Seller */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Category
              </label>
              <div className="relative">
                <select
                  aria-label="Category"
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111726] border border-slate-700/80 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                >
                  {ITEM_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <Tag className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Seller / Retailer
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Amazon, Croma, Apple Store"
                  value={seller}
                  onChange={(e) => setSeller(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111726] border border-slate-700/80 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <Store className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Purchase Date & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Purchase Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => handlePurchaseDateChange(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111726] border border-slate-700/80 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all [color-scheme:dark]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Price Paid
              </label>
              <div className="flex gap-2">
                <select
                  aria-label="Currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-24 px-2 py-2 bg-[#111726] border border-slate-700/80 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#111726] border border-slate-700/80 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Warranty Duration & Expiry Date */}
          <div className="p-3.5 rounded-xl bg-[#111726]/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Warranty Period
              </span>
              <span className="text-[11px] text-blue-400">
                Auto-calculated from purchase date
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Duration (Months)
                </label>
                <input
                  type="number"
                  min="1"
                  value={warrantyMonths}
                  onChange={(e) => handleMonthsChange(e.target.value)}
                  placeholder="12"
                  className="w-full px-3 py-1.5 bg-[#0d1322] border border-slate-700/80 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={warrantyExpiryDate}
                  onChange={(e) => setWarrantyExpiryDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#0d1322] border border-slate-700/80 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-all [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* Optional Receipt URL / Reference */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Receipt File URL or Reference (Optional)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="https://... or invoice reference number"
                value={receiptUrl}
                onChange={(e) => setReceiptUrl(e.target.value)}
                className="w-full px-3 py-2 bg-[#111726] border border-slate-700/80 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
              <FileText className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-medium shadow-md shadow-blue-600/30 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
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
