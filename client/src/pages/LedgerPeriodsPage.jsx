import { useState } from 'react';
import { CalendarRange, ChevronLeft, Plus, Lock, Clock, Download } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import api, { errorMessage } from '../api/client';
import { formatDate, toDateInput } from '../utils/format';
import { useCan } from '../utils/permissions';
import PageHeader from '../components/common/PageHeader';
import LedgerTable from '../components/ledger/LedgerTable';
import { buttonClass } from '../components/common/Field';

// ── helpers ─────────────────────────────────────────────────────────────────

function periodRange(p) {
  const start = formatDate(p.startDate);
  const end = p.endDate ? formatDate(p.endDate) : 'present';
  return `${start} – ${end}`;
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function recordsToCsv(records) {
  const headers = ['Date', 'Vendor', 'Invoice No', 'Description', 'Amount', 'Currency', 'Paid', 'Balance', 'Status', 'Notes'];
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = records.map((r) => [
    r.receiptDate ? new Date(r.receiptDate).toISOString().slice(0, 10) : '',
    r.vendorName,
    r.invoiceNumber ?? '',
    (r.items?.map((i) => `${i.quantity} ${i.unit} ${i.itemName}`).join('; ')) || '',
    r.amount ?? 0,
    r.currency ?? 'PKR',
    r.amountPaid ?? 0,
    ((r.amount ?? 0) - (r.amountPaid ?? 0)).toFixed(2),
    r.status ?? '',
    r.notes ?? '',
  ].map(escape).join(','));
  return [headers.join(','), ...rows].join('\n');
}

function ExportButtons({ period }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const slug = period.label.replace(/\s+/g, '_');

  const fetchSnapshot = async () => {
    setBusy(true);
    setErr('');
    try {
      const { data } = await api.get(`/periods/${period.id}/snapshot`);
      return data;
    } catch (e) {
      setErr(errorMessage(e, 'Export failed'));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const exportJson = async () => {
    const snap = await fetchSnapshot();
    if (!snap) return;
    downloadFile(JSON.stringify(snap, null, 2), `${slug}_snapshot.json`, 'application/json');
  };

  const exportCsv = async () => {
    const snap = await fetchSnapshot();
    if (!snap) return;
    downloadFile(recordsToCsv(snap.records), `${slug}_records.csv`, 'text/csv');
  };

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span className="flex gap-1">
        <button
          onClick={exportJson}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="h-3 w-3" /> JSON
        </button>
        <button
          onClick={exportCsv}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="h-3 w-3" /> CSV
        </button>
      </span>
      {err && <span className="text-xs text-rose-600">{err}</span>}
    </span>
  );
}

// ── Start New Period modal ────────────────────────────────────────────────────

function NewPeriodForm({ onSave, onCancel }) {
  const [label, setLabel] = useState('November 2026');
  const [startDate, setStartDate] = useState('2026-11-01');
  const [scheduledEndDate, setScheduledEndDate] = useState('2026-11-30');
  const [nextPeriodLabel, setNextPeriodLabel] = useState('December 2026');
  const [nextPeriodStartDate, setNextPeriodStartDate] = useState('2026-12-01');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({
        label,
        startDate,
        // Send scheduled rollover: closes at 23:59:59 on scheduledEndDate, opens next at 00:00:00.
        scheduledEndDate: `${scheduledEndDate}T23:59:59.000Z`,
        nextPeriodLabel,
        nextPeriodStartDate: `${nextPeriodStartDate}T00:00:00.000Z`,
      });
    } catch (err) {
      setError(errorMessage(err, 'Could not create period'));
    } finally {
      setSaving(false);
    }
  };

  const inp = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Period label</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} required className={inp} placeholder="e.g. November 2026" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Starts on</label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className={inp} />
        <p className="mt-1 text-xs text-slate-500">Records on or after this date appear in this period. Older records move to the archive.</p>
      </div>
      <hr className="border-slate-200" />
      <p className="text-xs font-medium text-slate-600">Auto-rollover (optional)</p>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Auto-close on</label>
        <input type="date" value={scheduledEndDate} onChange={(e) => setScheduledEndDate(e.target.value)} className={inp} />
        <p className="mt-1 text-xs text-slate-500">This period will close automatically at 11:59 PM on this date.</p>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Next period label</label>
        <input value={nextPeriodLabel} onChange={(e) => setNextPeriodLabel(e.target.value)} className={inp} placeholder="e.g. December 2026" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Next period starts on</label>
        <input type="date" value={nextPeriodStartDate} onChange={(e) => setNextPeriodStartDate(e.target.value)} className={inp} />
        <p className="mt-1 text-xs text-slate-500">A new period opens automatically at 12:00 AM on this date.</p>
      </div>
      {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className={buttonClass.secondary}>Cancel</button>
        <button type="submit" disabled={saving} className={buttonClass.primary}>{saving ? 'Saving…' : 'Start Period'}</button>
      </div>
    </form>
  );
}

