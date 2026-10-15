import { Croissant, Printer } from 'lucide-react';
import { buttonClass } from '../../components/common/Field';

// Filters + print button on screen; on paper only the letterhead and the report.
export default function ReportShell({ title, period, filters, children }) {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-end gap-3">{filters}</div>
        <button onClick={() => window.print()} className={`${buttonClass.primary} inline-flex items-center gap-1.5`}>
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>

      <article className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800 sm:p-6 print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-300 pb-3">
          <div className="flex items-center gap-2">
            <Croissant className="h-7 w-7 text-amber-600" />
            <div>
              <div className="font-semibold">Sugarloop</div>
              <div className="text-xs text-slate-500">Central Warehouse</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold tracking-wide">{title}</div>
            <div className="text-xs text-slate-500">{period}</div>
          </div>
        </header>
        {children}
      </article>
    </>
  );
}
