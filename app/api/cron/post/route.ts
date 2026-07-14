import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("posts")
    .select("id, title, status, scheduled_at")
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .order("scheduled_at", {
      ascending: true,
    });

  if (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    success: true,
    checkedAt: now,
    count: data.length,
    posts: data,
  });
}