export default function StatCard({ title, value, subtitle, icon, glowClass }) {
  return (
    <div className={`glass-card p-6 animate-fade-in ${glowClass || ''}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-surface-400">{title}</p>
          <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-surface-500">{subtitle}</p>}
        </div>
        <div className="w-12 h-12 rounded-xl bg-surface-800/60 flex items-center justify-center text-surface-400">
          {icon}
        </div>
      </div>
    </div>
  )
}
