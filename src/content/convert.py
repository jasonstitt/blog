import os


for fn in os.listdir('.'):
    if fn.endswith('.md'):
        with open(fn) as f:
            content = f.read()
        if content.startswith('---'):
            continue
        first, rest = content.split('\n\n', 1)
        with open(fn, 'w') as f:
            f.write('---\n')
            for line in first.split('\n'):
                key, value = line.split(': ', 1)
                key = key.lower()
                if ':' in value:
                    value = "'{}'".format(value.replace("'", "''"))
                f.write('{}: {}\n'.format(key, value))
            f.write('---\n\n')
            blockmode = False
            blank_lines = 0
            for line in rest.split("\n"):
                if line == '':
                    f.write('\n')
                elif line.startswith('    ::'):
                    blockmode = True
                    lang = line.split('::', 1)[1].strip()
                    f.write('```{}\n'.format(lang))
                elif blockmode:
                    if not line.startswith('    '):
                        blockmode = False
                        f.write('```\n\n')
                        f.write(line + "\n")
                    else:
                        line = line[4:]
                        f.write(line + "\n")
                else:
                    f.write(line + "\n")
