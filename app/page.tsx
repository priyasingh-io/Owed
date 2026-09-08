"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Receipt,
  Plus,
  UploadCloud,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Search,
  Sparkles,
  LogIn,
  LogOut,
  User as UserIcon,
  Check,
  Loader2,
  Download,
} from "lucide-react";
import { downloadItemsCSV } from "@/lib/domain/csv-export";
import { getItemStatus } from "@/lib/domain/warranty";
import { ITEM_CATEGORIES } from "@/lib/domain/categories";
import { Item } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/auth/actions";
import { getUserItems } from "@/app/items/actions";
import { ItemCard } from "@/components/items/item-card";
import { ItemFormModal } from "@/components/items/item-form-modal";
import { DeleteItemDialog } from "@/components/items/delete-item-dialog";
import { UploadReceiptModal } from "@/components/items/upload-receipt-modal";
import { ClaimAssistantModal } from "@/components/claims/claim-assistant-modal";
import { EnrichedExtractionResult } from "@/lib/ai/receipt-extractor";

const SAMPLE_ITEMS: Item[] = [
  {
    id: "demo-1",
    user_id: "demo-user",
    product_name: "MacBook Pro 16\" M3 Max",
    brand: "Apple",
    category: "Electronics",
    seller: "Apple Store BKC",
    purchase_date: "2024-03-15",
    price: 349900,
    currency: "INR",
    warranty_months: 12,
    warranty_expiry_date: "2025-03-15",
    receipt_file_url: null,
    extraction_confidence: 0.98,
    status: "expired",
    created_at: "2024-03-15T10:00:00Z",
    updated_at: "2024-03-15T10:00:00Z",
  },
  {
    id: "demo-2",
    user_id: "demo-user",
    product_name: "Sony WH-1000XM5 Wireless Headphones",
    brand: "Sony",
    category: "Electronics",
    seller: "Amazon India",
    purchase_date: "2025-10-10",
    price: 29990,
    currency: "INR",
    warranty_months: 12,
    warranty_expiry_date: "2026-10-01",
    receipt_file_url: null,
    extraction_confidence: 0.95,
    status: "active",
    created_at: "2025-10-10T10:00:00Z",
    updated_at: "2025-10-10T10:00:00Z",
  },
  {
    id: "demo-3",
    user_id: "demo-user",
    product_name: "Samsung French Door Refrigerator",
    brand: "Samsung",
    category: "Appliances",
    seller: "Croma Retail",
    purchase_date: "2024-09-20",
    price: 84500,
    currency: "INR",
    warranty_months: 24,
    warranty_expiry_date: "2026-09-20",
    receipt_file_url: null,
    extraction_confidence: 0.92,
    status: "active",
    created_at: "2024-09-20T10:00:00Z",
    updated_at: "2024-09-20T10:00:00Z",
  },
  {
    id: "demo-4",
    user_id: "demo-user",
    product_name: "Keychron Q1 Pro Mechanical Keyboard",
    brand: "Keychron",
    category: "Electronics",
    seller: "Meckeys",
    purchase_date: "2023-01-10",
    price: 18500,
    currency: "INR",
    warranty_months: 12,
    warranty_expiry_date: "2024-01-10",
    receipt_file_url: null,
    extraction_confidence: 0.99,
    status: "expired",
    created_at: "2023-01-10T10:00:00Z",
    updated_at: "2023-01-10T10:00:00Z",
  },
];

