export const formatCurrency = (value = 0, currency = 'PKR') =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);

export const formatNumber = (value = 0) => new Intl.NumberFormat('en-PK', { maximumFractionDigits: 2 }).format(value);

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

// yyyy-mm-dd for <input type="date">
export const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
export const today = () => toDateInput(new Date());

// "2026-09" keys and labels for month grouping
export const monthKey = (value) => toDateInput(value).slice(0, 7);
export const monthLabel = (key) =>
  new Date(`${key}-01T00:00:00`).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });

export const percentChange = (current, previous) =>
  previous ? ((current - previous) / previous) * 100 : null;

export const STATUSES = ['PAID', 'PENDING', 'FLAGGED'];
export const CURRENCIES = ['PKR', 'USD'];
export const PAYMENT_METHODS = ['CASH', 'BANK', 'CHEQUE', 'ONLINE', 'OTHER'];
