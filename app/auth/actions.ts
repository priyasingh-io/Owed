"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema, otpSchema } from "@/lib/validation/auth";

export interface AuthActionResult {
  success?: boolean;
  error?: string;
  message?: string;
}

/**
 * Sign in existing user with email and password.
 */
export async function signInWithPassword(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const validation = signInSchema.safeParse({ email, password });
  if (!validation.success) {
    return {
      error: validation.error.errors[0]?.message || "Invalid email or password",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: validation.data.email,
    password: validation.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Register a new user with email and password.
 */
export async function signUpWithPassword(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  const validation = signUpSchema.safeParse({ email, password, confirmPassword });
  if (!validation.success) {
    return {
      error: validation.error.errors[0]?.message || "Validation failed",
    };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email: validation.data.email,
    password: validation.data.password,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is disabled or session is immediately active
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/");
  }

  return {
    success: true,
    message: "Registration successful! Please check your email to confirm your account.",
  };
}

/**
 * Send passwordless Magic Link / OTP.
 */
export async function signInWithOtp(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email") as string;

  const validation = otpSchema.safeParse({ email });
  if (!validation.success) {
    return {
      error: validation.error.errors[0]?.message || "Invalid email address",
    };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email: validation.data.email,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: true,
    message: "Magic link sent! Check your inbox to sign in.",
  };
}

/**
 * Sign out current authenticated user.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Retrieves the currently authenticated user server-side.
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
