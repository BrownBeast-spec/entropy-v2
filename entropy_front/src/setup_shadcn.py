import json
import os

pkg_path = '/home/beast/Documents/Personal/entropy-v2/entropy_front/package.json'
with open(pkg_path, 'r') as f:
    data = json.load(f)

new_deps = {
    "@radix-ui/react-slot": "^1.0.2",
    "class-variance-authority": "^0.7.0",
    "@radix-ui/react-icons": "^1.3.0",
    "@radix-ui/react-navigation-menu": "^1.1.4",
    "@radix-ui/react-avatar": "^1.0.4",
    "lucide-react": "^0.354.0",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.1",
    "tailwindcss-animate": "^1.0.7"
}

data['dependencies'].update(new_deps)

with open(pkg_path, 'w') as f:
    json.dump(data, f, indent=2)

os.makedirs('/home/beast/Documents/Personal/entropy-v2/entropy_front/src/lib', exist_ok=True)
os.makedirs('/home/beast/Documents/Personal/entropy-v2/entropy_front/src/components/ui', exist_ok=True)

with open('/home/beast/Documents/Personal/entropy-v2/entropy_front/src/lib/utils.js', 'w') as f:
    f.write('import { clsx } from "clsx";\nimport { twMerge } from "tailwind-merge";\n\nexport function cn(...inputs) {\n  return twMerge(clsx(inputs));\n}\n')

print("Directories and dependencies configured.")
