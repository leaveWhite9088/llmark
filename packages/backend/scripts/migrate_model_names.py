"""迁移脚本：标准化存量模型名。

运行方式：python scripts/migrate_model_names.py
"""

import sqlite3
import sys

sys.path.insert(0, "D:/easyz工作室/LLMark2/llmark-backend")
from config import settings
from utils.model_names import normalize_model_name


def migrate():
    db_path = settings.database_url.replace("sqlite:///", "")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # 1. 找出所有包含 / 的模型名
    cur.execute("SELECT DISTINCT model FROM reports WHERE model LIKE '%/%'")
    rows = cur.fetchall()

    if not rows:
        print("没有需要迁移的模型名。")
        return

    print(f"发现 {len(rows)} 个需要标准化的模型名:")
    for row in rows:
        old = row["model"]
        new = normalize_model_name(old)
        print(f"  {old} -> {new}")

    # 2. 执行更新
    updated = 0
    for row in rows:
        old = row["model"]
        new = normalize_model_name(old)
        if old == new:
            continue
        cur.execute(
            "UPDATE reports SET model = ? WHERE model = ?",
            (new, old),
        )
        updated += cur.rowcount

    conn.commit()
    conn.close()
    print(f"\n迁移完成，更新了 {updated} 条记录。")


if __name__ == "__main__":
    migrate()
