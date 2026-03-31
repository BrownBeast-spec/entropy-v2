import os 
import re

app_path = '/home/beast/Documents/Personal/entropy-v2/entropy_front/src/App.jsx'
with open(app_path, 'r') as f:
    content = f.read()

# Replace VercelNavbar import with Header import from navbar
content = re.sub(r'import { VercelNavbar } from "./components/ui/vercel-navbar";', r'import { Header } from "./components/ui/navbar";', content)

# Replace <VercelNavbar onHome... /> with <Header onHome... />
content = re.sub(r'<VercelNavbar onHome={handleHome} />', r'<Header onHome={handleHome} />', content)

with open(app_path, 'w') as f:
    f.write(content)

print("App.jsx patched successfully.")
