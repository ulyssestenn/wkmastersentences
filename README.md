# WaniKani Mastered Vocabulary Sentence Exporter

Export all of your **WaniKani vocabulary at Master level or higher** (Master, Enlightened, Burned) along with their **example sentences** into a clean CSV file.

This script uses the official WaniKani API to:

- Identify vocabulary you have **learned to a high level**
- Fetch their **Japanese example sentences**
- Include **English translations**
- Output everything into a **spreadsheet-friendly CSV**

---

## What This Produces

A CSV file like this:

| subject_id | characters | meanings | ja | en |
|------------|------------|----------|----|----|
| 2468 | 一つ | one | レモン、一つ下さい。 | A lemon, please. |
| 2468 | 一つ | one | 二つの川が、一つの大きな川になる。 | The two rivers become one big river. |

- One row per **sentence**
- Repeated vocab entries if multiple sentences exist
- UTF-8 encoded (opens cleanly in Excel)

---

## Why This Is Useful

- Add sentences to Anki decks
- Create practice audio files with text-to-speech

---

## Requirements

- Python 3.9+

## Setup

### 1) Get your API token

Go to:

👉 https://www.wanikani.com/settings/personal_access_tokens

Create a token with read permissions.

### 2) Add your token to the script

Open the script and replace:

```python
API_TOKEN = "PASTE_YOUR_TOKEN_HERE"
```

### 3) Run the program

```text
import_time.py
```

## Output

The program will generate:

```text
wanikani_mastered_vocab_sentences.csv
```

By default, it saves to the same folder as the script.

You can change this by editing:

```python
OUTPUT_FILE = "wanikani_mastered_vocab_sentences.csv"
```

Example:

```python
OUTPUT_FILE = r"C:\Users\YourName\Desktop\wanikani.csv"
```

## What Counts as “Mastered”

This script includes vocabulary at:

- SRS Stage 7 — Master
- SRS Stage 8 — Enlightened
- SRS Stage 9 — Burned

If you want only strict “Master,” change:

```python
"srs_stages": "7,8,9"
```

to:

```python
"srs_stages": "7"
```

## How It Works (High-Level)

1. Calls `/assignments` to find your vocabulary at SRS ≥ 7
2. Extracts `subject_ids`
3. Calls `/subjects` to fetch vocabulary data
4. Pulls `context_sentences` (JA + EN)
5. Writes everything to CSV

## Notes

- The API is rate-limited (60 requests/minute), but the script handles this automatically.
- Large accounts may take ~10–30 seconds to process.
- Some vocabulary items may not have example sentences.
