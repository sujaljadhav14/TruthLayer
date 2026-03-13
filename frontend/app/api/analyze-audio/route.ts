import { NextRequest, NextResponse } from "next/server";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8001";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Forward the audio file to the unified backend
    const backendForm = new FormData();
    backendForm.append("file", file);

    const response = await fetch(`${FASTAPI_URL}/analyze-audio`, {
      method: "POST",
      body: backendForm,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || "Audio analysis failed" },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Audio analysis proxy error:", error);
    return NextResponse.json(
      { error: "Failed to connect to analysis server. Make sure the Python server is running on port 8001." },
      { status: 502 }
    );
  }
}
