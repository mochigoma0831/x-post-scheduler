import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("x_accounts")
    .select(
      "user_id, x_user_id, access_token, refresh_token"
    )
    .limit(1)
    .single();

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    success: true,
    account: {
      userId: data.user_id,
      xUserId: data.x_user_id,
      hasAccessToken: Boolean(
        data.access_token
      ),
      hasRefreshToken: Boolean(
        data.refresh_token
      ),
    },
  });
}