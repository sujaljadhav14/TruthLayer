import { NextRequest, NextResponse } from "next/server";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const response = await fetch(`${FASTAPI_URL}/api/heatmap`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.detail || "Heatmap generation failed" },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Heatmap proxy error:", error);
    return NextResponse.json(
      { error: "Failed to connect to heatmap server." },
      { status: 502 }
    );
  }
}
