import importlib
import os
import sys

# Ensure the repo root is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

def test_version_importable():
    module = importlib.import_module('label_studio')
    assert isinstance(module.__version__, str)
