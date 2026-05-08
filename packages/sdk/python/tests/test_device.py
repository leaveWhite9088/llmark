import shutil
import unittest
from pathlib import Path
from unittest import mock

from llmark import device
from llmark import paths


class DeviceTests(unittest.TestCase):
    def test_persists_device_id(self) -> None:
        temp_root = Path('tests/.tmp-device')
        config_dir = temp_root / '.llmark'
        config_file = config_dir / 'config.json'
        shutil.rmtree(temp_root, ignore_errors=True)
        temp_root.mkdir(parents=True, exist_ok=True)
        try:
            with mock.patch.object(paths, 'LLMARK_DIR', config_dir), mock.patch.object(paths, 'CONFIG_FILE', config_file):
                first = device.get_device_id()
                second = device.get_device_id()
        finally:
            shutil.rmtree(temp_root, ignore_errors=True)

        self.assertEqual(first, second)
        self.assertTrue(first)


if __name__ == '__main__':
    unittest.main()
