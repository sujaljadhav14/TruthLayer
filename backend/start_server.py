"""Launch main.py as a detached background process on Windows."""
import subprocess
import sys
from pathlib import Path

backend_dir = Path(__file__).parent
python = backend_dir / "venv" / "Scripts" / "python.exe"
main_py = backend_dir / "main.py"
log_file = backend_dir / "backend.log"

with open(log_file, "w") as log:
    proc = subprocess.Popen(
        [str(python), str(main_py)],
        stdout=log,
        stderr=subprocess.STDOUT,
        cwd=str(backend_dir),
        creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NO_WINDOW,
    )
    print(f"Backend started — PID {proc.pid}, logging to {log_file}")
