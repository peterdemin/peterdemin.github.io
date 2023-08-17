"""Generates [12.35] flask prompts article.

Usage:
    git clone git@github.com:kaistAI/FLASK.git
    python gen_prompts.py > source/12_articles/35-flask-prompts.rst
"""
import json

EVALSET_PATH = "FLASK/evaluation_set/flask_evaluation.jsonl"


def iter_questions():
    with open(EVALSET_PATH, encoding="utf-8") as fobj:
        for line in fobj:
            yield json.loads(line)


def print_rst(questions):
    print("FLASK evaluation questions")
    print("==========================")
    print("")
    for idx, question_data in enumerate(questions, 1):
        text = question_data["text"]
        answer = question_data["answer"]
        indent = " " * len(f"{idx}. ")
        lines = wrap(text)
        print(f"{idx}. {next(lines)}")
        for line in lines:
            print(f"{indent}{line}")
        print("")
        for line in wrap(answer):
            print(f"{indent}  {line}")
        print("")


def wrap(text):
    for line in text.splitlines():
        yield line
        yield ''


print_rst(iter_questions())
