import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ complaintId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { complaintId } = await params;
    const body = await req.json();
    const res = await fetch(`${FASTAPI_URL}/api/complaints/${complaintId}?owner_id=${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Complaint update proxy error:", error);
    return NextResponse.json({ error: "Failed to update complaint." }, { status: 502 });
  }
}
