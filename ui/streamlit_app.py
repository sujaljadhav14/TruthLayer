import streamlit as st
import json
import os
from pathlib import Path
from datetime import datetime

QUEUE_DIR = Path("data/queue")
REVIEWED_DIR = Path("data/reviewed")
QUEUE_DIR.mkdir(parents=True, exist_ok=True)
REVIEWED_DIR.mkdir(parents=True, exist_ok=True)

st.title("Reviewer — Uncertain Queue")

def list_queue():
    return sorted([p for p in QUEUE_DIR.glob("*.json")])

files = list_queue()
if not files:
    st.info("Queue is empty. Drop inference JSON files into data/queue/")
else:
    sel = st.selectbox("Select item to review", [f.name for f in files])
    path = QUEUE_DIR / sel
    with path.open("r", encoding="utf-8") as f:
        item = json.load(f)
    st.header(item.get("media_name", sel))
    st.write("Verdict:", item.get("verdict"))
    st.write("Confidence:", item.get("confidence"))
    st.subheader("Evidence")
    for ev in item.get("evidence", []):
        ts = ev.get("timestamp", "")
        st.write(f"- {ev.get('type','')}: {ev.get('desc','')} (ts: {ts})")
    st.subheader("Playback / Link")
    if item.get("media_path"):
        st.write(item["media_path"])
    st.subheader("Reviewer Action")
    label = st.radio("Final label", ("real", "fake", "uncertain"), index=2)
    notes = st.text_area("Notes", "")
    if st.button("Save review"):
        out = {
            "media_name": item.get("media_name", sel),
            "reviewed_at": datetime.utcnow().isoformat()+"Z",
            "final_label": label,
            "notes": notes,
            "original": item
        }
        out_path = REVIEWED_DIR / (sel.replace(".json","") + f".reviewed.json")
        with out_path.open("w", encoding="utf-8") as f:
            json.dump(out, f, indent=2)
        path.unlink()
        st.success("Saved review and removed from queue.")
        st.experimental_rerun()
