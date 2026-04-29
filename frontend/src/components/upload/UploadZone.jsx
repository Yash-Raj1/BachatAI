import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Lock, Eye, EyeOff } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import api from '../../lib/api'
import { ProgressBar } from '../ui/ProgressBar'

export function UploadZone({ onUploadComplete }) {
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('idle') // idle, password, uploading, parsing, success, error
  const [errorMsg, setErrorMsg] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      const droppedFile = acceptedFiles[0]
      setFile(droppedFile)
      setErrorMsg('')

      // If it's a PDF, show the password step; CSVs don't need passwords
      if (droppedFile.name.toLowerCase().endsWith('.pdf')) {
        setStatus('password')
      } else {
        handleUpload(droppedFile, '')
      }
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv']
    },
    maxFiles: 1
  })

  const handleUpload = async (fileObj, pwd) => {
    setStatus('uploading')
    setProgress(10)
    setErrorMsg('')

    const formData = new FormData()
    formData.append('statement', fileObj || file)
    if (pwd) {
      formData.append('password', pwd)
    }

    try {
      const interval = setInterval(() => {
        setProgress(p => Math.min(p + 15, 80))
      }, 500)

      setStatus('parsing')
      const response = await api.post('/upload/statement', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      clearInterval(interval)
      setProgress(100)
      setStatus('success')
      
      if (onUploadComplete) {
        setTimeout(() => onUploadComplete(response.data), 1000)
      }
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.response?.data?.error || 'Failed to parse statement')
    }
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    handleUpload(file, password)
  }

  const handleSkipPassword = () => {
    handleUpload(file, '')
  }

  return (
    <div className="w-full">
      {/* ── Step 1: Drag & Drop ── */}
      {status === 'idle' && (
        <div 
          {...getRootProps()} 
          className={twMerge(
            "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-colors cursor-pointer bg-card",
            isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary hover:bg-primary/5"
          )}
        >
          <input {...getInputProps()} />
          <UploadCloud className="mb-4 h-12 w-12 text-text-secondary" />
          <h3 className="mb-2 text-lg font-bold text-text">Upload Bank Statement</h3>
          <p className="text-sm text-text-secondary w-full max-w-xs mx-auto">
            Drag and drop your SBI, HDFC, ICICI, or Axis PDF/CSV statement, or click to browse.
          </p>
        </div>
      )}

      {/* ── Step 2: Password Input (PDFs only) ── */}
      {status === 'password' && (
        <div className="rounded-xl border border-border p-6 shadow-sm bg-card">
          {/* File info */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-text">{file?.name}</h4>
              <p className="text-sm text-text-secondary">{(file?.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          </div>

          {/* Password form */}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-text mb-2">
                <Lock className="w-4 h-4 text-primary" />
                PDF Password <span className="text-xs font-normal text-text-secondary">(if protected)</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password if PDF is locked"
                  className="w-full px-4 py-3 pr-10 rounded-xl border border-border bg-bg text-sm text-text placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-text-secondary mt-1.5">
                Most bank statements use your Date of Birth (DDMMYYYY) or Customer ID as password.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-all active:scale-[0.98] shadow-md shadow-primary/20"
              >
                <Lock className="w-4 h-4" />
                Upload with Password
              </button>
              <button
                type="button"
                onClick={handleSkipPassword}
                className="px-5 py-3 rounded-xl border border-border text-text-secondary font-bold text-sm hover:bg-bg transition-all active:scale-[0.98]"
              >
                Skip
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Step 3: Upload Progress ── */}
      {(status === 'uploading' || status === 'parsing' || status === 'success' || status === 'error') && (
        <div className="rounded-xl border border-border p-6 shadow-sm bg-card">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-text">{file?.name}</h4>
              <p className="text-sm text-text-secondary">{(file?.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
            {status === 'success' && <CheckCircle2 className="h-6 w-6 text-green-500" />}
            {status === 'error' && <AlertCircle className="h-6 w-6 text-red-500" />}
          </div>
          
          {status !== 'error' && status !== 'success' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-primary">
                  {status === 'uploading' ? 'Uploading...' : 'AI is Parsing & Categorizing...'}
                </span>
                <span className="text-gray-500">{progress}%</span>
              </div>
              <ProgressBar value={progress} max={100} />
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <div className="text-sm text-red-500">{errorMsg}</div>
              <button
                onClick={() => {
                  setStatus('idle')
                  setFile(null)
                  setPassword('')
                  setProgress(0)
                  setErrorMsg('')
                }}
                className="text-sm font-bold text-primary hover:underline"
              >
                ← Try again with a different file
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
