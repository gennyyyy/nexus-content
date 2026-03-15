import subprocess
import sys
from pathlib import Path


def main() -> int:
    backend_dir = Path(__file__).resolve().parent
    commands = [
        [sys.executable, "-m", "unittest", "discover", "-s", "tests"],
        [sys.executable, "-m", "alembic", "upgrade", "head"],
    ]

    for command in commands:
        result = subprocess.run(command, cwd=backend_dir)
        if result.returncode != 0:
            return result.returncode

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
