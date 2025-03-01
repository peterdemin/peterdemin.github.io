import os
import glob
import tempfile
import subprocess


def extract_codes(lines):
    code_lines = []
    is_code = False
    for line in lines:
        if line.strip() == '```python':
            is_code = True
        elif is_code:
            if line.strip() == '```':
                if code_lines:
                    yield "".join(code_lines)
                    code_lines = []
                is_code = False
            else:
                code_lines.append(line)
    if code_lines:
        yield "".join(code_lines)


for filename in glob.glob(os.path.join(os.path.dirname(__file__), '30-*.md')):
    with open(filename, "rt", encoding='utf-8') as fobj:
        for code in extract_codes(fobj):
            with tempfile.NamedTemporaryFile('wt', encoding='utf-8', delete_on_close=False) as cfile:
                cfile.write(code)
                cfile.close()
                process = subprocess.run(
                    ['python', cfile.name],
                    check=False,
                    capture_output=True,
                    encoding='utf-8',
                )
                if process.returncode:
                    for i, line in enumerate(code.splitlines(), 1):
                        print(f'{i:2} {line}')
                    print(f'\nSTDOUT:\n {process.stdout}')
                    print(f'\nSTDERR:\n {process.stderr}')
                    break
            print('.', end='')
