import { NextRequest, NextResponse } from "next/server";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Forward the file to FastAPI
    const backendForm = new FormData();
    backendForm.append("file", file);

    const response = await fetch(`${FASTAPI_URL}/analyze`, {
      method: "POST",
      body: backendForm,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || "Analysis failed" },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Analysis proxy error:", error);
    return NextResponse.json(
      { error: "Failed to connect to analysis server. Make sure the Python server is running." },
      { status: 502 }
    );
  }
}