// ── Close Period modal ────────────────────────────────────────────────────────

function ClosePeriodForm({ active, onSave, onCancel }) {
  const [endDate, setEndDate] = useState('2026-10-31');
  const [nextLabel, setNextLabel] = useState('December 2026');
  const [nextStartDate, setNextStartDate] = useState('2026-11-01');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(active.id, {
        endDate: `${endDate}T23:59:59.000Z`,
        nextLabel,
        nextStartDate,
      });
    } catch (err) {
      setError(errorMessage(err, 'Could not close period'));
    } finally {
      setSaving(false);
    }
  };

  const inp = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-slate-600">Closing <strong>{active.label}</strong> will archive all records up to the end date and open a new period.</p>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Close current period on</label>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className={inp} />
      </div>
      <hr className="border-slate-200" />
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">New period label</label>
        <input value={nextLabel} onChange={(e) => setNextLabel(e.target.value)} required className={inp} placeholder="e.g. December 2026" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">New period starts on</label>
        <input type="date" value={nextStartDate} onChange={(e) => setNextStartDate(e.target.value)} required className={inp} />
      </div>
      {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className={buttonClass.secondary}>Cancel</button>
        <button type="submit" disabled={saving} className={`${buttonClass.primary} bg-rose-600 hover:bg-rose-700 focus:ring-rose-400`}>{saving ? 'Closing…' : 'Close Period'}</button>
      </div>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LedgerPeriodsPage() {
  const periods = useFinanceStore((s) => s.periods);
  const createPeriod = useFinanceStore((s) => s.createPeriod);
  const closePeriod = useFinanceStore((s) => s.closePeriod);
  const can = useCan();

  const [showNewForm, setShowNewForm] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [browsing, setBrowsing] = useState(null); // period object to browse archive

  const active = periods.find((p) => !p.endDate);
  const archived = periods.filter((p) => p.endDate).sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

  if (browsing) {
    return (
      <>
        <button
          onClick={() => setBrowsing(null)}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Ledger Periods
        </button>
        <PageHeader
          title={browsing.label}
          subtitle={`Archive · ${periodRange(browsing)}`}
        />
        <LedgerTable
          from={toDateInput(browsing.startDate)}
          to={toDateInput(browsing.endDate)}
          title={`${browsing.label} — Vendor Ledger`}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Ledger Periods"
        subtitle="Accounting periods control which vendor ledger records show on the dashboard."
        actions={
          can('managePeriods') && !active && !showNewForm && (
            <button onClick={() => setShowNewForm(true)} className={`${buttonClass.primary} inline-flex items-center gap-1.5`}>
              <Plus className="h-4 w-4" /> Start New Period
            </button>
          )
        }
      />

      {/* Active period card */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Active Period</h2>
        </div>
        <div className="p-4">
          {active ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CalendarRange className="h-8 w-8 text-indigo-500 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-900">{active.label}</div>
                  <div className="text-sm text-slate-500">Started {formatDate(active.startDate)} · ongoing</div>
                  <div className="mt-0.5 text-xs text-slate-400">Only records from {formatDate(active.startDate)} onward appear in the vendor ledger.</div>
                  {active.scheduledEndDate && (
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                      <Clock className="h-3 w-3" />
                      Auto-closes {formatDate(active.scheduledEndDate)} at 11:59 PM · next: {active.nextPeriodLabel}
                    </div>
                  )}
                </div>
              </div>
              {can('managePeriods') && !showCloseForm && (
                <button
                  onClick={() => setShowCloseForm(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
                >
                  <Lock className="h-4 w-4" /> Close Period
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No active period — all vendor ledger records are visible.
            </p>
          )}

          {showNewForm && (
            <div className="mt-4 max-w-md">
              <NewPeriodForm
                onSave={async (payload) => { await createPeriod(payload); setShowNewForm(false); }}
                onCancel={() => setShowNewForm(false)}
              />
            </div>
          )}

          {showCloseForm && active && (
            <div className="mt-4 max-w-md">
              <ClosePeriodForm
                active={active}
                onSave={async (id, payload) => { await closePeriod(id, payload); setShowCloseForm(false); }}
                onCancel={() => setShowCloseForm(false)}
              />
            </div>
          )}
        </div>
      </section>

      {/* Archived periods */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Archived Periods <span className="text-sm font-normal text-slate-400">({archived.length})</span></h2>
        </div>
        {archived.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-400">No archived periods yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2">Period</th>
                <th className="px-4 py-2">Date range</th>
                <th className="px-4 py-2 text-right">Export snapshot</th>
                <th className="px-4 py-2 text-right">Browse</th>
              </tr>
            </thead>
            <tbody>
              {archived.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 align-middle">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.label}</td>
                  <td className="px-4 py-3 text-slate-500">{periodRange(p)}</td>
                  <td className="px-4 py-3 text-right">
                    <ExportButtons period={p} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setBrowsing(p)}
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Browse records
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
