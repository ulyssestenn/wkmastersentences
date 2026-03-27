import argparse
import csv
from pathlib import Path
from typing import Optional


def _pick_csv_file_with_dialog() -> Optional[Path]:
    """Open a native file picker and return the chosen CSV path."""
    try:
        import tkinter as tk
        from tkinter import filedialog
    except Exception:
        return None

    root = tk.Tk()
    root.withdraw()
    root.update()
    selected = filedialog.askopenfilename(
        title="Select input CSV",
        filetypes=[("CSV files", "*.csv"), ("All files", "*.*")],
    )
    root.destroy()

    if not selected:
        return None
    return Path(selected)


def _prompt_for_value(prompt: str) -> str:
    while True:
        value = input(prompt).strip()
        if value:
            return value
        print("Please provide a value.")


def _resolve_required_args(args: argparse.Namespace) -> argparse.Namespace:
    """Collect required arguments interactively when they are not provided."""
    if not args.input_csv:
        if args.pick_file:
            selected = _pick_csv_file_with_dialog()
            if selected:
                args.input_csv = str(selected)
            else:
                print("File picker unavailable or no file selected; falling back to terminal prompt.")

        if not args.input_csv:
            args.input_csv = _prompt_for_value("Path to input CSV: ")

    if not args.ja_voice:
        args.ja_voice = _prompt_for_value("Japanese voice (ja-voice): ")

    if not args.en_voice:
        args.en_voice = _prompt_for_value("English voice (en-voice): ")

    return args


def _validate_input_csv(csv_path: Path) -> None:
    if not csv_path.exists() or not csv_path.is_file():
        raise FileNotFoundError(f"Input CSV does not exist: {csv_path}")

    try:
        with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames
    except PermissionError as e:
        raise ValueError(f"Input CSV is not readable (permission denied): {csv_path}") from e
    except OSError as e:
        raise ValueError(f"Unable to open input CSV: {csv_path}") from e
    except csv.Error as e:
        raise ValueError(f"Input file is not a readable CSV: {csv_path}") from e

    if not headers:
        raise ValueError(
            f"Input CSV must include a header row. Required columns: ja, en. File: {csv_path}"
        )

    required_columns = {"ja", "en"}
    available_columns = {h.strip() for h in headers if h is not None}
    missing_columns = sorted(required_columns - available_columns)
    if missing_columns:
        raise ValueError(
            "Input CSV is missing required column(s): "
            f"{', '.join(missing_columns)}. "
            f"Found columns: {', '.join(headers)}"
        )


def _count_rows(csv_path: Path) -> int:
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return sum(1 for _ in reader)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Load sentence CSV and prepare TTS batch settings."
    )
    parser.add_argument("--input-csv", help="Path to CSV source file")
    parser.add_argument("--output-dir", default="audio_batches")
    parser.add_argument("--batch-size", type=int, default=30)
    parser.add_argument("--ja-pause-ms", type=int, default=2000)
    parser.add_argument("--post-block-pause-ms", type=int, default=2000)
    parser.add_argument("--ja-voice", help="Voice id/name for Japanese TTS")
    parser.add_argument("--en-voice", help="Voice id/name for English TTS")
    parser.add_argument(
        "--pick-file",
        action="store_true",
        help="Open file picker to select --input-csv when not provided",
    )

    args = parser.parse_args()
    args = _resolve_required_args(args)

    input_csv = Path(args.input_csv).expanduser().resolve()
    _validate_input_csv(input_csv)

    if args.batch_size <= 0:
        raise ValueError("--batch-size must be greater than 0")

    output_dir = Path(args.output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    row_count = _count_rows(input_csv)

    print("TTS CSV configuration")
    print(f"- input_csv: {input_csv}")
    print(f"- output_dir: {output_dir}")
    print(f"- batch_size: {args.batch_size}")
    print(f"- ja_pause_ms: {args.ja_pause_ms}")
    print(f"- post_block_pause_ms: {args.post_block_pause_ms}")
    print(f"- ja_voice: {args.ja_voice}")
    print(f"- en_voice: {args.en_voice}")
    print(f"- csv_rows: {row_count}")


if __name__ == "__main__":
    main()
