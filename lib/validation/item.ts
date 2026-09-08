import { z } from "zod";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const itemCreateSchema = z.object({
  product_name: z.string().trim().min(1, "Product name is required"),
  brand: z.string().trim().nullable().optional(),
  category: z.string().trim().nullable().optional(),
  seller: z.string().trim().nullable().optional(),
  purchase_date: z
    .string()
    .regex(ISO_DATE_REGEX, "Purchase date must be formatted as YYYY-MM-DD")
    .nullable()
    .optional(),
  price: z.number().positive("Price must be greater than 0").nullable().optional(),
  currency: z.string().trim().default("INR"),
  warranty_months: z
    .number()
    .int("Warranty months must be an integer")
    .positive("Warranty months must be positive")
    .nullable()
    .optional(),
  warranty_expiry_date: z
    .string()
    .regex(ISO_DATE_REGEX, "Warranty expiry date must be formatted as YYYY-MM-DD")
    .nullable()
    .optional(),
  receipt_file_url: z.string().url().nullable().optional().or(z.string().nullable().optional()),
  extraction_confidence: z.number().min(0).max(1).nullable().optional(),
  status: z.enum(["active", "expiring_soon", "expired", "archived"]).optional(),
});

export const itemUpdateSchema = itemCreateSchema.partial();

export type ItemCreateInput = z.input<typeof itemCreateSchema>;
export type ItemUpdateInput = z.input<typeof itemUpdateSchema>;
