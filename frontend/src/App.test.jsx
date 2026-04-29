import React from 'react'
import { render, screen } from '@testing-library/react'
import Landing from './pages/Landing'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { describe, it, expect } from 'vitest'

describe('Landing Page', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <ThemeProvider>
          <Landing />
        </ThemeProvider>
      </BrowserRouter>
    )
    const logoText = screen.getAllByText(/Bachat/i)
    expect(logoText.length).toBeGreaterThan(0)
  })
})
