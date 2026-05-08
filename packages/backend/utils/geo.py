from ipaddress import ip_address

from fastapi import Request


FORWARDED_IP_HEADERS = (
    "cf-connecting-ip",
    "x-forwarded-for",
    "x-real-ip",
)


def _first_valid_ip(candidates: list[str]) -> str | None:
    for candidate in candidates:
        value = candidate.strip()
        if not value:
            continue
        try:
            ip_address(value)
            return value
        except ValueError:
            continue
    return None


def get_client_ip(request: Request) -> str:
    for header_name in FORWARDED_IP_HEADERS:
        header_value = request.headers.get(header_name)
        if not header_value:
            continue
        client_ip = _first_valid_ip(header_value.split(","))
        if client_ip:
            return client_ip

    if request.client and request.client.host:
        return request.client.host
    return "0.0.0.0"
