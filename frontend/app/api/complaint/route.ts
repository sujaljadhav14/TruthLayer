import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reportId = req.nextUrl.searchParams.get("reportId");
    const query = new URLSearchParams({ owner_id: userId });
    if (reportId) query.set("report_id", reportId);

    const res = await fetch(`${FASTAPI_URL}/api/complaints?${query.toString()}`, {
      method: "GET",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Complaint history proxy error:", error);
    return NextResponse.json({ error: "Failed to load complaints." }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const body = await req.json();
    const payload = {
      ...body,
      owner: {
        user_id: userId,
        name: user?.fullName ?? user?.firstName ?? "User",
        email: user?.primaryEmailAddress?.emailAddress ?? null,
      },
    };

    const res = await fetch(`${FASTAPI_URL}/api/complaints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Complaint create proxy error:", error);
    return NextResponse.json({ error: "Failed to create complaint." }, { status: 502 });
  }
}
