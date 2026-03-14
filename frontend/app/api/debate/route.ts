import { NextRequest, NextResponse } from "next/server";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8001";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await fetch(`${FASTAPI_URL}/api/debate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || "Debate failed" },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Debate proxy error:", error);
    return NextResponse.json(
      {
        error:
          "Failed to connect to debate server. Make sure the Python server is running.",
      },
      { status: 502 }
    );
  }
}
