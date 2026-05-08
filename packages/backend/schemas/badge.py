from pydantic import BaseModel


class BadgeItem(BaseModel):
    id: str
    name: str
    description: str
    icon_svg: str
    earned_at: str | None = None


class UserBadgesResponse(BaseModel):
    badges: list[BadgeItem]
    total_count: int
