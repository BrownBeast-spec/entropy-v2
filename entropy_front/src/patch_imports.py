import re

app_path = '/home/beast/Documents/Personal/entropy-v2/entropy_front/src/App.jsx'
with open(app_path, 'r') as f:
    content = f.read()

content = content.replace("import React, { useState } from 'react';", "import React, { useState, useEffect } from 'react';")

with open(app_path, 'w') as f:
    f.write(content)

print("Imports updated successfully")
