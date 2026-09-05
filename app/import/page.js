'use client'

import { useState } from 'react'
import { importKeys } from '@/lib/api'

export default function ImportPage() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleImport = async () => {
    if (!input.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const data = await importKeys(input)
      if (data.error) {
        setError(data.error)
      } else {
        setResult(data)
        if (data.imported > 0) setInput('')
      }
    } catch {
      setError('Gagal terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  const lineCount = input.split('\n').filter((l) => l.trim().length > 0).length

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Import API Keys</h1>
        <p className="text-sm text-surface-500 mt-1">Masukkan API key Google Gemini, satu per baris</p>
      </div>

      <div className="glass-card p-6 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-surface-300">API Keys</label>
          {lineCount > 0 && (
            <span className="text-xs text-surface-500 font-mono bg-surface-800/60 px-2.5 py-1 rounded-md">{lineCount} key terdeteksi</span>
          )}
        </div>

        <textarea value={input} onChange={(e) => setInput(e.target.value)} disabled={loading}
          placeholder={'AIzaSyA...\nAIzaSyB...\nAIzaSyC...'} rows={10}
          className="input-field font-mono text-sm resize-none leading-relaxed" />

        <div className="flex items-center gap-4">
          <button onClick={handleImport} disabled={loading || !input.trim()} className="btn-primary flex items-center gap-2">
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Mengimport...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Import Keys
              </>
            )}
          </button>
          {input.trim() && (
            <button onClick={() => { setInput(''); setResult(null); setError(null) }} className="btn-ghost text-sm">Bersihkan</button>
          )}
        </div>
      </div>

      {result && (
        <div className="glass-card p-6 animate-fade-in border-emerald-500/20">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-3 flex-1">
              <p className="text-sm font-semibold text-emerald-400">Import Berhasil!</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface-800/50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{result.imported}</p>
                  <p className="text-xs text-surface-500 mt-1">Berhasil</p>
                </div>
                <div className="bg-surface-800/50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-amber-400">{result.duplicates}</p>
                  <p className="text-xs text-surface-500 mt-1">Duplikat</p>
                </div>
                <div className="bg-surface-800/50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-white">{result.total}</p>
                  <p className="text-xs text-surface-500 mt-1">Total Input</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="glass-card p-6 animate-fade-in border-rose-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-sm text-rose-400 font-medium">{error}</p>
          </div>
        </div>
      )}

      <div className="glass-card p-6 animate-fade-in">
        <h3 className="text-sm font-semibold text-surface-300 mb-3">Panduan Import</h3>
        <ul className="space-y-2 text-sm text-surface-500">
          <li className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5">•</span>Masukkan satu API key per baris</li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5">•</span>Key duplikat akan otomatis dilewati</li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5">•</span>Key yang berhasil diimport langsung aktif dan siap digunakan</li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5">•</span>Mendukung format pisah baris atau koma</li>
        </ul>
      </div>
    </div>
  )
}
