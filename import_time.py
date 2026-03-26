import csv
import time
from typing import Dict, Iterable, List, Optional, Set, Tuple

import requests

API_TOKEN = "PASTE_YOUR_TOKEN_HERE"
BASE_URL = "https://api.wanikani.com/v2"
OUTPUT_FILE = "wanikani_mastered_vocab_sentences.csv"

HEADERS = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Wanikani-Revision": "20170710",
    "Accept": "application/json",
}


class WaniKaniAPIError(RuntimeError):
    pass


def _sleep_until_rate_limit_reset(
    resp: requests.Response, minimum_sleep_s: int = 1
) -> None:
    reset = resp.headers.get("RateLimit-Reset")
    if not reset:
        time.sleep(minimum_sleep_s)
        return

    try:
        reset_epoch = int(reset)
    except ValueError:
        time.sleep(minimum_sleep_s)
        return

    now = int(time.time())
    wait_s = max(0, reset_epoch - now) + 1
    time.sleep(wait_s)


def wk_get(
    url: str, params: Optional[dict] = None, max_retries: int = 6
) -> Tuple[dict, requests.Response]:
    backoff_s = 1

    for _ in range(max_retries):
        resp = requests.get(url, headers=HEADERS, params=params, timeout=30)

        if resp.status_code == 429:
            _sleep_until_rate_limit_reset(resp)
            continue

        if 500 <= resp.status_code <= 599:
            time.sleep(backoff_s)
            backoff_s = min(backoff_s * 2, 30)
            continue

        if not resp.ok:
            try:
                err = resp.json()
                raise WaniKaniAPIError(
                    f"HTTP {resp.status_code}: {err.get('error')} "
                    f"(code={err.get('code')})"
                )
            except ValueError:
                raise WaniKaniAPIError(f"HTTP {resp.status_code}: {resp.text[:200]}")

        data = resp.json()
        return data, resp

    raise WaniKaniAPIError(f"GET failed after {max_retries} attempts: {url}")


def iter_collection(url: str, params: Optional[dict] = None) -> Iterable[dict]:
    next_url = url
    next_params = params

    while next_url:
        payload, _ = wk_get(next_url, params=next_params)

        for item in payload.get("data", []):
            yield item

        next_url = (payload.get("pages") or {}).get("next_url")
        next_params = None


def chunked(values: List[int], chunk_size: int) -> Iterable[List[int]]:
    for i in range(0, len(values), chunk_size):
        yield values[i : i + chunk_size]


def fetch_mastered_or_better_vocab_subject_ids() -> Set[int]:
    url = f"{BASE_URL}/assignments"
    params = {
        "subject_types": "vocabulary,kana_vocabulary",
        "srs_stages": "7,8,9",  # Master, Enlightened, Burned
        "hidden": "false",
    }

    subject_ids: Set[int] = set()

    for assignment in iter_collection(url, params=params):
        subject_ids.add(assignment["data"]["subject_id"])

    return subject_ids


def fetch_subjects_with_sentences(subject_ids: Set[int]) -> Dict[int, dict]:
    url = f"{BASE_URL}/subjects"
    out: Dict[int, dict] = {}

    for ids_chunk in chunked(sorted(subject_ids), chunk_size=200):
        params = {
            "ids": ",".join(map(str, ids_chunk)),
            "types": "vocabulary,kana_vocabulary",
        }

        for subject in iter_collection(url, params=params):
            sid = subject["id"]
            data = subject["data"]
            out[sid] = {
                "object": subject.get("object"),
                "characters": data.get("characters"),
                "meanings": data.get("meanings", []),
                "context_sentences": data.get("context_sentences", []),
            }

    return out


def format_meanings(meanings: List[dict]) -> str:
    english_meanings = [m.get("meaning", "") for m in meanings if m.get("meaning")]
    return ", ".join(english_meanings)


def write_subjects_to_csv(subjects: Dict[int, dict], output_file: str) -> None:
    with open(output_file, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["subject_id", "characters", "meanings", "ja", "en"])

        for sid in sorted(subjects):
            info = subjects[sid]
            chars = info["characters"] or ""
            meanings = format_meanings(info.get("meanings", []))
            sentences = info.get("context_sentences", [])

            if not sentences:
                writer.writerow([sid, chars, meanings, "", ""])
            else:
                for s in sentences:
                    writer.writerow(
                        [
                            sid,
                            chars,
                            meanings,
                            s.get("ja", ""),
                            s.get("en", ""),
                        ]
                    )


if __name__ == "__main__":
    print("Fetching mastered-or-better vocabulary subject IDs...")
    subject_ids = fetch_mastered_or_better_vocab_subject_ids()
    print(f"Found {len(subject_ids)} subject IDs.")

    print("Fetching subject records and example sentences...")
    subjects = fetch_subjects_with_sentences(subject_ids)
    print(f"Fetched {len(subjects)} subjects.")

    print(f"Writing results to {OUTPUT_FILE} ...")
    write_subjects_to_csv(subjects, OUTPUT_FILE)

    print("Done.")
