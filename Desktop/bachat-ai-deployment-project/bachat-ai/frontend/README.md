# Bachat AI - Frontend Application

This directory contains the React-based frontend application for Bachat AI. It handles all user interfaces, client-side routing, and interactions with the Supabase backend and our Flask APIs.

## Tech Stack
- **React 18**: Component-based UI.
- **Vite**: Ultra-fast build tool and development server.
- **Tailwind CSS v3**: Utility-first styling for our glassmorphic UI.
- **Zustand**: Lightweight global state management.
- **Recharts & Framer Motion**: Advanced charting and micro-animations.
- **Vitest**: Unit testing framework.

## Project Structure
```text
src/
├── assets/         # Static images, icons, global CSS (index.css)
├── components/     # Reusable UI elements (Card, Button, ThemeToggle, Charts)
│   ├── dashboard/  # Widgets specific to the dashboard (Salary, Anomaly, etc.)
│   ├── gamification/# Badge displays
│   ├── investment/ # Risk filters, Stock cards
│   ├── layout/     # Sidebar, Header
│   └── ui/         # Core atomic components
├── context/        # React Contexts (AuthContext, ThemeContext)
├── hooks/          # Custom hooks (useSalaryIntelligence, useForecast)
├── lib/            # Utility configs (Supabase client init)
├── pages/          # Main route pages (Dashboard, Landing, Settings, etc.)
└── store/          # Zustand global state stores
```

## Available Scripts

In the project directory, you can run:

### `npm run dev`
Runs the app in the development mode.\
Open [http://localhost:5173](http://localhost:5173) to view it in your browser. The page will reload when you make changes.

### `npm run test`
Launches the test runner in the interactive watch mode. Uses Vitest and `@testing-library/react`.

### `npm run build`
Builds the app for production to the `dist` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

### `npm run lint`
Runs ESLint to check for code quality and syntax errors.
