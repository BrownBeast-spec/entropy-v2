"use client";

import React, { useState, useEffect, useRef } from 'react';

const AnimatedNavLink = ({ href, children }) => {
  const defaultTextColor = 'text-gray-400';
  const hoverTextColor = 'text-gray-900';
  const textSizeClass = 'text-[13px] font-medium';

  return (
    <a href={href} className={`group relative inline-block overflow-hidden h-5 flex items-center ${textSizeClass}`}>
      <div className="flex flex-col transition-transform duration-400 ease-out transform group-hover:-translate-y-1/2">
        <span className={defaultTextColor}>{children}</span>
        <span className={hoverTextColor}>{children}</span>
      </div>
    </a>
  );
};

export function Navbar({ onHome }) {
  const [isOpen, setIsOpen] = useState(false);
  const [headerShapeClass, setHeaderShapeClass] = useState('rounded-full');
  const shapeTimeoutRef = useRef(null);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (shapeTimeoutRef.current) {
      clearTimeout(shapeTimeoutRef.current);
    }

    if (isOpen) {
      setHeaderShapeClass('rounded-xl');
    } else {
      shapeTimeoutRef.current = setTimeout(() => {
        setHeaderShapeClass('rounded-full');
      }, 300);
    }

    return () => {
      if (shapeTimeoutRef.current) {
        clearTimeout(shapeTimeoutRef.current);
      }
    };
  }, [isOpen]);

  const logoElement = (
    <div className="flex items-center space-x-2 cursor-pointer pr-4 border-r border-gray-200" onClick={onHome}>
      <span className="font-semibold text-[15px] tracking-tight font-display text-gray-900">Entropy</span>
    </div>
  );

  const navLinksData = [
    { label: 'Discover', href: '#' },
    { label: 'Network', href: '#' },
    { label: 'Docs', href: '#' },
  ];

  const loginButtonElement = (
    <button className="px-5 py-1.5 sm:px-4 text-xs sm:text-[13px] font-medium border border-gray-200 bg-white text-gray-700 rounded-full hover:border-gray-300 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200 w-full sm:w-auto shadow-sm">
      Log In
    </button>
  );

  const signupButtonElement = (
    <div className="relative group w-full sm:w-auto">
       <div className="absolute inset-0 -m-2 rounded-full hidden sm:block bg-[#4F46E5] opacity-20 filter blur-md pointer-events-none transition-all duration-300 ease-out group-hover:opacity-30 group-hover:blur-lg group-hover:-m-3"></div>
       <button className="relative z-10 px-5 py-1.5 sm:px-4 text-xs sm:text-[13px] font-semibold text-white bg-gradient-to-br from-[#4F46E5] to-[#3730D8] rounded-full hover:from-[#6366F1] hover:to-[#4F46E5] transition-all duration-200 w-full sm:w-auto shadow-sm tracking-wide">
         Sign Up
       </button>
    </div>
  );

  return (
    <header className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50
                       flex flex-col items-center
                       pl-5 pr-3 py-2 backdrop-blur-md shadow-sm
                       ${headerShapeClass}
                       border border-gray-200/60 bg-white/80
                       w-[calc(100%-2rem)] sm:w-auto
                       transition-[border-radius] duration-0 ease-in-out`}>

      <div className="flex items-center justify-between w-full h-8 gap-x-6 sm:gap-x-8">
        <div className="flex items-center h-full">
           {logoElement}
        </div>

        <nav className="hidden sm:flex items-center space-x-6">
          {navLinksData.map((link) => (
            <AnimatedNavLink key={link.label} href={link.href}>
              {link.label}
            </AnimatedNavLink>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-2 sm:gap-3 pl-4 border-l border-gray-200 h-full">
          {loginButtonElement}
          {signupButtonElement}
        </div>

        <button className="sm:hidden flex items-center justify-center w-8 h-8 text-gray-500 focus:outline-none" onClick={toggleMenu} aria-label={isOpen ? 'Close Menu' : 'Open Menu'}>
          {isOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          )}
        </button>
      </div>

      <div className={`sm:hidden flex flex-col items-center w-full transition-all ease-in-out duration-300 overflow-hidden
                       ${isOpen ? 'max-h-[1000px] opacity-100 pt-5 pb-2' : 'max-h-0 opacity-0 pt-0 pointer-events-none'}`}>
        <nav className="flex flex-col items-center space-y-4 text-base w-full">
          {navLinksData.map((link) => (
            <a key={link.label} href={link.href} className="text-gray-600 hover:text-gray-900 transition-colors w-full text-center font-medium">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex flex-col items-center space-y-3 mt-6 w-full px-2">
          {loginButtonElement}
          {signupButtonElement}
        </div>
      </div>
    </header>
  );
}
