import { NextRequest, NextResponse } from "next/server";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;
    const res = await fetch(`${FASTAPI_URL}/api/reports/${reportId}`, {
      method: "GET",
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Report detail proxy error:", error);
    return NextResponse.json(
      { error: "Failed to load report details." },
      { status: 502 }
    );
  }
}
