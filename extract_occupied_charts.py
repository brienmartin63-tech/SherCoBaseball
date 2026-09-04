#!/usr/bin/env python3
"""Extract the occupied-base 1980 chart prose into deterministic JSON.

The rulebook pages are the authority. This tool keeps transcription mechanical;
semantic directives are added and tested in TypeScript rather than inferred from
display prose during a game.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
from pathlib import Path


ROLLS = (11, 12, 13, 14, 15, 16, 22, 23, 24, 25, 26, 33, 34, 35, 36, 44, 45, 46, 55, 56, 66)
ONE_DIE = (1, 2, 3, 4, 5, 6)
PAGE_MAP = {
    "FIRST": (26, 27),
    "SECOND": (28, 29),
    "THIRD": (30, 31),
    "FIRST_SECOND": (32, 33),
    "FIRST_THIRD": (34, 35),
    "SECOND_THIRD": (36, 37),
    "LOADED": (39, 40),
}

FIELDERS = {
    "center fielder": "CF", "centerfielder": "CF", "centre fielder": "CF", "cf": "CF",
    "right fielder": "RF", "rf": "RF", "left fielder": "LF", "lf": "LF",
    "shortstop": "SS", "ss": "SS", "second baseman": "2B", "2b": "2B",
    "first baseman": "1B", "ib": "1B", "1b": "1B", "third baseman": "3B", "3b": "3B",
    "pitcher": "P", "mound": "P", "box": "P", "catcher": "C",
}
NUMBER_WORDS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6}


def page_text(pdf: Path, page: int) -> str:
    with tempfile.NamedTemporaryFile(suffix=".txt") as output:
        subprocess.run(
            ["pdftotext", "-f", str(page), "-l", str(page), "-layout", str(pdf), output.name],
            check=True,
        )
        return Path(output.name).read_text(encoding="utf-8")


def normalize(value: str) -> str:
    value = re.sub(r"SherCo II Baseball Simulation.*", "", value, flags=re.DOTALL)
    return re.sub(r"\s+", " ", value).strip()


def numbered_entries(block: str, rolls: tuple[int, ...]) -> dict[str, str]:
    keys = "|".join(map(str, rolls))
    # One-die tables can contain nested ranges such as "1-3 = ejected". The
    # real row marker has whitespace after its dash; a nested numeric range does not.
    pattern = rf"(?m)^\s*({keys})(?!\d)\s*[-—]\s+(?=\S)" if rolls == ONE_DIE else rf"(?m)^\s*({keys})(?!\d)\s*(?:[-—])?\s*(?=\S)"
    matches = list(re.finditer(pattern, block))
    entries: dict[str, str] = {}
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(block)
        entries[match.group(1)] = normalize(block[match.end():end])
    missing = [str(roll) for roll in rolls if str(roll) not in entries]
    if missing:
        raise ValueError(f"Missing rolls: {', '.join(missing)}")
    return {str(roll): entries[str(roll)] for roll in rolls}


def ball_type(text: str) -> str:
    lower = text.lower()
    if "pop up" in lower or "popup" in lower:
        return "pop"
    if "line drive" in lower or "liner" in lower:
        return "line"
    if "fly" in lower:
        return "fly"
    return "ground"


def named_fielder(text: str) -> str | None:
    lower = text.lower()
    for name, position in FIELDERS.items():
        if re.search(rf"\b{re.escape(name)}\b", lower):
            return position
    return None


def compile_ball(text: str) -> dict[str, object] | None:
    """Compile printed placement prose once; the browser never interprets prose."""
    clause = re.split(r"\(\s*If\b", text, maxsplit=1, flags=re.IGNORECASE)[0]
    kind = ball_type(clause)
    spray = "opposite" if "opposite field" in text.lower() else None

    coordinate = re.search(r"\b(\d{1,2})\s*(?:-|<2>)\s*(\d{1,2})\b", clause)
    if coordinate:
        result: dict[str, object] = {
            "type": kind,
            "coordinate": {"row": int(coordinate.group(1)), "column": int(coordinate.group(2))},
        }
        if spray:
            result["spray"] = spray
        return result

    wall = re.search(r"\bsquare\s+(\d{1,2})-\?", clause, flags=re.IGNORECASE)
    if wall:
        return {"type": kind, "wallRow": int(wall.group(1)), "spray": spray or "fixed"}

    fielder = named_fielder(clause)
    if not fielder:
        return None
    result = {"type": kind, "fielder": fielder, "spray": "fixed"}
    relative = re.search(r"\b(one|two|three|four|five|six|\d+)\s+squares?\s+(in front of|behind)", clause, flags=re.IGNORECASE)
    if relative:
        count = NUMBER_WORDS.get(relative.group(1).lower(), int(relative.group(1)) if relative.group(1).isdigit() else 0)
        result["squaresInFront" if relative.group(2).lower().startswith("in front") else "squaresBehind"] = count
    return result


def home_run_ball(text: str) -> dict[str, object] | None:
    match = re.search(r"\(\s*If\b.*?HR Rating.*?[,:;]\s*(.*?)\)", text, flags=re.IGNORECASE)
    if not match:
        return None
    ball = compile_ball(match.group(1))
    if ball and "opposite field" in text.lower():
        ball["spray"] = "opposite"
    return ball


def compile_main(entries: dict[str, str], family: str) -> dict[str, object]:
    compiled: dict[str, object] = {}
    for roll, description in entries.items():
        entry: dict[str, object] = {"description": description}
        if roll == "66":
            entry["route"] = "HIT_ERROR" if family == "probableHit" else "OUT_ERROR"
        else:
            ball = compile_ball(description)
            if not ball:
                raise ValueError(f"No ball placement compiled for {family} {roll}: {description}")
            entry["ball"] = ball
            hr_ball = home_run_ball(description)
            if hr_ball:
                entry["homeRunBall"] = hr_ball
        compiled[roll] = entry
    return compiled


def descriptions(entries: dict[str, str]) -> dict[str, object]:
    return {roll: {"description": description} for roll, description in entries.items()}


def between(text: str, start: str, end: str | None = None) -> str:
    value = text.split(start, 1)[1]
    return value.split(end, 1)[0] if end and end in value else value


def extract(pdf: Path) -> dict[str, object]:
    pages = {page: page_text(pdf, page) for page in range(26, 42)}
    result: dict[str, object] = {}
    for state, (hit_page, out_page) in PAGE_MAP.items():
        hit_text = pages[hit_page]
        out_text = pages[out_page]
        hit_block = between(hit_text, "PROBABLE HIT", "ERROR CHART")
        hit_error_block = between(hit_text, "ERROR CHART")
        out_block = between(out_text, "PROBABLE OUT", "ERROR CHART")
        out_error_block = between(out_text, "ERROR CHART", "SPECIAL EVENTS CHART")
        special_block = between(out_text, "SPECIAL EVENTS CHART")
        if state == "FIRST":
            special_block += "\n" + pages[28].split("PROBABLE HIT", 1)[0]
        if state == "SECOND_THIRD":
            special_block += "\n" + pages[38].split("SherCo II", 1)[0]
        if state == "LOADED":
            special_block += "\n" + pages[41].split("SherCo II", 1)[0]
        result[state] = {
            "probableHit": compile_main(numbered_entries(hit_block, ROLLS), "probableHit"),
            "hitError": descriptions(numbered_entries(hit_error_block, ONE_DIE)),
            "probableOut": compile_main(numbered_entries(out_block, ROLLS), "probableOut"),
            "outError": descriptions(numbered_entries(out_error_block, ONE_DIE)),
            "specialEvent": descriptions(numbered_entries(special_block, ONE_DIE)),
        }
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("rulebook_pdf", type=Path)
    parser.add_argument("output_json", type=Path)
    args = parser.parse_args()
    extracted = extract(args.rulebook_pdf)
    args.output_json.parent.mkdir(parents=True, exist_ok=True)
    args.output_json.write_text(json.dumps(extracted, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
