import re

file_path = '/home/beast/Documents/Personal/entropy-v2/entropy_front/src/App.jsx'

with open(file_path, 'r') as f:
    text = f.read()

# Add the import statement
text = text.replace(
    "import React, { useState } from 'react';", 
    "import React, { useState } from 'react';\nimport { Header } from './components/ui/vercel-navbar';"
)

# Remove the old Header component
# It starts at "const Header =" and ends at "  </header>\n);\n"
start_str = "const Header = ({ onHome }) => (\n  <header className="
end_str = "  </header>\n);\n"

start_idx = text.find("const Header = ({ onHome }) => (")
if start_idx != -1:
    end_idx = text.find(end_str, start_idx) + len(end_str)
    text = text[:start_idx] + text[end_idx:]

with open(file_path, 'w') as f:
    f.write(text)

print("App.jsx has been updated with the new Header.")
