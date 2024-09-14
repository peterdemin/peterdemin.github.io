import os
import json

from app import process

HERE = os.path.dirname(__file__)
TESTDATA = os.path.join(HERE, 'testdata')



def test_process_01_01():
    with open(os.path.join(TESTDATA, 'session-01.json'), encoding='utf-8') as fobj:
        session = json.load(fobj)
    args = session[0]['input']['args']
    expected = session[0]['output']
    got = process(*args)
    assert got == expected


def test_process_02_01():
    with open(os.path.join(TESTDATA, 'session-02.jsonl'), encoding='utf-8') as fobj:
        session = [json.loads(line.strip()) for line in fobj]
    args = session[0]['input']['args']
    expected = session[0]['output']
    got = process(*args)
    assert got == expected
