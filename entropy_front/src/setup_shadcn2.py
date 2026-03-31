import json

pkg_path = '/home/beast/Documents/Personal/entropy-v2/entropy_front/package.json'
with open(pkg_path, 'r') as f:
    data = json.load(f)

new_deps = {
    "@radix-ui/react-accordion": "^1.1.2",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-label": "^2.0.2"
}

data['dependencies'].update(new_deps)

with open(pkg_path, 'w') as f:
    json.dump(data, f, indent=2)

print("Additional dependencies configured.")
