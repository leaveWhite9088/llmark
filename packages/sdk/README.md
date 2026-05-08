# LLMark SDK Workspace

Official SDKs for LLMark - LLM API performance monitoring platform.

## Overview

LLMark SDKs enable developers to measure and report LLM API performance metrics in real production environments. Data is aggregated anonymously to provide transparent, crowdsourced performance comparisons across providers and regions.

## SDKs

### Python SDK (`python/`)

**Status**: ✅ Production Ready

A Python SDK that patches popular LLM client libraries to automatically collect and report performance metrics.

**Features**:
- Zero-code instrumentation via monkey-patching
- Supports OpenAI, Anthropic, and Google Gemini
- Local Proxy mode for tools that can't be modified
- Benchmark mode for voluntary testing
- Standard library only (zero dependencies)

**Install**:
```bash
pip install llmark
```

**Quick Start**:
```python
from openai import OpenAI
import llmark

llmark.init(api_url="https://api.llmark.top/v1/report")

# Use OpenAI as normal - metrics are collected automatically
client = OpenAI(api_key="sk-xxx")
response = client.chat.completions.create(...)
```

See [python/README.md](python/README.md) for detailed documentation.

### JavaScript SDK (`javascript/`)

**Status**: 📝 Planned

JavaScript/TypeScript SDK for browser and Node.js environments.

Planned features:
- Fetch interceptor for automatic metric collection
- Support for OpenAI, Anthropic, and other providers
- Framework integrations (React, Vue, etc.)

## Data Collected

The SDKs collect only performance metrics:

| Field | Description |
|-------|-------------|
| `provider` | LLM provider name (openai, anthropic, etc.) |
| `model` | Model identifier |
| `prompt_tokens` | Input token count |
| `completion_tokens` | Output token count |
| `ttft_ms` | Time to first token (ms) |
| `total_ms` | Total request duration (ms) |
| `tps` | Tokens per second (calculated) |
| `region` | Egress country code (inferred by backend) |
| `device_id` | Anonymous device identifier |

**Never collected**:
- Prompt content
- Model responses
- API keys
- Personal information

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  LLMark SDK │────▶│   LLMark    │
│   App       │     │  (patch)    │     │   Backend   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Upstream  │
                    │   LLM API   │
                    └─────────────┘
```

## Contributing

### Python SDK Development

```bash
cd sdk/python
python -m pip install -e .
python -m unittest discover -s tests -v
```

### Adding a New SDK

1. Create a new directory: `sdk/{language}/`
2. Include README.md with setup and usage instructions
3. Follow the data collection schema defined in backend
4. Maintain the same privacy guarantees (no prompt/response collection)

## Related

- [Backend Documentation](../../backend/README.md)
- [API Schema](../../backend/schemas/models.py)
- [Main Project README](../../README.md)
