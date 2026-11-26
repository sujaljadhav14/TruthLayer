"""
Forensic PDF report generator using fpdf2.
Creates an evidence-focused report with verdict, model findings, heatmap summary, and certificate.
"""

import io
import tempfile

import qrcode

try:
    from fpdf import FPDF, XPos, YPos

    FPDF_AVAILABLE = True
except ImportError:
    FPDF_AVAILABLE = False


def _pdf_safe(value: object) -> str:
    """Convert text to Latin-1-safe content for built-in PDF fonts."""
    text = str(value)
    replacements = {
        "\u2014": "-",
        "\u2013": "-",
        "\u2022": "*",
        "\u2026": "...",
        "\u2713": "OK",
        "\u2714": "OK",
        "\u26a0": "WARNING",
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    return text.encode("latin-1", "replace").decode("latin-1")


def _make_qr(data: str) -> bytes:
    """Generate a QR code PNG as bytes."""
    qr = qrcode.QRCode(version=1, box_size=4, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _format_mmss(ms: int) -> str:
    total_seconds = max(0, ms // 1000)
    minutes = total_seconds // 60
    seconds = total_seconds % 60
    return f"{minutes}:{seconds:02d}"


def _video_findings(analysis_data: dict, heatmap_data: dict | None) -> list[str]:
    findings: list[str] = []
    scores = analysis_data.get("scores", [])
    if scores:
        ordered = sorted(scores, key=lambda item: float(item.get("score", 0)), reverse=True)
        findings.append(
            "Model score distribution: "
            + ", ".join(f"{item.get('label', 'UNKNOWN')} {float(item.get('score', 0)) * 100:.1f}%" for item in ordered)
        )

    if heatmap_data:
        suspicious = int(heatmap_data.get("suspicious_frame_count", 0))
        total = int(heatmap_data.get("total_frames_analyzed", 0))
        findings.append(f"Frame heatmap flagged {suspicious} suspicious frames out of {total} sampled frames.")
        timeline = heatmap_data.get("timeline", [])
        suspicious_entries = [entry for entry in timeline if entry.get("is_suspicious")]
        if suspicious_entries:
            top_entries = sorted(suspicious_entries, key=lambda entry: float(entry.get("fake_score", 0)), reverse=True)[:3]
            findings.append(
                "Highest-risk timestamps: "
                + ", ".join(
                    f"{_format_mmss(int(entry.get('timestamp_ms', 0)))} ({float(entry.get('fake_score', 0)) * 100:.1f}% fake)"
                    for entry in top_entries
                )
            )

    return findings


def _audio_findings(audio_data: dict) -> list[str]:
    findings = [
        f"Audio probability split: authentic {float(audio_data.get('real_prob', 0)) * 100:.1f}%, synthetic {float(audio_data.get('fake_prob', 0)) * 100:.1f}%.",
        f"Speech activity covered {audio_data.get('vad', {}).get('segments', 0)} segments with {float(audio_data.get('vad', {}).get('speech_ratio', 0)) * 100:.1f}% speech ratio.",
        f"Speaker similarity measured {float(audio_data.get('speaker_verification', {}).get('similarity', 0)) * 100:.1f}% and MFCC regularity measured {float(audio_data.get('mfcc', {}).get('regularity_score', 0)) * 100:.1f}%.",
    ]
    source_tool = audio_data.get("source_tool")
    if source_tool:
        findings.append(f"Most likely source classification: {source_tool}.")
    warning = audio_data.get("warning")
    if warning:
        findings.append(str(warning))
    return findings


def generate_pdf_report(
    analysis_data: dict,
    certificate: dict,
    audio_data: dict | None = None,
    heatmap_data: dict | None = None,
) -> bytes:
    """
    Generate a professional forensic PDF report.

    Returns raw PDF bytes.
    """
    if not FPDF_AVAILABLE:
        raise RuntimeError("fpdf2 not installed. Run: pip install fpdf2")

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    RED = (220, 53, 69)
    GREEN = (40, 167, 69)
    DARK = (30, 30, 30)
    AMBER = (214, 140, 0)
    GRAY = (100, 100, 100)
    LIGHT = (245, 245, 245)

    verdict = analysis_data.get("verdict", "UNKNOWN")
    is_fake = verdict == "FAKE"
    is_real = verdict == "REAL"
    verdict_color = RED if is_fake else GREEN if is_real else AMBER

    pdf.set_fill_color(*DARK)
    pdf.rect(0, 0, 210, 35, style="F")
    pdf.set_y(8)
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 10, "TRUTHLAYER FORENSIC REPORT", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(180, 180, 180)
    pdf.cell(0, 6, "AI-Powered Media Authenticity Analysis | Hackverse 2026", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_y(40)
    pdf.set_fill_color(*verdict_color)
    pdf.rect(10, 40, 190, 18, style="F")
    pdf.set_y(43)
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(255, 255, 255)
    if is_fake:
        label = "WARNING: DEEPFAKE / MANIPULATION DETECTED"
    elif is_real:
        label = "NO MANIPULATION DETECTED"
    else:
        label = "INCONCLUSIVE - TREAT WITH CAUTION"
    pdf.cell(0, 10, label, align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_y(65)
    pdf.set_text_color(*DARK)

    def section_title(title: str):
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(*DARK)
        pdf.set_fill_color(*LIGHT)
        pdf.cell(0, 8, f"  {_pdf_safe(title)}", fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.ln(2)

    def kv(key: str, value: object, highlight: bool = False):
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(*GRAY)
        pdf.cell(55, 6, _pdf_safe(key) + ":", new_x=XPos.RIGHT, new_y=YPos.TOP)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*(verdict_color if highlight else DARK))
        pdf.multi_cell(0, 6, _pdf_safe(value), new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    section_title("ANALYSIS SUMMARY")
    kv("File", analysis_data.get("filename", "unknown"))
    kv("Analysis Date", certificate["issued_at"][:19].replace("T", " ") + " UTC")
    kv("Certificate ID", certificate["certificate_id"])
    kv("ML Verdict", f"{verdict} ({analysis_data.get('confidence', 0):.1f}% confidence)", highlight=True)
    kv("Truth Score", f"{analysis_data.get('truth_score', 50)} / 100")
    kv("Summary", certificate.get("summary", "N/A"))

    scores = analysis_data.get("scores", [])
    if scores:
        pdf.ln(2)
        section_title("ML MODEL SCORES")
        for score in scores:
            bar_pct = float(score["score"])
            label_str = str(score["label"])
            score_str = f"{bar_pct * 100:.2f}%"
            kv(label_str, score_str, highlight=(label_str == verdict))
            bar_y = pdf.get_y()
            bar_w = 130
            pdf.set_fill_color(230, 230, 230)
            pdf.rect(65, bar_y, bar_w, 3, style="F")
            fill_color = RED if label_str == "FAKE" else GREEN
            pdf.set_fill_color(*fill_color)
            pdf.rect(65, bar_y, bar_w * bar_pct, 3, style="F")
            pdf.ln(5)

    findings = _audio_findings(audio_data) if audio_data else _video_findings(analysis_data, heatmap_data)
    if findings:
        pdf.ln(2)
        section_title("EVIDENCE FINDINGS")
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*DARK)
        for item in findings:
            pdf.multi_cell(0, 6, _pdf_safe(f"* {item}"), new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    if audio_data:
        pdf.ln(2)
        section_title("AUDIO ANALYSIS")
        kv("Audio Verdict", audio_data.get("verdict", "N/A"), highlight=True)
        if "confidence" in audio_data:
            kv("Confidence", f"{audio_data.get('confidence', 0):.1f}%")
        if audio_data.get("source_tool"):
            kv("Detected Tool", audio_data.get("source_tool"))
    elif heatmap_data:
        pdf.ln(2)
        section_title("HEATMAP REVIEW")
        kv("Frames Analyzed", heatmap_data.get("total_frames_analyzed", 0))
        kv("Suspicious Frames", heatmap_data.get("suspicious_frame_count", 0))
        kv("Duration", f"{int(heatmap_data.get('duration_ms', 0)) / 1000:.1f} seconds")

    pdf.ln(4)
    section_title("DIGITAL CERTIFICATE")

    try:
        qr_data = f"TRUTHLAYER:{certificate['certificate_id']}:{certificate['file_hash'][:16]}"
        qr_bytes = _make_qr(qr_data)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
            tmp.write(qr_bytes)
            qr_path = tmp.name
        pdf.image(qr_path, x=160, y=pdf.get_y(), w=30, h=30)
    except Exception:
        qr_path = None
    else:
        try:
            import os

            os.unlink(qr_path)
        except OSError:
            pass

    kv("Certificate ID", certificate["certificate_id"])
    kv("Algorithm", certificate.get("algorithm", "Ed25519"))
    kv("File Hash", certificate["file_hash"][:32] + "...")
    kv("Signature", certificate["signature"][:32] + "...")
    kv("Issuer", certificate.get("issuer", "TruthLayer"))

    pdf.set_y(-20)
    pdf.set_font("Helvetica", "I", 7)
    pdf.set_text_color(*GRAY)
    pdf.cell(
        0,
        5,
        "This report is generated by TruthLayer AI Forensic System. The Ed25519 digital signature ensures tamper-evident integrity.",
        align="C",
        new_x=XPos.LMARGIN,
        new_y=YPos.NEXT,
    )

    return bytes(pdf.output())
