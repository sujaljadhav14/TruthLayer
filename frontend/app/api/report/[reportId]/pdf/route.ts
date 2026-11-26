import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8001";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reportId } = await params;
    const res = await fetch(
      `${FASTAPI_URL}/api/reports/${reportId}/pdf?owner_id=${encodeURIComponent(userId)}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    }

    const pdfBytes = await res.arrayBuffer();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const filename = disposition.match(/filename="(.+?)"/)?.[1] ?? "truthlayer_report.pdf";

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Saved PDF proxy error:", error);
    return NextResponse.json(
      { error: "Failed to load saved PDF." },
      { status: 502 }
    );
  }
}
