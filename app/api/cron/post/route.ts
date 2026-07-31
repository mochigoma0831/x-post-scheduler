import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { refreshAccessToken } from "@/lib/xRefreshToken";

type Image = {
  order?: number;
  url?: string;
  path?: string;
  name?: string;
};

type Thread = {
  order?: number;
  text?: string;
  images?: Image[];
};

async function getDuePost() {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("posts")
    .select("id, title, status, scheduled_at, threads")
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .order("scheduled_at", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  return {
    now,
    post: data,
    error,
  };
}

/**
 * 確認専用
 * Xには投稿しません
 */
export async function GET() {
  const { now, post, error } = await getDuePost();

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
    mode: "preview",
    message: "確認専用です。Xには投稿していません。",
    checkedAt: now,
    count: post ? 1 : 0,
    post,
  });
}

/**
 * 実行専用
 * このPOSTが呼ばれると実際にXへ投稿します
 */
export async function POST() {
  console.log("=== CRON POST ===");
  console.log(new Date().toISOString());

  try {
    const { post, error: postError } = await getDuePost();

    if (postError) {
      return NextResponse.json(
        {
          success: false,
          message: postError.message,
        },
        { status: 500 }
      );
    }

    if (!post) {
      return NextResponse.json({
        success: true,
        message: "投稿対象の予約はありません",
      });
    }

    const threads = Array.isArray(post.threads)
      ? (post.threads as Thread[])
      : [];

      const sortedThreads = [...threads].sort(
  (a, b) => (a.order ?? 0) - (b.order ?? 0)
);

   const firstThread = sortedThreads.find(
  (thread) =>
    typeof thread.text === "string" &&
    thread.text.trim() !== ""
);

    const text = firstThread?.text?.trim();

    if (!text) {
      return NextResponse.json(
        {
          success: false,
          message: "投稿本文が見つかりません",
        },
        { status: 400 }
      );
    }

    const { data: lockedPost, error: lockError } =
      await supabaseAdmin
        .from("posts")
        .update({
          status: "posting",
        })
        .eq("id", post.id)
        .eq("status", "scheduled")
        .select("id")
        .maybeSingle();

    if (lockError || !lockedPost) {
      return NextResponse.json(
        {
          success: false,
          message:
            lockError?.message ??
            "投稿処理を開始できませんでした",
        },
        { status: 409 }
      );
    }

    const accessToken = await refreshAccessToken();

const { TwitterApi } = await import("twitter-api-v2");
const { uploadImageToX } = await import("@/lib/xUploadMedia");

const client = new TwitterApi(accessToken);

let replyToId: string | undefined;
let lastResult: unknown;

for (const thread of sortedThreads) {
  const mediaIds: string[] = [];

  const images = [...(thread.images ?? [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );

  for (const image of images) {
    if (!image.url) continue;

    const mediaId = await uploadImageToX(
      accessToken,
      image.url
    );

    mediaIds.push(mediaId);}
const payload = {
  text: thread.text ?? "",
} as {
  text: string;
  media?: {
    media_ids:
      | [string]
      | [string, string]
      | [string, string, string]
      | [string, string, string, string];
  };
  reply?: {
    in_reply_to_tweet_id: string;
  };
};

if (mediaIds.length > 0) {
  payload.media = {
    media_ids: mediaIds as
      | [string]
      | [string, string]
      | [string, string, string]
      | [string, string, string, string],
  };
}

if (replyToId) {
  payload.reply = {
    in_reply_to_tweet_id: replyToId,
  };
}


const result = await client.v2.tweet(payload);
  replyToId = result.data.id;
  lastResult = result;
}

const xResponse = {
  ok: true,
  status: 200,
};

const xResult = lastResult;
if (!xResponse.ok) {
  await supabaseAdmin
    .from("posts")
    .update({
      status: "scheduled",
    })
    .eq("id", post.id);

  return NextResponse.json(
    {
      success: false,
      message: "Xへの投稿に失敗しました",
      status: xResponse.status,
      error: xResult,
    },
    { status: xResponse.status }
  );
}
    const { error: updateError } =
      await supabaseAdmin
        .from("posts")
        .update({
          status: "posted",
        })
        .eq("id", post.id);

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Xへの投稿は成功しましたが、投稿状態の更新に失敗しました",
          xResult,
          databaseError: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Xへの投稿とステータス更新に成功しました",
      postId: post.id,
      xResult,
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