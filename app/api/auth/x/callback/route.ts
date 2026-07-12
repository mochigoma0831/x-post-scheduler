import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Xから戻ってくる場所を作成できました",
  });
}