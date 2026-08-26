import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await sql`select 1`;

    return NextResponse.json(
      { status: "ok", database: "connected" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Health check failed", error);
    }

    return NextResponse.json(
      { status: "degraded", database: "disconnected" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
