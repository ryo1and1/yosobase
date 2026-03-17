import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "旧ログインAPIは廃止されました。/login ページからログインしてください。"
    },
    { status: 410 }
  );
}
