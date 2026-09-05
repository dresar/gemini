'use client'

import { useState, useEffect, useCallback } from 'react'
import { getStats } from '@/lib/api'
import StatCard from '@/components/StatCard'

function formatTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return `${diff}d lalu`
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function EventBadge({ event }) {
  const cls = { success: 'badge-active', cooldown: 'badge-cooldown', error: 'badge-error' }
  return <span className={cls[event] || 'badge-inactive'}>{event}</span>
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStats = useCallback(async () => {
    try {
      const data = await getStats()
      if (data.error) throw new Error(data.error)
      setStats(data)
      setError(null)
    } catch (err) {
      setError(err.message || 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 10000)
    return () => clearInterval(interval)
  }, [fetchStats])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-surface-500">Memuat dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-rose-500/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-rose-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-rose-400 font-medium mb-2">{error}</p>
          <p className="text-sm text-surface-500 mb-4">Pastikan environment variables sudah diset dengan benar.</p>
          <button onClick={fetchStats} className="btn-primary text-sm">Coba Lagi</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-surface-500 mt-1">Monitoring sistem rotasi API key Gemini</p>
        </div>
        <button onClick={fetchStats} className="btn-ghost text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total API Keys" value={stats.total_keys} subtitle="Terdaftar di database" glowClass="stat-glow-blue"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>} />
        <StatCard title="Key Aktif" value={stats.active_keys} subtitle="Siap digunakan" glowClass="stat-glow-green"
          icon={<svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatCard title="Key Cooldown" value={stats.cooldown_keys} subtitle="Menunggu pulih" glowClass="stat-glow-amber"
          icon={<svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatCard title="Success Rate" value={`${stats.success_rate}%`} subtitle={`${stats.success_count} / ${stats.total_requests} request`} glowClass="stat-glow-violet"
          icon={<svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>} />
      </div>

      {/* Request Distribution Bar */}
      <div className="glass-card p-6 animate-fade-in">
        <h2 className="text-base font-semibold text-white mb-4">Distribusi Request</h2>
        <div className="flex items-center gap-2">
          {stats.total_requests > 0 ? (
            <>
              <div className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${stats.success_rate}%`, minWidth: stats.success_count > 0 ? '8px' : '0' }} />
              <div className="h-3 rounded-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-500"
                style={{ width: `${100 - stats.success_rate}%`, minWidth: stats.error_count > 0 ? '8px' : '0' }} />
            </>
          ) : (
            <div className="h-3 w-full rounded-full bg-surface-800" />
          )}
        </div>
        <div className="flex items-center gap-6 mt-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-surface-400">Sukses ({stats.success_count})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-surface-400">Error ({stats.error_count})</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-card animate-fade-in">
        <div className="px-6 py-4 border-b border-surface-800/60">
          <h2 className="text-base font-semibold text-white">Aktivitas Terbaru</h2>
        </div>
        <div className="overflow-x-auto">
          {stats.recent_logs && stats.recent_logs.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Event</th>
                  <th className="px-6 py-3">API Key</th>
                  <th className="px-6 py-3">Detail</th>
                  <th className="px-6 py-3">Waktu</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_logs.map((log, i) => (
                  <tr key={log.id || i} className="table-row">
                    <td className="px-6 py-3.5"><EventBadge event={log.event} /></td>
                    <td className="px-6 py-3.5">
                      <code className="text-xs font-mono text-surface-400 bg-surface-800/50 px-2 py-1 rounded-md">{log.key_masked}</code>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-surface-400 max-w-[200px] truncate">{log.detail || '—'}</td>
                    <td className="px-6 py-3.5 text-sm text-surface-500">{formatTime(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-surface-500">Belum ada aktivitas tercatat</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
