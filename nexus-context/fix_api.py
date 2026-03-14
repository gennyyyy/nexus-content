import re

with open("src/lib/api.ts", "r") as f:
    content = f.read()

# Replace basic fetch
content = re.sub(
    r'const res = await fetch\((.*?)\);\s+if \(!res\.ok\) throw new Error\("(.*?)"\);\s+return res\.json\(\);',
    r'const res = await fetch(\1);\n    return handleResponse(res, "\2");',
    content
)

# Replace fetch with options returning json without ok check
content = re.sub(
    r'const res = await fetch\((.*?),\s*\{(.*?)\}\);\s+return res\.json\(\);',
    r'const res = await fetch(\1, {\2});\n    return handleResponse(res, "Request failed");',
    content,
    flags=re.DOTALL
)

# Replace fetch with options throwing error
content = re.sub(
    r'const res = await fetch\((.*?),\s*\{(.*?)\}\);\s+if \(!res\.ok\) throw new Error\("(.*?)"\);\s+return res\.json\(\);',
    r'const res = await fetch(\1, {\2});\n    return handleResponse(res, "\3");',
    content,
    flags=re.DOTALL
)

# Replace void responses (DELETE)
content = re.sub(
    r'const res = await fetch\((.*?),\s*\{(.*?)\}\);\s+if \(!res\.ok\) throw new Error\("(.*?)"\);',
    r'const res = await fetch(\1, {\2});\n    await handleResponse(res, "\3");',
    content,
    flags=re.DOTALL
)

# Clean up anything else
with open("src/lib/api.ts", "w") as f:
    f.write(content)
