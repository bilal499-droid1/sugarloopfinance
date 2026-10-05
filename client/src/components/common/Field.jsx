export const inputClass =
  'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-500';

export const buttonClass = {
  primary: 'rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50',
  secondary: 'rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50',
  danger: 'rounded-md border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50',
};

export default function Field({ label, children, className = '' }) {
  return (
    <label className={`block text-sm text-slate-700 ${className}`}>
      {label}
      {children}
    </label>
  );
}
