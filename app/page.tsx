"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Receipt,
  Plus,
  UploadCloud,
  Clock,
  CheckCircle2,
  Search,
  LogIn,
  LogOut,
  User as UserIcon,
  Check,
  Loader2,
  Download,
  LayoutGrid,
  List,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Filter,
  ChevronDown,
} from "lucide-react";
import { downloadItemsCSV } from "@/lib/domain/csv-export";
import { getItemStatus, formatDisplayDate } from "@/lib/domain/warranty";
import { ITEM_CATEGORIES } from "@/lib/domain/categories";
import { Item } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/auth/actions";
import { getUserItems } from "@/app/items/actions";
import { ItemCard } from "@/components/items/item-card";
import { ItemListRow } from "@/components/items/item-list-row";
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
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

  const totalProtectedValue = useMemo(() => {
    return enrichedItems.reduce((acc, item) => acc + (item.price || 0), 0);
  }, [enrichedItems]);

  const nextExpiringItem = useMemo(() => {
    const expiring = enrichedItems
      .filter((i) => i.status === "expiring_soon" && i.warranty_expiry_date)
      .sort((a, b) => (a.warranty_expiry_date! > b.warranty_expiry_date! ? 1 : -1));
    return expiring[0] || null;
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
    <div className="min-h-screen bg-[#090b10] text-slate-100 flex flex-col relative selection:bg-slate-700 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#161b26] border border-white/[0.12] text-slate-100 text-sm shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Primary Navigation Bar */}
      <header className="border-b border-white/[0.08] bg-[#090b10]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-white/[0.12] to-white/[0.03] border border-white/[0.15] flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold tracking-tight text-white">
                Owed
              </span>
              <span className="text-xs font-medium text-slate-400 hidden sm:inline">
                Warranty Vault
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              id="upload-receipt-btn"
              onClick={handleOpenUploadModal}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-950 text-xs sm:text-sm font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 shrink-0 text-slate-900" />
              <span>
                Upload<span className="hidden sm:inline"> Receipt</span>
              </span>
            </button>
            <button
              id="add-item-btn"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 text-xs sm:text-sm font-medium border border-white/[0.08] transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>
                Add<span className="hidden sm:inline"> Manually</span>
              </span>
            </button>

            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
                <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-slate-300">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="max-w-[130px] truncate">{user.email}</span>
                </div>
                <form action={signOut}>
                  <button
                    type="submit"
                    title="Sign Out"
                    className="p-2 rounded-lg bg-white/[0.03] hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 border border-white/[0.06] transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 text-xs sm:text-sm font-medium border border-white/[0.08] transition-all active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
        {/* Unauthenticated Demo Notice Banner */}
        {!user && (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 sm:px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
              <span>
                <strong>Demonstration Vault:</strong> Showing sample items. Sign in to safeguard your own equipment with automated expiry reminders.
              </span>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors shrink-0"
            >
              <span>Sign In or Register</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Portfolio Overview Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Total Value Protected */}
          <div className="bg-[#11141c] border border-white/[0.08] rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Protected Portfolio Value
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums tracking-tight">
                  ₹{totalProtectedValue.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">total tracked</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
              <span>{metrics.total} tracked purchase{metrics.total === 1 ? "" : "s"}</span>
              <span className="text-slate-400">{metrics.active} active</span>
            </div>
          </div>

          {/* Card 2: Active Coverage Health */}
          <div className="bg-[#11141c] border border-white/[0.08] rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Coverage Health
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {metrics.total > 0 ? Math.round((metrics.active / metrics.total) * 100) : 0}% covered
                </span>
              </div>

              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                  {metrics.active}
                </span>
                <span className="text-xs text-slate-400">items currently covered</span>
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${metrics.total > 0 ? (metrics.active / metrics.total) * 100 : 0}%` }}
                  className="bg-emerald-400 h-full"
                  title={`${metrics.active} active`}
                />
                <div
                  style={{ width: `${metrics.total > 0 ? (metrics.expiringSoon / metrics.total) * 100 : 0}%` }}
                  className="bg-amber-400 h-full"
                  title={`${metrics.expiringSoon} expiring soon`}
                />
                <div
                  style={{ width: `${metrics.total > 0 ? (metrics.expired / metrics.total) * 100 : 0}%` }}
                  className="bg-slate-600 h-full"
                  title={`${metrics.expired} expired`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {metrics.active} Active
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {metrics.expiringSoon} Expiring
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  {metrics.expired} Expired
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Action Center / Upcoming Expiry */}
          <div className="bg-[#11141c] border border-white/[0.08] rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Deadline Status
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-2xl sm:text-3xl font-bold tabular-nums ${
                  metrics.expiringSoon > 0 ? "text-amber-300" : "text-slate-100"
                }`}>
                  {metrics.expiringSoon > 0 ? `${metrics.expiringSoon} Expiring Soon` : "All Clear"}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
              {nextExpiringItem ? (
                <>
                  <span className="text-slate-300 truncate max-w-[180px]">
                    {nextExpiringItem.product_name}
                  </span>
                  <button
                    onClick={() => handleOpenClaimModal(nextExpiringItem)}
                    className="text-amber-300 hover:text-amber-200 font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Draft Claim</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <span className="text-slate-400">No deadlines in the next 30 days</span>
              )}
            </div>
          </div>
        </section>

        {/* Unified Command & Filter Toolbar */}
        <section className="space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="search-input"
                type="text"
                placeholder="Search products, brands, or retailers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-12 py-2 bg-[#11141c] border border-white/[0.08] focus:border-white/[0.2] rounded-xl text-sm text-slate-200 placeholder-slate-400 focus:outline-none transition-all"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08]">
                /
              </kbd>
            </div>

            {/* Status Segmented Control */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#11141c] border border-white/[0.08] overflow-x-auto">
              {[
                { key: "all", label: "All" },
                { key: "active", label: "Active" },
                { key: "expiring_soon", label: "Expiring Soon" },
                { key: "expired", label: "Expired" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSelectedStatus(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    selectedStatus === key
                      ? "bg-white/[0.1] text-white shadow-sm border border-white/[0.12]"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* View Mode & Actions */}
            <div className="flex items-center gap-2 self-end md:self-auto">
              {/* Category Dropdown */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="appearance-none bg-[#11141c] border border-white/[0.08] text-slate-300 text-xs font-medium pl-3 pr-8 py-2 rounded-xl focus:outline-none cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  {ITEM_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* View Switcher (Grid / List) */}
              <div className="flex items-center p-0.5 rounded-xl bg-[#11141c] border border-white/[0.08]">
                <button
                  onClick={() => setViewMode("grid")}
                  title="Grid card view"
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-white/[0.1] text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  title="Compact list view"
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === "list"
                      ? "bg-white/[0.1] text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Export CSV */}
              <button
                id="export-csv-btn"
                onClick={() => downloadItemsCSV(filteredItems)}
                disabled={filteredItems.length === 0}
                title={filteredItems.length === 0 ? "No items to export" : "Export current view to CSV"}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#11141c] hover:bg-[#161b26] text-slate-300 hover:text-white text-xs font-medium border border-white/[0.08] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </section>

        {/* Items Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Tracked Equipment ({filteredItems.length})
              </h2>
              {isLoadingItems && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                  <span>Syncing...</span>
                </div>
              )}
            </div>

            {selectedCategory !== "All" && (
              <button
                onClick={() => setSelectedCategory("All")}
                className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
              >
                Reset category filter
              </button>
            )}
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.1] p-12 text-center bg-[#11141c]/50">
              <Receipt className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-200">
                {items.length === 0 ? "Your vault is empty" : "No items match your criteria"}
              </h3>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                {items.length === 0
                  ? "Scan a purchase receipt or add an item manually to monitor warranty expiration dates."
                  : "Try clearing filters or adjusting your search keywords."}
              </p>
              {items.length === 0 && (
                <button
                  onClick={handleOpenAddModal}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-950 text-xs font-semibold transition-all shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Item</span>
                </button>
              )}
            </div>
          ) : viewMode === "grid" ? (
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
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <ItemListRow
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

      {/* Manual Entry / Edit Modal */}
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
          showToast("Warranty claim letter drafted!");
        }}
      />

      {/* Professional Footer */}
      <footer className="border-t border-white/[0.06] py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Owed</span>
            <span>&bull;</span>
            <span>Personal Asset & Warranty Protection</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Client-side verification</span>
            <span>&bull;</span>
            <span>Encrypted cloud storage</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

