import re

file_path = '/home/beast/Documents/Personal/entropy-v2/entropy_front/src/App.jsx'

with open(file_path, 'r') as f:
    text = f.read()

# Replace the previous Header import with the new Navbar import
text = text.replace(
    "import { Header } from './components/ui/vercel-navbar';", 
    "import { Navbar } from './components/ui/mini-navbar';"
)

# Replace <Header onHome={goHome} /> with <Navbar onHome={goHome} />
text = text.replace(
    "<Header onHome={goHome} />",
    "<Navbar onHome={goHome} />"
)

with open(file_path, 'w') as f:
    f.write(text)

print("App.jsx updated to use the mini-navbar.")
