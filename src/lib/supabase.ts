import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

const supabaseUrl = `https://${projectId}.supabase.co`;

// User app client — session stored under a separate key so it never shares auth state with the admin client
export const supabase = createClient(supabaseUrl, publicAnonKey, {
  auth: { storageKey: "sb-user-session" },
});

// Admin app client — isolated session storage
export const supabaseAdmin = createClient(supabaseUrl, publicAnonKey, {
  auth: { storageKey: "sb-admin-session" },
});
