import unittest
from unittest import mock

from llmark.core.collector import make_openai_wrapper
from llmark.config import RuntimeConfig


class _Usage:
    def __init__(self, prompt_tokens: int, completion_tokens: int) -> None:
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens


class _Delta:
    def __init__(self, content: str | None) -> None:
        self.content = content


class _Choice:
    def __init__(self, content: str | None) -> None:
        self.delta = _Delta(content)


class _Chunk:
    def __init__(self, content: str | None, usage: _Usage | None = None) -> None:
        self.choices = [_Choice(content)]
        self.usage = usage


class _Client:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url


class _OpenAIResource:
    def __init__(self, base_url: str) -> None:
        self._client = _Client(base_url)


_TEST_CONFIG = RuntimeConfig(token=None, enabled=True, sample_rate=1.0, api_url='http://example.com', device_id='device-1')


class CollectorTests(unittest.TestCase):
    def test_openai_wrapper_reports_stream_metrics(self) -> None:
        def original(_self, *args, **kwargs):
            return iter([
                _Chunk('hello'),
                _Chunk(None, _Usage(prompt_tokens=321, completion_tokens=45)),
            ])

        wrapper = make_openai_wrapper(original, _TEST_CONFIG)

        with mock.patch('llmark.reporter.upload_async') as upload_async, \
             mock.patch('llmark.core.collector.random.random', return_value=0.0), \
             mock.patch('llmark.core.collector.time.time', side_effect=[1000.0, 1000.2, 1001.0]):
            chunks = list(wrapper(_OpenAIResource('https://api.deepseek.com'), model='deepseek-reasoner', stream=True))

        self.assertEqual(len(chunks), 2)
        upload_async.assert_called_once()
        payload = upload_async.call_args.args[0]
        self.assertEqual(payload['provider'], 'deepseek')
        self.assertEqual(payload['model'], 'deepseek-reasoner')
        self.assertEqual(payload['prompt_tokens'], 321)
        self.assertEqual(payload['completion_tokens'], 45)
        self.assertEqual(payload['ttft_ms'], 200)
        self.assertEqual(payload['total_ms'], 1000)

    def test_openai_wrapper_drops_unknown_gateway(self) -> None:
        original = mock.Mock(return_value=iter([_Chunk('hello'), _Chunk(None, _Usage(prompt_tokens=128, completion_tokens=8))]))
        wrapper = make_openai_wrapper(original, _TEST_CONFIG)

        with mock.patch('llmark.reporter.upload_async') as upload_async, \
             mock.patch('llmark.core.collector.random.random', return_value=0.0):
            chunks = list(wrapper(_OpenAIResource('https://relay.example.com/v1'), model='relay-model', stream=True))

        self.assertEqual(len(chunks), 2)
        original.assert_called_once()
        upload_async.assert_not_called()


if __name__ == '__main__':
    unittest.main()
