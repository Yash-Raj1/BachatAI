import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative p-2.5 rounded-full bg-primary/10 dark:bg-primary/20 backdrop-blur-md text-primary transition-all duration-300 hover:scale-110 hover:bg-primary/20 dark:hover:bg-primary/30 focus:outline-none shadow-sm hover:shadow-primary/25 hover:shadow-md ${className}`}
      aria-label="Toggle theme"
    >
      {theme === 'dark'
        ? <Sun size={19} className="text-accent" />
        : <Moon size={19} className="text-primary" />}
    </button>
  );
}
