import re

app_path = '/home/beast/Documents/Personal/entropy-v2/entropy_front/src/App.jsx'
with open(app_path, 'r') as f:
    content = f.read()

icons_update = """  SaveIcon: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>,
  XClose: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>,
"""

if "XClose: ()" not in content:
    content = content.replace("const icons = {", "const icons = {\n" + icons_update)
    with open(app_path, 'w') as f:
        f.write(content)
    print("Icons patched.")
else:
    print("Icons already exist.")
