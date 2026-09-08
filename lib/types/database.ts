// Database types for Owed (matching Supabase schema)

export type ItemStatus = "active" | "expiring_soon" | "expired" | "archived";
export type ClaimStatus = "draft" | "sent" | "resolved";

export interface Profile {
  id: string; // references auth.users(id)
  email: string;
  reminder_lead_days: number[];
  created_at: string;
}

export interface Item {
  id: string;
  user_id: string;
  product_name: string;
  brand: string | null;
  category: string | null;
  seller: string | null;
  purchase_date: string | null; // ISO YYYY-MM-DD
  price: number | null;
  currency: string;
  warranty_months: number | null;
  warranty_expiry_date: string | null; // ISO YYYY-MM-DD
  receipt_file_url: string | null;
  extraction_confidence: number | null;
  status: ItemStatus;
  created_at: string;
  updated_at: string;
}

export interface Claim {
  id: string;
  item_id: string;
  issue_description: string;
  draft_text: string | null;
  status: ClaimStatus;
  created_at: string;
}

export interface Reminder {
  id: string;
  item_id: string;
  remind_at: string; // ISO YYYY-MM-DD
  sent: boolean;
  created_at: string;
}

export type ItemInsert = Omit<Item, "id" | "created_at" | "updated_at">;
export type ItemUpdate = Partial<ItemInsert>;
