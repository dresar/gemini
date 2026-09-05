'use client'

import { useState, useEffect, useCallback } from 'react'
import { getKeys, deleteKey, toggleKey } from '@/lib/api'

function formatTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function StatusBadge({ dbStatus, redisStatus }) {
  if (dbStatus === 'disabled') return <span className="badge-error">Disabled</span>
  if (redisStatus === 'active') {
    return (
      <span className="badge-active">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
        Aktif
      </span>
    )
  }
  if (redisStatus === 'cooldown') {
    return (
      <span className="badge-cooldown">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-dot" />
        Cooldown
      </span>
    )
  }
  return <span className="badge-inactive">Inactive</span>
}

export default function KeysPage() {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState(null)

  const fetchKeys = useCallback(async () => {
    try {
      const data = await getKeys()
      setKeys(data.keys || [])
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKeys()
    const id = setInterval(fetchKeys, 8000)
    return () => clearInterval(id)
  }, [fetchKeys])

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus key ini?')) return
    setBusy(id)
    try { await deleteKey(id); await fetchKeys() } finally { setBusy(null) }
  }

  const handleToggle = async (id) => {
    setBusy(id)
    try { await toggleKey(id); await fetchKeys() } finally { setBusy(null) }
  }

  const filtered = keys.filter((k) => {
    const ms = search === '' || k.key_masked.toLowerCase().includes(search.toLowerCase())
    if (filter === 'active') return ms && k.redis_status === 'active' && k.db_status !== 'disabled'
    if (filter === 'cooldown') return ms && k.redis_status === 'cooldown'
    if (filter === 'disabled') return ms && k.db_status === 'disabled'
    return ms
  })

  const counts = {
    all: keys.length,
    active: keys.filter((k) => k.redis_status === 'active' && k.db_status !== 'disabled').length,
    cooldown: keys.filter((k) => k.redis_status === 'cooldown').length,
    disabled: keys.filter((k) => k.db_status === 'disabled').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">API Keys</h1>
          <p className="text-sm text-surface-500 mt-1">Kelola semua API key Google Gemini</p>
        </div>
        <button onClick={fetchKeys} className="btn-ghost text-sm flex items-center gap-2 self-start">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input type="text" placeholder="Cari key..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'Semua' },
            { key: 'active', label: 'Aktif' },
            { key: 'cooldown', label: 'Cooldown' },
            { key: 'disabled', label: 'Disabled' },
          ].map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                filter === f.key
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-surface-400 border border-surface-700/40 hover:bg-surface-800/60 hover:text-white'
              }`}>
              {f.label} ({counts[f.key]})
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card animate-fade-in overflow-hidden">
        <div className="overflow-x-auto">
          {filtered.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider border-b border-surface-800/60">
                  <th className="px-6 py-4">API Key</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Penggunaan</th>
                  <th className="px-6 py-4 text-right">Error</th>
                  <th className="px-6 py-4">Terakhir Dipakai</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((k) => (
                  <tr key={k.id} className="table-row">
                    <td className="px-6 py-4">
                      <code className="text-sm font-mono text-surface-300 bg-surface-800/50 px-2.5 py-1 rounded-lg">{k.key_masked}</code>
                    </td>
                    <td className="px-6 py-4"><StatusBadge dbStatus={k.db_status} redisStatus={k.redis_status} /></td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-white">{k.usage_count.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-sm font-semibold ${k.error_count > 0 ? 'text-rose-400' : 'text-surface-500'}`}>{k.error_count}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-500">{formatTime(k.last_used_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleToggle(k.id)} disabled={busy === k.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50 ${
                            k.db_status === 'disabled'
                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
                          }`}>
                          {k.db_status === 'disabled' ? 'Aktifkan' : 'Disable'}
                        </button>
                        <button onClick={() => handleDelete(k.id)} disabled={busy === k.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all duration-200 disabled:opacity-50">
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center">
              <svg className="w-12 h-12 mx-auto text-surface-700 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
              <p className="text-sm text-surface-500">{search || filter !== 'all' ? 'Tidak ada key yang cocok' : 'Belum ada API key. Import terlebih dahulu.'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
