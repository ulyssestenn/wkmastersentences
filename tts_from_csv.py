import argparse
import asyncio
import csv
import json
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional


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


def _prompt_yes_no(prompt: str, default_yes: bool = True) -> bool:
    default_hint = "Y/n" if default_yes else "y/N"
    while True:
        raw = input(f"{prompt} [{default_hint}]: ").strip().lower()
        if not raw:
            return default_yes
        if raw in {"y", "yes"}:
            return True
        if raw in {"n", "no"}:
            return False
        print("Please answer yes or no.")


def _prompt_optional_positive_int(prompt: str) -> Optional[int]:
    raw = input(prompt).strip()
    if not raw:
        return None
    if not raw.isdigit():
        print("Invalid input; using full run.")
        return None
    value = int(raw)
    if value <= 0:
        print("Value must be greater than 0; using full run.")
        return None
    return value


def _load_available_voices(tts_backend: str) -> List[Dict[str, str]]:
    if tts_backend == "edge-tts":
        try:
            import edge_tts
        except Exception as e:
            raise RuntimeError(
                "The selected TTS backend requires the 'edge-tts' package. "
                "Install it with: pip install edge-tts"
            ) from e

        raw_voices = asyncio.run(edge_tts.list_voices())
        voices: List[Dict[str, str]] = []
        for voice in raw_voices:
            short_name = voice.get("ShortName", "").strip()
            locale = voice.get("Locale", "").strip()
            if short_name:
                voices.append({"name": short_name, "locale": locale})
        return sorted(voices, key=lambda v: v["name"].lower())

    raise ValueError(f"Unsupported --tts-backend: {tts_backend}")


def _build_voice_index_sets(
    voices: List[Dict[str, str]],
) -> Dict[str, List[int]]:
    locale_map: Dict[str, List[int]] = defaultdict(list)
    for idx, voice in enumerate(voices, start=1):
        locale = voice["locale"]
        if locale:
            locale_map[locale].append(idx)
            language = locale.split("-")[0]
            locale_map[f"{language}-*"].append(idx)
    return dict(locale_map)


def _print_voice_options(voices: List[Dict[str, str]]) -> None:
    print("\nAvailable voices (full list):")
    for idx, voice in enumerate(voices, start=1):
        locale = voice["locale"] or "unknown"
        print(f"{idx}) {voice['name']} [{locale}]")


def _print_filtered_voice_options(
    voices: List[Dict[str, str]],
    indexes: List[int],
    label: str,
) -> None:
    print(f"\n{label} voices:")
    for idx in indexes:
        voice = voices[idx - 1]
        print(f"{idx}) {voice['name']} [{voice['locale'] or 'unknown'}]")


def _prompt_for_voice_index(
    prompt: str,
    voices: List[Dict[str, str]],
    allowed_indexes: List[int],
) -> str:
    allowed_set = set(allowed_indexes)
    while True:
        value = input(prompt).strip()
        if not value.isdigit():
            print("Please enter a number.")
            continue

        selected_index = int(value)
        if selected_index not in allowed_set:
            low, high = min(allowed_indexes), max(allowed_indexes)
            print(f"Please choose a valid number from {low} to {high} in the listed group.")
            continue
        return voices[selected_index - 1]["name"]


