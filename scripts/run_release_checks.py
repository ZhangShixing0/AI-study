from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def run(command: list[str], env: dict[str, str]) -> None:
    print(f"$ {' '.join(command)}", flush=True)
    subprocess.run(command, cwd=ROOT, env=env, check=True)


def node_tests() -> list[str]:
    paths: list[Path] = []
    for directory in ("prototypes", "standalone", "scripts"):
        root = ROOT / directory
        if not root.exists():
            continue
        paths.extend(root.rglob("*.test.js"))
        paths.extend(root.rglob("*.test.mjs"))
    return [str(path.relative_to(ROOT)) for path in sorted(set(paths))]


def main() -> int:
    node = shutil.which("node")
    if not node:
        raise SystemExit("Node.js is required for release checks.")

    env = os.environ.copy()
    env["PYTHON_BIN"] = sys.executable
    env["PUBLIC_SEED_XLSX_READER"] = "python"

    with tempfile.TemporaryDirectory(prefix="ai-study-release-check-") as temp_dir:
        env["AI_TUTOR_DB_PATH"] = str(Path(temp_dir) / "unittest.db")
        run(
            [
                sys.executable,
                "-m",
                "unittest",
                "discover",
                "-s",
                "backend",
                "-p",
                "test_*.py",
            ],
            env,
        )

    tests = node_tests()
    if not tests:
        raise SystemExit("No Node.js tests were discovered.")
    run([node, "--test", *tests], env)
    run(
        [
            sys.executable,
            "scripts/sanitize_ooxml_metadata.py",
            "data",
            "--check",
        ],
        env,
    )
    run(
        [
            node,
            "scripts/validate-production-seed.mjs",
            "--input",
            "data/production-seed/math2_public_seed_v1.xlsx",
        ],
        env,
    )
    run([node, "scripts/verify-deploy-package.mjs"], env)
    print("Release checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
