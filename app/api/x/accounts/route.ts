import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(
  request: NextRequest
) {
  try {
    const authorization =
      request.headers.get("authorization");

    const supabaseAccessToken =
      authorization?.replace("Bearer ", "");

    if (!supabaseAccessToken) {
      return NextResponse.json(
        {
          success: false,
          message:
            "ログイン情報がありません",
        },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        supabaseAccessToken
      );

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "ログイン情報を確認できませんでした",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      xUserId,
      accessToken,
      refreshToken,
      expiresAt,
    } = body;

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Xのアクセストークンがありません",
        },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("x_accounts")
      .upsert(
        {
          user_id: user.id,
          x_user_id: xUserId ?? null,
          access_token: accessToken,
          refresh_token:
            refreshToken ?? null,
          expires_at: expiresAt ?? null,
        },
        {
          onConflict: "user_id",
        }
      );

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "不明なエラーが発生しました",
      },
      { status: 500 }
    );
  }
}