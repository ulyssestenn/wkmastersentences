# wkmastersentences
Extracts Example Sentences for Mastered WankiKani Vocabulary and Creates Audio

# WaniKani Master+ Sentence Miner

A small local tool that extracts **example sentences for all WaniKani vocabulary currently at Master level or higher** and lets you browse and play them with browser TTS.

This tool runs **entirely on your own machine**.  
No server, no accounts, and no data leaves your computer except requests you make directly to the WaniKani API.

The goal is simple:

> Surface high-quality example sentences only for vocabulary you already know well.

---

# Features

- Fetches all **vocabulary and kana vocabulary currently at Master+**
- Extracts **WaniKani example sentences**
- Simple searchable sentence library
- Japanese sentence playback using **browser TTS**
- Optional English translation display
- Runs **locally in your browser**
- No installation or build step required

---

# Why This Exists

WaniKani includes good example sentences, but they are buried inside the lesson/review interface.

Once a word reaches **Master**, you likely know it well enough to begin encountering it in natural sentences. This tool collects those sentences into a single library so you can:

- listen to them
- shadow them
- browse them
- reinforce known vocabulary through context

---

# Requirements

You need:

- A **WaniKani account**
- A **WaniKani API token**
- A modern browser (Chrome, Edge, Firefox, Safari)

---

# Getting Your API Token

1. Log into WaniKani  
2. Go to:

https://www.wanikani.com/settings/personal_access_tokens

3. Create a **Read-only token**

The token should have access to:

- assignments
- subjects

---

# Installation

Download the repository:


git clone https://github.com/ulyssestenn/wkmastersentences


Or download the ZIP from GitHub and extract it.

---

# Running the App

Open:

index.html

in your browser.


---

# Usage

1. Paste your **WaniKani API token**
2. Click **Sync Master+ Vocabulary**
3. The app will:
   - fetch your assignments
   - identify vocabulary at **SRS stages 7–9**
   - download the corresponding subjects
   - extract their example sentences

You can then:

- search by word or sentence
- play Japanese audio
- reveal the English translation
- browse by level

---

# How It Works

The WaniKani API separates **user progress** from **subject data**, so the tool performs two steps.

### 1. Fetch assignments


/v2/assignments?subject_types=vocabulary,kana_vocabulary&srs_stages=7,8,9


This identifies vocabulary currently at **Master or above**.

### 2. Fetch subjects


/v2/subjects?ids=...


From these subjects the tool extracts:


context_sentences


Each sentence includes:

- Japanese
- English translation

The app merges the assignment data and subject data into a local sentence library.

---

# Privacy

Your API token is stored **only in your browser's local storage**.

No external server is involved.  
All API calls go **directly from your browser to WaniKani**.

---

# Limitations

- Only vocabulary with example sentences will appear
- Japanese audio uses **browser speech synthesis**, so voice quality depends on your system
- The tool shows items **currently at Master+**, not items that reached Master in the past but later dropped

---

# Future Ideas

Possible improvements:

- sentence shadowing mode
- random listening drills
- export to Anki deck
- audio caching
- frequency analysis of known vocabulary
- sentence difficulty filtering

---

# Disclaimer

This project is not affiliated with or endorsed by WaniKani.

WaniKani is a product of Tofugu LLC.
