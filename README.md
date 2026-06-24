# Path of Exile Trade Aggregate

Chrome extension that scans the current page every 3 seconds for strings like:

```text
Acc: agatagat#4813
```

It counts identical account names and shows accounts that appear more than once in a fixed panel in the lower-left corner.

## Install

1. Open `chrome://extensions/`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this folder: `C:\...\acc-counter-extension`.

## Notes

- The extension runs on all pages.
- Only accounts with repeated occurrences are shown.
- The displayed list is sorted by count descending.
