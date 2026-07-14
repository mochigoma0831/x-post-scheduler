import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "X投稿API(GET)へ到達しました",
  });
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "X投稿API(POST)へ到達しました",
  });
}