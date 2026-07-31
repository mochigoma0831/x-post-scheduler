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
      client_id: process.env.X_CLIENT_ID!,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(result));
  }

  await supabaseAdmin
    .from("x_accounts")
    .update({
      access_token: result.access_token,
      refresh_token: result.refresh_token ?? account.refresh_token,
    })
    .eq("id", account.id);

  return result.access_token;
}