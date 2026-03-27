import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from tts_from_csv import (
    _build_batch_segment_metadata,
    _generate_silence_clip,
    _non_negative_int,
)


class BuildBatchSegmentMetadataTests(unittest.TestCase):
    def test_segment_order_repeats_per_row(self) -> None:
        rows = [
            {"ja": "こんにちは", "en": "hello"},
            {"ja": "ありがとう", "en": "thanks"},
        ]

        segments = _build_batch_segment_metadata(
            batch_rows=rows,
            ja_voice="ja-voice",
            en_voice="en-voice",
            ja_pause_ms=1200,
            post_block_pause_ms=2200,
        )

        actual_order = [(segment["row_num"], segment["slot"]) for segment in segments]
        expected_order = [
            ("1", "ja_1"),
            ("1", "ja_pause"),
            ("1", "en"),
            ("1", "ja_pause_2"),
            ("1", "ja_2"),
            ("1", "post_block_pause"),
            ("2", "ja_1"),
            ("2", "ja_pause"),
            ("2", "en"),
            ("2", "ja_pause_2"),
            ("2", "ja_2"),
            ("2", "post_block_pause"),
        ]
        self.assertEqual(actual_order, expected_order)

        first_silence = segments[1]
        second_silence = segments[3]
        third_silence = segments[5]
        self.assertEqual(first_silence["type"], "silence")
        self.assertEqual(first_silence["duration_ms"], "1200")
        self.assertEqual(second_silence["type"], "silence")
        self.assertEqual(second_silence["duration_ms"], "1200")
        self.assertEqual(third_silence["type"], "silence")
        self.assertEqual(third_silence["duration_ms"], "2200")


class NonNegativeIntTests(unittest.TestCase):
    def test_non_negative_int_accepts_zero_and_positive(self) -> None:
        self.assertEqual(_non_negative_int("0"), 0)
        self.assertEqual(_non_negative_int("123"), 123)

    def test_non_negative_int_rejects_negative_and_non_numeric(self) -> None:
        with self.assertRaises(Exception):
            _non_negative_int("-1")
        with self.assertRaises(Exception):
            _non_negative_int("abc")


class GenerateSilenceClipTests(unittest.TestCase):
    def test_generate_silence_clip_zero_ms_creates_empty_file(self) -> None:
        with TemporaryDirectory() as tmp:
            output = Path(tmp) / "silence.mp3"
            _generate_silence_clip(0, output)
            self.assertTrue(output.exists())
            self.assertEqual(output.stat().st_size, 0)


if __name__ == "__main__":
    unittest.main()
