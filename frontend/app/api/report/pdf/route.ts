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
  const res = await fetch(`${FASTAPI_URL}/api/report/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: err.detail || "PDF failed" }, { status: res.status });
  }

  const pdfBytes = await res.arrayBuffer();
  const cert = res.headers.get("Content-Disposition") ?? "";
  const filename = cert.match(/filename="(.+?)"/)?.[1] ?? "truthlayer_report.pdf";

  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
