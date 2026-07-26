import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function refreshAccessToken() {
  const { data: account, error } = await supabaseAdmin
    .from("x_accounts")
    .select("id, refresh_token")
    .limit(1)
    .single();

  if (error || !account) {
    throw new Error("Xアカウントが見つかりません");
  }

  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });

  const result = await response.json();

  return result;
}