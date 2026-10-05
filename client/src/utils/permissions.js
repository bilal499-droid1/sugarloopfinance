import { useAuthStore } from '../store/useAuthStore';

// Mirrors the server rules (server/src/middleware/auth.js). The server is the
// source of truth; these only hide controls a role can't use.
const RULES = {
  createInvoice: ['ADMIN', 'MANAGER', 'STAFF'],
  transferStock: ['ADMIN', 'MANAGER', 'STAFF'],
  editInvoice: ['ADMIN', 'MANAGER'],
  verifyInvoice: ['ADMIN', 'MANAGER'],
  recordPayment: ['ADMIN', 'MANAGER'],
  manageVendors: ['ADMIN', 'MANAGER'],
  manageItems: ['ADMIN', 'MANAGER'],
  adjustStock: ['ADMIN', 'MANAGER'],
  deleteInvoice: ['ADMIN'],
  deletePayment: ['ADMIN'],
  deleteVendor: ['ADMIN'],
  deleteItem: ['ADMIN'],
  manageUsers: ['ADMIN'],
};

export const can = (user, action) => Boolean(user && RULES[action]?.includes(user.role));

export const useCan = () => {
  const user = useAuthStore((s) => s.user);
  return (action) => can(user, action);
};

export const ROLE_LABELS = { ADMIN: 'Admin', MANAGER: 'Manager', STAFF: 'Staff' };