def _resolve_required_args(args: argparse.Namespace) -> argparse.Namespace:
    """Collect required arguments interactively when they are not provided."""
    interactive_mode = not args.input_csv or not args.ja_voice or not args.en_voice

    if not args.input_csv:
        if args.pick_file:
            selected = _pick_csv_file_with_dialog()
            if selected:
                args.input_csv = str(selected)
            else:
                print("File picker unavailable or no file selected; falling back to terminal prompt.")

        if not args.input_csv:
            args.input_csv = _prompt_for_value("Path to input CSV: ")

    voices = _load_available_voices(args.tts_backend)
    if not voices:
        raise RuntimeError("No voices were returned by the selected TTS backend.")

    voice_names = {v["name"] for v in voices}
    if args.ja_voice and args.ja_voice not in voice_names:
        raise ValueError(f"--ja-voice not found in available voices: {args.ja_voice}")
    if args.en_voice and args.en_voice not in voice_names:
        raise ValueError(f"--en-voice not found in available voices: {args.en_voice}")

    locale_groups = _build_voice_index_sets(voices)
    ja_indexes = locale_groups.get("ja-*", [])
    en_indexes = locale_groups.get("en-*", [])

    _print_voice_options(voices)
    if ja_indexes:
        _print_filtered_voice_options(voices, ja_indexes, "Japanese")
    if en_indexes:
        _print_filtered_voice_options(voices, en_indexes, "English")

    if not args.ja_voice:
        if not ja_indexes:
            raise RuntimeError("No Japanese voices (ja-*) found in available backend voices.")
        args.ja_voice = _prompt_for_voice_index(
            "Choose Japanese voice number: ",
            voices,
            ja_indexes,
        )

    if not args.en_voice:
        if not en_indexes:
            raise RuntimeError("No English voices (en-*) found in available backend voices.")
        args.en_voice = _prompt_for_voice_index(
            "Choose English voice number: ",
            voices,
            en_indexes,
        )

    print(
        "\nSelected voices:"
        f"\n- Japanese: {args.ja_voice}"
        f"\n- English: {args.en_voice}"
    )

    if interactive_mode and not args.preview_first_batch and args.num_batches is None:
        preview_only = _prompt_yes_no("Run preview only (first batch)?", default_yes=True)
        args.preview_first_batch = preview_only
        if not preview_only:
            args.num_batches = _prompt_optional_positive_int(
                "Number of batches to generate (press Enter for full run): "
            )

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


def _load_sentence_pairs(csv_path: Path) -> tuple[List[Dict[str, str]], int]:
    valid_rows: List[Dict[str, str]] = []
    skipped_rows = 0

    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row_index, row in enumerate(reader, start=2):
            ja_text = (row.get("ja") or "").strip()
            en_text = (row.get("en") or "").strip()
            if not ja_text or not en_text:
                skipped_rows += 1
                continue

            payload: Dict[str, str] = {
                "source_csv_row_index": str(row_index),
                "ja": ja_text,
                "en": en_text,
            }

            subject_id = (row.get("subject_id") or "").strip()
            if subject_id:
                payload["subject_id"] = subject_id

            valid_rows.append(payload)

    return valid_rows, skipped_rows


def _chunk_rows(rows: List[Dict[str, str]], batch_size: int) -> List[List[Dict[str, str]]]:
    return [rows[i : i + batch_size] for i in range(0, len(rows), batch_size)]


def _build_batch_text(rows: List[Dict[str, str]]) -> str:
    segments: List[str] = []
    for row in rows:
        segments.append(row["ja"])
        segments.append(row["en"])
    return "\n".join(segments)