export default function DashboardPage() {
  const [items, setItems] = useState<Item[]>(SAMPLE_ITEMS);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [user, setUser] = useState<{ email?: string | null; id?: string } | null>(null);

  // Modal & Dialog states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAiExtracted, setIsAiExtracted] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimingItem, setClaimingItem] = useState<Item | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Check Supabase Auth status
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (!currentUser) {
        setItems(SAMPLE_ITEMS);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch real items when user is signed in
  useEffect(() => {
    if (!user) return;

    let active = true;
    getUserItems().then((res) => {
      if (active) {
        setIsLoadingItems(false);
        if (res.success && res.data) {
          setItems(res.data);
        }
      }
    });

    return () => {
      active = false;
    };
  }, [user]);

  const today = new Date().toISOString().split("T")[0];

  const enrichedItems = useMemo(() => {
    return items.map((item) => {
      if (item.status === "archived") return item;
      const calculatedStatus = getItemStatus(item.warranty_expiry_date, today);
      return {
        ...item,
        status: calculatedStatus,
      };
    });
  }, [items, today]);

  const metrics = useMemo(() => {
    const total = enrichedItems.length;
    const expiringSoon = enrichedItems.filter((i) => i.status === "expiring_soon").length;
    const active = enrichedItems.filter((i) => i.status === "active").length;
    const expired = enrichedItems.filter((i) => i.status === "expired").length;
    return { total, expiringSoon, active, expired };
  }, [enrichedItems]);

  const filteredItems = useMemo(() => {
    return enrichedItems.filter((item) => {
      const matchesSearch =
        item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.brand && item.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.seller && item.seller.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === "All" ||
        (item.category && item.category.toLowerCase() === selectedCategory.toLowerCase());

      const matchesStatus =
        selectedStatus === "all" || item.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [enrichedItems, searchQuery, selectedCategory, selectedStatus]);

  const handleOpenUploadModal = () => {
    setIsUploadModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setIsAiExtracted(false);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (item: Item) => {
    setEditingItem(item);
    setIsAiExtracted(false);
    setIsFormModalOpen(true);
  };

  const handleOpenDeleteDialog = (item: Item) => {
    setDeletingItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleOpenClaimModal = (item: Item) => {
    setClaimingItem(item);
    setIsClaimModalOpen(true);
  };

  const handleReceiptExtracted = (
    extraction: EnrichedExtractionResult,
    receiptUrl?: string
  ) => {
    setIsUploadModalOpen(false);
    const prefilledItem: Item = {
      id: "",
      user_id: user?.id ?? "guest",
      product_name: extraction.product_name,
      brand: extraction.brand,
      category: extraction.category,
      seller: extraction.seller,
      purchase_date: extraction.purchase_date,
      price: extraction.price,
      currency: extraction.currency || "INR",
      warranty_months: extraction.warranty_months,
      warranty_expiry_date: extraction.warranty_expiry_date,
      receipt_file_url: receiptUrl ?? null,
      extraction_confidence: extraction.confidence,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setEditingItem(prefilledItem);
    setIsAiExtracted(true);
    setIsFormModalOpen(true);
    showToast("Receipt analyzed! Please review and confirm details.");
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleItemSaved = (savedItem: Item) => {
    setItems((prev) => {
      const exists = prev.some((i) => i.id === savedItem.id);
      if (exists) {
        return prev.map((i) => (i.id === savedItem.id ? savedItem : i));
      }
      return [savedItem, ...prev];
    });
    showToast(editingItem ? "Item updated successfully!" : "Item added successfully!");
  };

  const handleItemDeleted = (deletedId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== deletedId));
    showToast("Item deleted.");
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-slate-700 text-slate-100 text-sm shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-5">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-[#0d1322]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
                Owed
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                ClaimIt MVP
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              id="upload-receipt-btn"
              onClick={handleOpenUploadModal}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-medium transition-all shadow-md shadow-blue-600/30 active:scale-95 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 shrink-0" />
              <span>
                Upload<span className="hidden sm:inline"> Receipt</span>
              </span>
            </button>
            <button
              id="add-item-btn"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium border border-slate-700 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>
                Add<span className="hidden sm:inline"> Manually</span>
              </span>
            </button>

            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#111726] border border-slate-800 text-xs text-slate-300">
                  <UserIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span className="max-w-[120px] truncate">{user.email}</span>
                </div>
                <form action={signOut}>
                  <button
                    type="submit"
                    title="Sign Out"
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-red-500/20 hover:text-red-400 text-slate-400 border border-slate-700 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium border border-slate-700 transition-all active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Unauthenticated Demo Notice Banner */}
        {!user && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-950/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-blue-200">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                <strong>Preview Mode:</strong> You are viewing sample items. Sign in to track your personal purchases with secure storage and automated expiry alerts.
              </span>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shrink-0 transition-colors shadow-sm"
            >
              <span>Sign In / Create Account</span>
            </Link>
          </div>
        )}

        {/* Hero / Value Banner */}
        <section className="relative overflow-hidden rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#131b2e] via-[#101726] to-[#0c1322] border border-slate-800/80 shadow-2xl">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              AI Warranty Assistant
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Never lose a warranty. Never leave money unclaimed.
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-400 leading-relaxed">
              Track warranties with automatic deadline reminders and AI claim assistance. Add items manually or upload receipts for instant extraction.
            </p>
          </div>
        </section>

        {/* Metric Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase tracking-wider">Tracked Items</span>
              <Receipt className="w-4 h-4 text-blue-400" />
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-bold text-white">{metrics.total}</p>
            <p className="mt-1 text-xs text-slate-500">Across all categories</p>
          </div>

          <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase tracking-wider">Expiring Soon</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-bold text-amber-400">{metrics.expiringSoon}</p>
            <p className="mt-1 text-xs text-amber-400/70">&le; 30 days remaining</p>
          </div>

          <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase tracking-wider">Active Coverage</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-bold text-emerald-400">{metrics.active}</p>
            <p className="mt-1 text-xs text-slate-500">Fully covered items</p>
          </div>

          <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase tracking-wider">Expired</span>
              <AlertTriangle className="w-4 h-4 text-slate-400" />
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-bold text-slate-400">{metrics.expired}</p>
            <p className="mt-1 text-xs text-slate-500">Coverage ended</p>
          </div>
        </section>

        {/* Filter & Search Bar */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                id="search-input"
                type="text"
                placeholder="Search products, brands, or retailers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#111726] border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {["all", "active", "expiring_soon", "expired"].map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-all whitespace-nowrap cursor-pointer ${
                    selectedStatus === status
                      ? "bg-blue-600 text-white shadow"
                      : "bg-[#111726] text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {status.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            <button
              onClick={() => setSelectedCategory("All")}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-all cursor-pointer ${
                selectedCategory === "All"
                  ? "bg-slate-200 text-slate-950 font-semibold"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-300 border border-slate-800"
              }`}
            >
              All Categories
            </button>
            {ITEM_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-slate-200 text-slate-950 font-semibold"
                    : "bg-slate-800/60 text-slate-400 hover:text-slate-300 border border-slate-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Items Grid */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Tracked Purchases ({filteredItems.length})
              </h2>
              <p className="text-xs text-slate-500">
                {items.length === filteredItems.length
                  ? "Showing all tracked items"
                  : `Filtered from ${items.length} total item${items.length === 1 ? "" : "s"}`}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {isLoadingItems && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span>Refreshing items...</span>
                </div>
              )}
              <button
                id="export-csv-btn"
                onClick={() => downloadItemsCSV(filteredItems)}
                disabled={filteredItems.length === 0}
                title={filteredItems.length === 0 ? "No items to export" : "Export current items to CSV"}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111726] hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-800 hover:border-slate-700 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center bg-[#0d1322]">
              <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-base font-semibold text-slate-300">
                {items.length === 0 ? "No tracked items yet" : "No items match your criteria"}
              </h3>
              <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
                {items.length === 0
                  ? "Start tracking warranties and receiving expiry reminders by adding your first item."
                  : "Try adjusting your search keywords or category filters."}
              </p>
              {items.length === 0 && (
                <button
                  onClick={handleOpenAddModal}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-medium transition-all shadow-md shadow-blue-600/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Item</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onEdit={handleOpenEditModal}
                  onDelete={handleOpenDeleteDialog}
                  onDraftClaim={handleOpenClaimModal}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Upload Receipt Modal */}
      <UploadReceiptModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onExtracted={handleReceiptExtracted}
      />

      {/* Manual Entry / Edit / AI Review Modal */}
      {isFormModalOpen && (
        <ItemFormModal
          key={editingItem?.id || (isAiExtracted ? "ai-review" : "new-item")}
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingItem(null);
            setIsAiExtracted(false);
          }}
          initialData={editingItem}
          onSuccess={handleItemSaved}
          isAiExtracted={isAiExtracted}
        />
      )}

      {/* Delete Item Confirmation Dialog */}
      <DeleteItemDialog
        isOpen={isDeleteDialogOpen}
        item={deletingItem}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeletingItem(null);
        }}
        onDeleted={handleItemDeleted}
      />

      {/* AI Claim Assistant Modal */}
      <ClaimAssistantModal
        isOpen={isClaimModalOpen}
        onClose={() => {
          setIsClaimModalOpen(false);
          setClaimingItem(null);
        }}
        item={claimingItem}
        onClaimCreated={() => {
          showToast("Warranty claim letter drafted with AI!");
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6 bg-[#090d16] text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>&copy; 2026 Owed. Built with Next.js App Router & Supabase.</span>
          <div className="flex items-center gap-4">
            <span className="text-slate-400">Phase 1: Warranties & Receipts</span>
            <span>&bull;</span>
            <span className="text-slate-600">Phase 2: Unclaimed Money Finder</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
