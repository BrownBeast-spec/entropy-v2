import re

app_path = '/home/beast/Documents/Personal/entropy-v2/entropy_front/src/App.jsx'
with open(app_path, 'r') as f:
    content = f.read()

# Add import for new LandingView
import_stmt = "import { LandingView } from './components/ui/animated-landing';\n"
if "animated-landing" not in content:
    content = content.replace("import React, { useState } from 'react';", import_stmt + "import React, { useState } from 'react';")

# Find and eliminate the old LandingView
# the old LandingView starts with `const LandingView = ({ onSearch }) => {`
start_idx = content.find("const LandingView = ({ onSearch }) => {")
if start_idx != -1:
    end_idx = content.find("const ActionBar", start_idx)
    if end_idx != -1:
        # cut it out
        content = content[:start_idx] + content[end_idx:]

with open(app_path, 'w') as f:
    f.write(content)

print("Replaced LandingView completely.")
