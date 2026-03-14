import { NextResponse } from "next/server";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

export async function GET() {
  try {
    const res = await fetch(`${FASTAPI_URL}/api/reports`, {
      method: "GET",
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Report history proxy error:", error);
    return NextResponse.json(
      { error: "Failed to load report history." },
      { status: 502 }
    );
  }
}
