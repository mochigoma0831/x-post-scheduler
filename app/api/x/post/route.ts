import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data: account, error: accountError } =
    await supabaseAdmin
      .from("x_accounts")
      .select("access_token")
      .limit(1)
      .single();

  if (accountError || !account) {
    return NextResponse.json(
      {
        success: false,
        message:
          accountError?.message ??
          "Xアカウントが見つかりません",
      },
      { status: 500 }
    );
  }

  const xResponse = await fetch(
    "https://api.x.com/2/tweets",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: "SNS投稿予約ツールからのテスト投稿です",
      }),
    }
  );

  const result = await xResponse.json();

  if (!xResponse.ok) {
    return NextResponse.json(
      {
        success: false,
        status: xResponse.status,
        error: result,
      },
      { status: xResponse.status }
    );
  }

  return NextResponse.json({
    success: true,
    result,
  });
}