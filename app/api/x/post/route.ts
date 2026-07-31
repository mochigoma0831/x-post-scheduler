import { NextResponse } from "next/server";

import { refreshAccessToken } from "@/lib/xRefreshToken";

export async function GET() {
  try {
    const accessToken = await refreshAccessToken();

    const xResponse = await fetch("https://api.x.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: "SNS投稿予約ツールからのテスト投稿です",
      }),
    });

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
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "予期しないエラーが発生しました",
      },
      { status: 500 }
    );
  }
}