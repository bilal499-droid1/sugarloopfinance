const STYLES = {
  PAID: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  FLAGGED: 'bg-rose-100 text-rose-700',
};

export default function StatusBadge({ status }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>{status}</span>;
}
