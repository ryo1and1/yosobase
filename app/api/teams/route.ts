import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const revalidate = 3600;

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.from("teams").select("id, name").order("id", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { teams: data ?? [] },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400"
        }
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "球団一覧の取得に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
