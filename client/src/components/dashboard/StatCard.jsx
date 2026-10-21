export default function StatCard({ icon: Icon, label, value, tone = 'text-slate-900', onClick }) {
  const interactive = 'cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-shadow';
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-4 ${onClick ? interactive : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    >
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</div>
    </div>
  );
}
