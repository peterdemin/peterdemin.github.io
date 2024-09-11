import os
import json

from app import process

HERE = os.path.dirname(__file__)

SESSION_PATH = os.path.join(HERE, 'testdata', 'session-01.json')
with open(SESSION_PATH, 'rb') as fobj:
    SESSION = json.load(fobj)


def test_process_01_01():
    args = SESSION[0]['input']['args']
    expected = SESSION[0]['output']
    got = process(*args)
    assert got == expected
