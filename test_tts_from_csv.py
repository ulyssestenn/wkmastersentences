import unittest

from tts_from_csv import _build_batch_segment_metadata


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
            ("1", "ja_2"),
            ("1", "post_block_pause"),
            ("2", "ja_1"),
            ("2", "ja_pause"),
            ("2", "en"),
            ("2", "ja_2"),
            ("2", "post_block_pause"),
        ]
        self.assertEqual(actual_order, expected_order)

        first_silence = segments[1]
        second_silence = segments[4]
        self.assertEqual(first_silence["type"], "silence")
        self.assertEqual(first_silence["duration_ms"], "1200")
        self.assertEqual(second_silence["type"], "silence")
        self.assertEqual(second_silence["duration_ms"], "2200")


if __name__ == "__main__":
    unittest.main()
