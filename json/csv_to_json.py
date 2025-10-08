import csv
import json

def time_to_seconds(time_str):
    """00:00:15,267 → 15.267 のように秒に変換"""
    if not time_str:
        return 0.0
    hms, ms = time_str.split(",")
    hours, minutes, seconds = map(int, hms.split(":"))
    return hours * 3600 + minutes * 60 + seconds + int(ms) / 1000

def csv_to_json_original_format(csv_path, json_path):
    rows = []
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # CSVのカラム名を元のJSON形式に変換
            rows.append({
                "speaker": row.get("speaker", ""),
                "text": row.get("en_text", ""),
                "translated": row.get("ja_text", ""),
                "start": time_to_seconds(row.get("time", "0:00:00,000"))
            })

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)
    print(f"変換完了: {json_path}")

# 実行例
csv_to_json_original_format("jimaku/ALICE_IN_WONDERLAND.csv", "jimaku/alice_restored.json")

