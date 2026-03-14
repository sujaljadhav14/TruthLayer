import { NextRequest, NextResponse } from "next/server";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8001";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    const { shareToken } = await params;
    const res = await fetch(`${FASTAPI_URL}/api/reports/share/${shareToken}/pdf`, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    }

    const pdfBytes = await res.arrayBuffer();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const filename = disposition.match(/filename="(.+?)"/)?.[1] ?? "truthlens_shared_report.pdf";

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Shared report PDF proxy error:", error);
    return NextResponse.json({ error: "Failed to load shared PDF." }, { status: 502 });
  }
}
