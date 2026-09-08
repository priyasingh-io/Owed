"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  Receipt,
  Plus,
  UploadCloud,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { getItemStatus } from "@/lib/domain/warranty";
import { ITEM_CATEGORIES } from "@/lib/domain/categories";
import { ItemStatus } from "@/lib/types/database";

interface DisplayItem {
  id: string;
  product_name: string;
  brand: string;
  category: string;
  seller: string;
  purchase_date: string;
  price: number;
  currency: string;
  warranty_months: number;
  warranty_expiry_date: string;
  receipt_file_url?: string;
  extraction_confidence?: number;
}

const INITIAL_ITEMS: DisplayItem[] = [
  {
    id: "item-1",
    product_name: "MacBook Pro 16\" M3 Max",
    brand: "Apple",
    category: "Electronics",
    seller: "Apple Store BKC",
    purchase_date: "2024-03-15",
    price: 349900,
    currency: "INR",
    warranty_months: 12,
    warranty_expiry_date: "2025-03-15",
    extraction_confidence: 0.98,
  },
  {
    id: "item-2",
    product_name: "Sony WH-1000XM5 Wireless Headphones",
    brand: "Sony",
    category: "Electronics",
    seller: "Amazon India",
    purchase_date: "2025-10-10",
    price: 29990,
    currency: "INR",
    warranty_months: 12,
    warranty_expiry_date: "2026-10-01",
    extraction_confidence: 0.95,
  },
  {
    id: "item-3",
    product_name: "Samsung French Door Refrigerator",
    brand: "Samsung",
    category: "Appliances",
    seller: "Croma Retail",
    purchase_date: "2024-09-20",
    price: 84500,
    currency: "INR",
    warranty_months: 24,
    warranty_expiry_date: "2026-09-20",
    extraction_confidence: 0.92,
  },
  {
    id: "item-4",
    product_name: "Keychron Q1 Pro Mechanical Keyboard",
    brand: "Keychron",
    category: "Electronics",
    seller: "Meckeys",
    purchase_date: "2023-01-10",
    price: 18500,
    currency: "INR",
    warranty_months: 12,
    warranty_expiry_date: "2024-01-10",
    extraction_confidence: 0.99,
  },
];

export default function DashboardPage() {
  const [items] = useState<DisplayItem[]>(INITIAL_ITEMS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const today = "2026-09-08";

  const enrichedItems = useMemo(() => {
    return items.map((item) => {
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
        item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.seller.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "All" || item.category.toLowerCase() === selectedCategory.toLowerCase();

      const matchesStatus =
        selectedStatus === "all" || item.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [enrichedItems, searchQuery, selectedCategory, selectedStatus]);

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
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-[#0d1322]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
                Owed
              </span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                ClaimIt MVP
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="upload-receipt-btn"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-md shadow-blue-600/30 active:scale-95"
            >
              <UploadCloud className="w-4 h-4" />
              Upload Receipt
            </button>
            <button
              id="add-item-btn"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add Manually
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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
              Upload any invoice or receipt. Owed extracts warranty windows, reminds you before coverage expires, and drafts claim emails instantly when products fail.
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
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-all whitespace-nowrap ${
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
              className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
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
                className={`px-3 py-1 text-xs rounded-full font-medium transition-all whitespace-nowrap ${
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Tracked Purchases ({filteredItems.length})</h2>
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center bg-[#0d1322]">
              <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-base font-semibold text-slate-300">No items match your criteria</h3>
              <p className="mt-1 text-sm text-slate-500">Try adjusting your search or category filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#111726] border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
                            {item.brand}
                          </span>
                          <span className="text-slate-600">&bull;</span>
                          <span className="text-xs text-slate-400">{item.category}</span>
                        </div>
                        <h3 className="mt-1 text-base font-semibold text-white group-hover:text-blue-300 transition-colors">
                          {item.product_name}
                        </h3>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/60 text-slate-400">
                      <div>
                        <span className="text-slate-500">Purchased:</span>{" "}
                        <span className="text-slate-300">{item.purchase_date}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Expires:</span>{" "}
                        <span className="text-slate-300 font-medium">{item.warranty_expiry_date}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Seller:</span>{" "}
                        <span className="text-slate-300">{item.seller}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Price:</span>{" "}
                        <span className="text-slate-300 font-medium">
                          {item.currency} {item.price.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {item.warranty_months} mo coverage
                    </span>
                    <div className="flex items-center gap-2">
                      <button className="text-xs px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors">
                        <FileText className="w-3 h-3" />
                        Draft Claim
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

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