async def _generate_batch_audio(text: str, voice: str, output_path: Path) -> None:
    import edge_tts

    communicate = edge_tts.Communicate(text=text, voice=voice)
    await communicate.save(str(output_path))


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
        "--tts-backend",
        default="edge-tts",
        choices=["edge-tts"],
        help="TTS backend used to load voice catalog",
    )
    parser.add_argument(
        "--pick-file",
        action="store_true",
        help="Open file picker to select --input-csv when not provided",
    )
    parser.add_argument(
        "--preview-first-batch",
        action="store_true",
        help="Generate only the first batch",
    )
    parser.add_argument(
        "--num-batches",
        type=int,
        help="Generate the first N batches",
    )
    parser.add_argument(
        "--auto-continue-after-preview",
        action="store_true",
        help="When preview mode is enabled, skip prompt and continue remaining batches",
    )

    args = parser.parse_args()
    args = _resolve_required_args(args)

    input_csv = Path(args.input_csv).expanduser().resolve()
    _validate_input_csv(input_csv)

    if args.batch_size <= 0:
        raise ValueError("--batch-size must be greater than 0")
    if args.num_batches is not None and args.num_batches <= 0:
        raise ValueError("--num-batches must be greater than 0")
    if args.preview_first_batch and args.num_batches is not None:
        raise ValueError("Use either --preview-first-batch or --num-batches, not both")

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

    valid_rows, skipped_rows = _load_sentence_pairs(input_csv)
    batches = _chunk_rows(valid_rows, args.batch_size)
    total_possible_batches = len(batches)

    audio_files_created = 0
    preview_stopped = False
    preview_continued = False

    def _generate_batches(
        selected_batches: List[List[Dict[str, str]]],
        start_batch_num: int,
    ) -> int:
        files_created = 0
        total_in_segment = len(selected_batches)
        for index_in_segment, batch_rows in enumerate(selected_batches, start=1):
            batch_num = start_batch_num + index_in_segment - 1
            batch_stem = f"batch_{batch_num:04d}"
            batch_manifest_path = output_dir / f"{batch_stem}_manifest.json"
            batch_audio_path = output_dir / f"{batch_stem}.mp3"

            with batch_manifest_path.open("w", encoding="utf-8") as manifest_file:
                json.dump(batch_rows, manifest_file, ensure_ascii=False, indent=2)

            print(
                f"[{batch_num}/{total_possible_batches}] Generating {batch_audio_path.name} "
                f"(rows in batch: {len(batch_rows)}, segment progress: {index_in_segment}/{total_in_segment})"
            )
            batch_text = _build_batch_text(batch_rows)
            asyncio.run(_generate_batch_audio(batch_text, args.ja_voice, batch_audio_path))
            files_created += 1
        return files_created

    if args.preview_first_batch:
        print(
            f"\nPREVIEW MODE: generating only first batch ({args.batch_size} sentences)"
        )
        if batches:
            audio_files_created += _generate_batches(batches[:1], start_batch_num=1)

        remaining_batches = batches[1:]
        if remaining_batches:
            if args.auto_continue_after_preview:
                should_continue = True
                print("Auto-continue enabled; continuing from batch_0002.")
            else:
                while True:
                    answer = input(
                        "Preview complete. Continue generating remaining batches now? (y/N) "
                    ).strip().lower()
                    if answer in {"y", "yes"}:
                        should_continue = True
                        break
                    if answer in {"", "n", "no"}:
                        should_continue = False
                        break
                    print("Please answer with 'y' or 'n'.")

            if should_continue:
                preview_continued = True
                audio_files_created += _generate_batches(
                    remaining_batches,
                    start_batch_num=2,
                )
            else:
                preview_stopped = True
                print("Preview complete; stopping now. Only preview batch was generated.")
    else:
        selected_batches = batches
        if args.num_batches is not None:
            selected_batches = batches[: args.num_batches]
        audio_files_created += _generate_batches(selected_batches, start_batch_num=1)

    run_is_partial = audio_files_created < total_possible_batches

    summary_mode = "standard"
    if args.preview_first_batch:
        if preview_stopped:
            summary_mode = "preview only (stopped by user)"
        elif preview_continued:
            summary_mode = "preview + continued full generation"
        elif total_possible_batches <= 1:
            summary_mode = "preview only (no remaining batches)"
        else:
            summary_mode = "preview only"

    if args.num_batches is not None and args.num_batches < total_possible_batches:
        summary_mode = "partial (limited by --num-batches)"


    print("\nFinal summary")
    print(f"- total CSV rows read: {row_count}")
    print(f"- valid sentence pairs used: {len(valid_rows)}")
    print(f"- rows skipped: {skipped_rows}")
    print(f"- total possible batches from CSV: {total_possible_batches}")
    print(f"- batches actually generated: {audio_files_created}")
    print(f"- execution mode: {summary_mode}")
    if run_is_partial:
        print("- run type: partial")
    else:
        print("- run type: full")
    print(f"- number of batch audio files created: {audio_files_created}")
    print(f"- output directory path: {output_dir}")


if __name__ == "__main__":
    main()
