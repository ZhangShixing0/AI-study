from __future__ import annotations

import argparse
import os
import re
import shutil
import stat
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path


CREATOR_TAG = "{http://purl.org/dc/elements/1.1/}creator"
LAST_MODIFIED_BY_TAG = (
    "{http://schemas.openxmlformats.org/package/2006/metadata/core-properties}"
    "lastModifiedBy"
)
CORE_PROPERTIES_PATH = "docProps/core.xml"
WORKBOOK_PATH = "xl/workbook.xml"
ABSOLUTE_PATH_TAG = re.compile(
    rb"<(?:[A-Za-z_][\w.-]*:)?absPath\b[^>]*/\s*>", re.IGNORECASE
)


def sanitize_workbook(path: Path, author: str) -> bool:
    original_mode = path.stat().st_mode
    with zipfile.ZipFile(path, "r") as source:
        changed = False
        replacements: dict[str, bytes] = {}

        if CORE_PROPERTIES_PATH in source.namelist():
            root = ET.fromstring(source.read(CORE_PROPERTIES_PATH))
            for tag in (CREATOR_TAG, LAST_MODIFIED_BY_TAG):
                node = root.find(tag)
                if node is not None and node.text != author:
                    node.text = author
                    changed = True
            replacements[CORE_PROPERTIES_PATH] = ET.tostring(
                root, encoding="utf-8", xml_declaration=True
            )

        if WORKBOOK_PATH in source.namelist():
            workbook_xml = source.read(WORKBOOK_PATH)
            cleaned_workbook_xml, removed = ABSOLUTE_PATH_TAG.subn(b"", workbook_xml)
            if removed:
                replacements[WORKBOOK_PATH] = cleaned_workbook_xml
                changed = True

        if not changed:
            return False

        fd, temporary_name = tempfile.mkstemp(
            prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
        )
        os.close(fd)
        temporary_path = Path(temporary_name)
        try:
            with zipfile.ZipFile(temporary_path, "w") as target:
                for info in source.infolist():
                    payload = replacements.get(info.filename, source.read(info.filename))
                    target.writestr(info, payload)
            path.chmod(original_mode | stat.S_IWRITE)
            try:
                os.replace(temporary_path, path)
            except PermissionError:
                with temporary_path.open("rb") as source_file, path.open("wb") as target_file:
                    shutil.copyfileobj(source_file, target_file)
            path.chmod(original_mode)
        finally:
            if path.exists():
                path.chmod(original_mode)
            temporary_path.unlink(missing_ok=True)
    return True


def workbook_paths(inputs: list[Path]) -> list[Path]:
    paths: set[Path] = set()
    for item in inputs:
        if item.is_dir():
            paths.update(item.rglob("*.xlsx"))
        elif item.suffix.lower() == ".xlsx":
            paths.add(item)
    return sorted(paths)


def metadata_is_safe(path: Path, author: str) -> bool:
    with zipfile.ZipFile(path, "r") as source:
        values: set[str] = set()
        if CORE_PROPERTIES_PATH in source.namelist():
            root = ET.fromstring(source.read(CORE_PROPERTIES_PATH))
            values = {
                (node.text or "").strip()
                for tag in (CREATOR_TAG, LAST_MODIFIED_BY_TAG)
                if (node := root.find(tag)) is not None
            }
        contains_absolute_path_tag = (
            WORKBOOK_PATH in source.namelist()
            and ABSOLUTE_PATH_TAG.search(source.read(WORKBOOK_PATH)) is not None
        )
    return values <= {"", author} and not contains_absolute_path_tag


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Remove personal OOXML author and absolute-path metadata without changing cells."
    )
    parser.add_argument("paths", nargs="+", type=Path)
    parser.add_argument("--author", default="AI Study Maintainers")
    parser.add_argument(
        "--check", action="store_true", help="Fail if personal metadata remains."
    )
    args = parser.parse_args()

    paths = workbook_paths(args.paths)
    if args.check:
        unsafe = [path for path in paths if not metadata_is_safe(path, args.author)]
        print(f"checked_workbooks={len(paths)} unsafe_metadata={len(unsafe)}")
        return 1 if unsafe else 0

    changed = sum(sanitize_workbook(path, args.author) for path in paths)
    print(f"sanitized_workbooks={changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
