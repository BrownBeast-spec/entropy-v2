import os 
import re

app_path = '/home/beast/Documents/Personal/entropy-v2/entropy_front/src/App.jsx'
with open(app_path, 'r') as f:
    content = f.read()

# Replace Navbar import with Header import from navbar
content = re.sub(r'import \{ Navbar \} from "\./components/ui/mini-navbar";', r'import { Header } from "./components/ui/navbar";', content)
content = re.sub(r"import \{ Navbar \} from '\./components/ui/mini-navbar';", r'import { Header } from "./components/ui/navbar";', content)

# Replace <Navbar onHome={goHome} /> with <Header onHome={goHome} />
content = re.sub(r'<Navbar onHome=\{goHome\} />', r'<Header onHome={goHome} />', content)

with open(app_path, 'w') as f:
    f.write(content)

print("App.jsx patched successfully.")
