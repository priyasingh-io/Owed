import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createClient } from "@/lib/supabase/client";

describe("Supabase Browser Client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("instantiates Supabase browser client with configured env variables", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://oiaworeryovnbpawvqwk.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_key";

    const supabase = createClient();
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
  });
});
