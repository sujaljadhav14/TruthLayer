import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8001";

export async function POST(req: NextRequest) {
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

  const res = await fetch(`${FASTAPI_URL}/api/report/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
