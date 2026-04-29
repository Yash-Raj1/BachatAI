import React, { useState, useRef, useEffect, useCallback } from 'react'
import { twMerge } from 'tailwind-merge'
import { MessageCircle, X, Minus, Send, Bot, Mic, MicOff, Languages } from 'lucide-react'
import api from '../../lib/api'
import { BachatLogo } from '../ui/BachatLogo'
import { useAuth } from '../../context/AuthContext'

/* ─── Voice Input Hook (Web Speech API) ─── */
function useVoiceInput({ onResult, lang = 'en-IN' }) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      setSupported(true)
      const recog = new SpeechRecognition()
      recog.continuous = false
      recog.interimResults = false
      recog.lang = lang
      recog.onresult = (e) => {
        const transcript = e.results[0][0].transcript
        onResult(transcript)
        setListening(false)
      }
      recog.onerror = () => setListening(false)
      recog.onend = () => setListening(false)
      recognitionRef.current = recog
    }
  }, [lang]) // re-create when language changes

  const toggle = useCallback(() => {
    if (!recognitionRef.current) return
    if (listening) {
      recognitionRef.current.stop()
      setListening(false)
    } else {
      recognitionRef.current.start()
      setListening(true)
    }
  }, [listening])

  return { listening, supported, toggle }
}

/* ─── Main Component ─── */
export function ChatPanel() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [voiceLang, setVoiceLang] = useState('en-IN') // en-IN or hi-IN
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Set welcome message based on auth state
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMsg = user
        ? 'Hi there! 👋 I\'m your personal Bachat AI coach. Ask me anything about your spending, savings, or finances — I have your real statement data! You can also tap 🎤 to speak.'
        : 'Hi there! 👋 I\'m Bachat AI. I can tell you about our features, how the app works, and how it can help you manage your finances. Ask me anything! Sign up to unlock personalized insights.'
      setMessages([{ role: 'ai', content: welcomeMsg }])
    }
  }, [user])

  const handleSend = async (msgOverride) => {
    const text = typeof msgOverride === 'string' ? msgOverride : input
    if (!text.trim()) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setIsTyping(true)

    try {
      const response = await api.post('/chat/message', {
        message: text,
        user_id: user?.id || '',
        mode: user ? 'authenticated' : 'public',
      })
      const reply = response.data.response || response.data.error || 'No response received.'
      setMessages(prev => [...prev, { role: 'ai', content: reply }])
    } catch (err) {
      console.error('[chatbot] Error:', err?.response?.data || err.message)
      const errMsg = err?.response?.data?.error || "Sorry, I'm having trouble connecting right now. Please try again shortly."
      setMessages(prev => [...prev, { role: 'ai', content: errMsg }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleFormSubmit = (e) => {
    e?.preventDefault()
    handleSend()
  }

  // Voice input — when speech is recognized, put it in the input box
  const handleVoiceResult = useCallback((transcript) => {
    setInput(transcript)
  }, [])

  const { listening, supported: voiceSupported, toggle: toggleVoice } = useVoiceInput({
    onResult: handleVoiceResult,
    lang: voiceLang,
  })

  return (
    <>
      {/* Floating chat bubble */}
      <button
        onClick={() => { setIsOpen(true); setIsMinimized(false) }}
        title="Open Bachat AI Chat"
        className={twMerge(
          'fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-primary/40',
          'bg-gradient-to-br from-primary to-primary-dark text-white',
          isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
        )}
      >
        <MessageCircle size={24} />
        <span className="absolute inline-flex h-full w-full rounded-full bg-primary/40 animate-ping opacity-50" />
      </button>

      {/* Chat window */}
      <div
        className={twMerge(
          'fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-2xl shadow-2xl border border-border transition-all duration-300 origin-bottom-right',
          'bg-card',
          'w-[370px] md:w-[400px] max-w-[calc(100vw-1.5rem)]',
          isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none',
          isMinimized ? 'h-[60px]' : 'h-[580px]'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary to-primary-dark flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <BachatLogo size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-sm leading-tight">Bachat AI Coach</h3>
              <p className="text-white/70 text-xs">
                {listening ? '🔴 Listening…' : 'Finance assistant'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? 'Expand' : 'Minimize'}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors"
            >
              <Minus size={14} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              title="Close"
              className="flex items-center justify-center w-7 h-7 rounded-full bg-white/15 hover:bg-red-400/80 text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Messages area */}
        {!isMinimized && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-bg">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && (
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                      <Bot size={14} className="text-primary" />
                    </div>
                  )}
                  <div className={twMerge(
                    'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-primary to-primary-dark text-white rounded-br-sm shadow-sm shadow-primary/25'
                      : 'bg-card border border-border text-text rounded-bl-sm shadow-sm'
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                    <Bot size={14} className="text-primary" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center shadow-sm">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <form onSubmit={handleFormSubmit} className="border-t border-border bg-card p-3 flex-shrink-0">
              {/* Voice language toggle */}
              {voiceSupported && (
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                    <Languages className="w-3 h-3" />
                    Voice language:
                  </div>
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setVoiceLang('en-IN')}
                      className={twMerge(
                        'px-2 py-0.5 text-[10px] font-bold transition-colors',
                        voiceLang === 'en-IN'
                          ? 'bg-primary text-white'
                          : 'bg-bg text-text-secondary hover:bg-border/50'
                      )}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoiceLang('hi-IN')}
                      className={twMerge(
                        'px-2 py-0.5 text-[10px] font-bold transition-colors',
                        voiceLang === 'hi-IN'
                          ? 'bg-primary text-white'
                          : 'bg-bg text-text-secondary hover:bg-border/50'
                      )}
                    >
                      हिन्दी
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={listening ? 'Listening… speak now' : (user ? 'Ask about your finances…' : 'Ask about Bachat AI…')}
                  className={twMerge(
                    'flex-1 rounded-full border px-4 py-2.5 text-sm text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all',
                    listening
                      ? 'border-danger bg-danger/5 animate-pulse'
                      : 'border-border bg-bg'
                  )}
                />

                {/* Mic button */}
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={toggleVoice}
                    title={listening ? 'Stop listening' : `Voice input (${voiceLang === 'hi-IN' ? 'Hindi' : 'English'})`}
                    className={twMerge(
                      'relative flex h-10 w-10 items-center justify-center rounded-full transition-all flex-shrink-0 active:scale-95',
                      listening
                        ? 'bg-danger text-white shadow-lg shadow-danger/40'
                        : 'bg-border/50 text-text-secondary hover:bg-primary/10 hover:text-primary'
                    )}
                  >
                    {listening ? <MicOff size={16} /> : <Mic size={16} />}
                    {/* Pulse ring while recording */}
                    {listening && (
                      <span className="absolute inset-0 rounded-full bg-danger/40 animate-ping" />
                    )}
                  </button>
                )}

                {/* Send button */}
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-white disabled:opacity-40 hover:brightness-110 transition-all hover:shadow-md hover:shadow-primary/30 active:scale-95 flex-shrink-0"
                >
                  <Send size={16} className="translate-x-[1px]" />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </>
  )
}
