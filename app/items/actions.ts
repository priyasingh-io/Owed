"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  itemCreateSchema,
  itemUpdateSchema,
  ItemCreateInput,
  ItemUpdateInput,
} from "@/lib/validation/item";
import { calculateWarrantyExpiryDate, getItemStatus } from "@/lib/domain/warranty";
import { getDefaultWarrantyMonths } from "@/lib/domain/categories";
import { Item } from "@/lib/types/database";

export interface ItemActionResult<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Create a new tracked item for the authenticated user.
 */
export async function createItem(
  input: ItemCreateInput
): Promise<ItemActionResult<Item>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to add an item." };
  }

  const validation = itemCreateSchema.safeParse(input);
  if (!validation.success) {
    return {
      error: validation.error.errors[0]?.message || "Validation failed",
    };
  }

  const validated = validation.data;

  // Determine warranty duration & expiry date if purchase_date is present
  let warrantyMonths = validated.warranty_months;
  let warrantyExpiryDate = validated.warranty_expiry_date;

  if (!warrantyExpiryDate && validated.purchase_date) {
    if (!warrantyMonths) {
      warrantyMonths = getDefaultWarrantyMonths(validated.category);
    }
    warrantyExpiryDate = calculateWarrantyExpiryDate(
      validated.purchase_date,
      warrantyMonths
    );
  }

  const status = validated.status ?? getItemStatus(warrantyExpiryDate ?? null);

  const { data: createdItem, error } = await supabase
    .from("items")
    .insert({
      user_id: user.id,
      product_name: validated.product_name,
      brand: validated.brand ?? null,
      category: validated.category ?? null,
      seller: validated.seller ?? null,
      purchase_date: validated.purchase_date ?? null,
      price: validated.price ?? null,
      currency: validated.currency ?? "INR",
      warranty_months: warrantyMonths ?? null,
      warranty_expiry_date: warrantyExpiryDate ?? null,
      receipt_file_url: validated.receipt_file_url ?? null,
      extraction_confidence: validated.extraction_confidence ?? null,
      status,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, data: createdItem };
}

/**
 * Fetch all items belonging to the currently authenticated user.
 */
export async function getUserItems(): Promise<ItemActionResult<Item[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to view items." };
  }

  const { data: items, error } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { success: true, data: items ?? [] };
}

/**
 * Update an existing item owned by the authenticated user.
 */
export async function updateItem(
  id: string,
  input: ItemUpdateInput
): Promise<ItemActionResult<Item>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to update an item." };
  }

  const validation = itemUpdateSchema.safeParse(input);
  if (!validation.success) {
    return {
      error: validation.error.errors[0]?.message || "Validation failed",
    };
  }

  const validated = validation.data;
  const updates: Record<string, unknown> = { ...validated };

  // Recalculate expiry date if purchase_date or warranty_months changed without explicit expiry date
  if (
    validated.purchase_date &&
    validated.warranty_months &&
    !validated.warranty_expiry_date
  ) {
    updates.warranty_expiry_date = calculateWarrantyExpiryDate(
      validated.purchase_date,
      validated.warranty_months
    );
  }

  if (updates.warranty_expiry_date !== undefined) {
    updates.status =
      validated.status ??
      getItemStatus((updates.warranty_expiry_date as string | null) ?? null);
  }

  updates.updated_at = new Date().toISOString();

  const { data: updatedItem, error } = await supabase
    .from("items")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, data: updatedItem };
}

/**
 * Delete an item owned by the authenticated user.
 */
export async function deleteItem(id: string): Promise<ItemActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to delete an item." };
  }

  const { error } = await supabase
    .from("items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Archive an item (sets status to 'archived').
 */
export async function archiveItem(id: string): Promise<ItemActionResult<Item>> {
  return updateItem(id, { status: "archived" });
}
