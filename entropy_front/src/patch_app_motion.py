import os 
import re

app_path = '/home/beast/Documents/Personal/entropy-v2/entropy_front/src/App.jsx'
with open(app_path, 'r') as f:
    content = f.read()

# Add framer-motion import
if 'import { motion, AnimatePresence } from "framer-motion";' not in content:
    content = content.replace("import React, { useState } from 'react';", "import React, { useState } from 'react';\nimport { motion, AnimatePresence } from \"framer-motion\";")

# Replace conditional logic with framer motion sequence
old_render = """      {!hasSearched ? (
        <LandingView onSearch={handleSearch} />
      ) : (
        <div className="flex-1 flex max-w-[1920px] w-full mx-auto overflow-hidden">
          {/* Left Column (Search + Content) */}
          <div className="flex-1 flex flex-col min-w-0 bg-white relative">
            <ActionBar query={searchQuery} />
            
            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto pl-[60px] pr-[40px] pt-4 scroll-smooth no-scrollbar">
              <div className="max-w-[1400px]">
                <AIOverview />
                <DocumentList onSelectDoc={setSelectedDoc} />
              </div>
            </main>
          </div>
          
          {/* Right Sidebar */}
          <RightSidebar />
        </div>
      )}"""

new_render = """      <AnimatePresence mode="wait">
        {!hasSearched ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex-1 flex flex-col"
          >
            <LandingView onSearch={handleSearch} />
          </motion.div>
        ) : (
          <motion.div
            key="main"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
            className="flex-1 flex max-w-[1920px] w-full mx-auto overflow-hidden"
          >
            {/* Left Column (Search + Content) */}
            <div className="flex-1 flex flex-col min-w-0 bg-white relative">
              <ActionBar query={searchQuery} />
              
              {/* Scrollable Content */}
              <main className="flex-1 overflow-y-auto pl-[60px] pr-[40px] pt-4 scroll-smooth no-scrollbar">
                <div className="max-w-[1400px]">
                  <AIOverview />
                  <DocumentList onSelectDoc={setSelectedDoc} />
                </div>
              </main>
            </div>
            
            {/* Right Sidebar */}
            <RightSidebar />
          </motion.div>
        )}
      </AnimatePresence>"""

if old_render in content:
    content = content.replace(old_render, new_render)
    with open(app_path, 'w') as f:
        f.write(content)
    print("Animation patched successfully.")
else:
    print("Could not find exact render string.")
