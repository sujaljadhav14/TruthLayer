import { NextRequest, NextResponse } from "next/server";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${FASTAPI_URL}/api/report/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: err.detail || "PDF failed" }, { status: res.status });
  }

  const pdfBytes = await res.arrayBuffer();
  const cert = res.headers.get("Content-Disposition") ?? "";
  const filename = cert.match(/filename="(.+?)"/)?.[1] ?? "truthlens_report.pdf";

  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
