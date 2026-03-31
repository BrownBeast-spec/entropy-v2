import re

app_path = '/home/beast/Documents/Personal/entropy-v2/entropy_front/src/App.jsx'
with open(app_path, 'r') as f:
    content = f.read()

old_panel = """  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-gray-900/40 z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%', opacity: 0.5 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0.5 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="absolute right-0 top-0 bottom-0 w-[45%] min-w-[500px] max-w-[800px] bg-white shadow-2xl z-50 overflow-y-auto flex flex-col border-l border-gray-200"
      >"""

new_panel = """  return (
    <motion.div className="absolute inset-0 z-50 overflow-hidden" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-gray-900/40"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%', opacity: 0.5 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0.5 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="absolute right-0 top-0 bottom-0 w-[45%] min-w-[500px] max-w-[800px] bg-white shadow-2xl overflow-y-auto flex flex-col border-l border-gray-200"
      >"""

content = content.replace(old_panel, new_panel)

# Don't forget to close the new wrapper div
content = content.replace("""        </div>
      </motion.div>
    </>
  );""", """        </div>
      </motion.div>
    </motion.div>
  );""")

with open(app_path, 'w') as f:
    f.write(content)

print("Panel structure fixed.")
