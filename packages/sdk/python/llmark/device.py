import json
import uuid

from llmark.paths import LLMARK_DIR, CONFIG_FILE
from llmark.utils import read_json_field


def get_device_id() -> str:
    device_id = read_json_field(CONFIG_FILE, "device_id")
    if device_id:
        return device_id
    try:
        device_id = str(uuid.uuid4())
        LLMARK_DIR.mkdir(parents=True, exist_ok=True)
        CONFIG_FILE.write_text(
            json.dumps({"device_id": device_id}, ensure_ascii=True),
            encoding="utf-8",
        )
        return device_id
    except Exception:
        return str(uuid.uuid4())
