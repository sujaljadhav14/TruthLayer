"""Launch Next.js dev server as a detached background process on Windows."""
import subprocess
import sys
from pathlib import Path

frontend_dir = Path(__file__).parent
log_file = frontend_dir / "frontend.log"

with open(log_file, "w") as log:
    proc = subprocess.Popen(
        ["npm", "run", "dev"],
        stdout=log,
        stderr=subprocess.STDOUT,
        cwd=str(frontend_dir),
        creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NO_WINDOW,
        shell=True,
    )
    print(f"Frontend started — PID {proc.pid}, logging to {log_file}")
