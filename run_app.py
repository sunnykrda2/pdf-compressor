"""
Unified Full-Stack Launcher for CompressPDF Pro
Runs FastAPI Backend (port 8000) and Vite Frontend (port 5173).
"""

import subprocess
import sys
import os
import time
import webbrowser

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    print("==================================================")
    print("🚀 Starting CompressPDF Pro Full-Stack Application")
    print("==================================================")
    print(f"Backend directory:  {backend_dir}")
    print(f"Frontend directory: {frontend_dir}")
    print("\n1. Starting FastAPI Backend (http://127.0.0.1:8000)...")

    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
        cwd=backend_dir
    )

    time.sleep(2)

    print("2. Starting Vite React Frontend (http://localhost:5173)...")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=frontend_dir
    )

    print("\n✅ Both servers are running!")
    print("👉 Frontend: http://localhost:5173")
    print("👉 Backend API: http://127.0.0.1:8000/docs")
    print("Press Ctrl+C to terminate both servers.\n")

    try:
        backend_proc.wait()
    except KeyboardInterrupt:
        print("\nShutting down servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("Shutdown complete.")

if __name__ == "__main__":
    main()
