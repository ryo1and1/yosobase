import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "旧会員登録APIは廃止されました。/signup ページから会員登録してください。"
    },
    { status: 410 }
  );
}
