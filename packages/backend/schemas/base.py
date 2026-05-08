import re

from pydantic import BaseModel

UUID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
)
SAFE_TEXT_PATTERN = re.compile(r"^[a-zA-Z0-9_\-\.\/]+$")


class OkResponse(BaseModel):
    ok: bool = True
