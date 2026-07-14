import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Cron APIが正常に動いています",
    executedAt: new Date().toISOString(),
  });
}