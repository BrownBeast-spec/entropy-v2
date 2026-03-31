import sys

with open('App.jsx', 'r') as f:
    lines = f.readlines()

with open('patch_actionbar.jsx', 'r') as f:
    ab = f.readlines()

with open('patch_rightsidebar.jsx', 'r') as f:
    rs = f.readlines()

with open('patch_app.jsx', 'r') as f:
    app = f.readlines()

new_lines = []
i = 0
while i < len(lines):
    if i == 52:
        new_lines.extend(ab)
        new_lines.append("\n")
        i = 94
        continue
    if i == 235:
        new_lines.extend(rs)
        new_lines.append("\n")
        i = 267
        continue
    if i == 352:
        new_lines.extend(app)
        break
    new_lines.append(lines[i])
    i += 1

with open('App.jsx', 'w') as f:
    f.writelines(new_lines)

print("Patched!")
