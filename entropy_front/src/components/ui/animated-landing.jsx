import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Search } from "lucide-react";
import { cn } from "../../lib/utils";

export const LandingView = ({ onSearch }) => {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const suggestions = [
    "What are the targets for Alzheimer's disease",
    "What drugs have been repurposed for NSCLC?",
    "What are the assays to measure SOD1 in humans?"
  ];

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && value.trim()) {
      e.preventDefault();
      onSearch(value.trim());
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full items-center justify-center pb-[10vh] bg-[#0A0A0B] text-white p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/15 rounded-full mix-blend-screen filter blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/15 rounded-full mix-blend-screen filter blur-[100px] animate-pulse delay-700" />
        <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-fuchsia-500/15 rounded-full mix-blend-screen filter blur-[80px] animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-3xl mx-auto relative z-10 flex flex-col items-center">
        <motion.div 
          className="relative z-10 space-y-12 w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Header Text */}
          <div className="text-center space-y-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-block"
            >
              <h1 className="text-4xl md:text-5xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white/95 to-white/60 pb-1 font-display">
                Causaly Discover
              </h1>
              <motion.div 
                className="h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent mt-2"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "100%", opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            </motion.div>
            <motion.div 
              className="flex items-center justify-center space-x-2 text-sm text-white/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Sparkles className="w-4 h-4 text-violet-400/80" />
              <span>Powered by Causaly Copilot</span>
            </motion.div>
          </div>

          {/* Search Box */}
          <motion.div 
            className="relative backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.05] shadow-2xl p-2 max-w-[850px] mx-auto w-full"
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="relative">
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Ask a biomedical question..."
                className={cn(
                  "w-full px-6 py-4",
                  "bg-transparent",
                  "border-none",
                  "text-white/90 text-[15px]",
                  "focus:outline-none",
                  "placeholder:text-white/20",
                  "rounded-xl transition-all duration-200 ease-in-out"
                )}
                autoFocus
              />
            </div>
          </motion.div>

          {/* Suggestions */}
          <motion.div 
            className="flex flex-wrap items-center justify-center gap-3 pt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {suggestions.map((s, index) => (
              <motion.button
                key={index}
                onClick={() => onSearch(s)}
                className="flex items-center gap-2.5 px-4 py-2 bg-white/[0.02] hover:bg-white/[0.06] rounded-full text-[13px] text-white/50 hover:text-white/90 border border-white/[0.05] transition-all relative group shadow-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.4 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Search className="w-3.5 h-3.5 text-violet-400/50 group-hover:text-violet-400/80 transition-colors" />
                <span>{s}</span>
                <motion.div
                  className="absolute inset-0 border border-white/[0.05] rounded-full"
                  initial={false}
                  animate={{
                    opacity: [0, 1],
                    scale: [0.98, 1],
                  }}
                  transition={{
                    duration: 0.3,
                    ease: "easeOut",
                  }}
                />
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Mouse Follow Glow */}
      {isFocused && (
        <motion.div 
          className="fixed w-[40rem] h-[40rem] rounded-full pointer-events-none z-0 opacity-[0.03] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 blur-[80px]"
          animate={{
            x: mousePosition.x - 320,
            y: mousePosition.y - 320,
          }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 150,
            mass: 0.5,
          }}
        />
      )}
    </div>
  );
};
