import { useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { ROLE_LABELS } from '../utils/permissions';
import { formatDate } from '../utils/format';
import PageHeader from '../components/common/PageHeader';
import ConfirmButton from '../components/common/ConfirmButton';
import { buttonClass } from '../components/common/Field';
import UserFormModal from '../components/users/UserFormModal';

const ROLE_TONE = { ADMIN: 'bg-indigo-100 text-indigo-700', MANAGER: 'bg-sky-100 text-sky-700', STAFF: 'bg-slate-100 text-slate-700' };

// Admin-only: add, edit and remove admins, managers and staff.
export default function UsersPage() {
  const me = useAuthStore((s) => s.user);
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null); // user, or {} for new
  const [error, setError] = useState('');

  const load = () =>
    api
      .get('/users')
      .then((res) => setUsers(res.data))
      .catch((err) => setError(errorMessage(err)));

  useEffect(() => {
    load();
  }, []);

  const save = async ({ id, ...user }) => {
    if (id) await api.patch(`/users/${id}`, user);
    else await api.post('/users', user);
    await load();
  };

  const remove = async (id) => {
    setError('');
    try {
      await api.delete(`/users/${id}`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Admins manage everyone. There must always be at least one admin."
        actions={
          <button onClick={() => setEditing({})} className={`${buttonClass.primary} inline-flex items-center gap-1.5`}>
            <Plus className="h-4 w-4" /> Add user
          </button>
        }
      />
      {error && <p className="rounded-md bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Added</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {u.name} {u.id === me.id && <span className="text-xs font-normal text-slate-400">(you)</span>}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{u.email}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_TONE[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                  </td>
                  <td className="px-4 py-2 text-slate-500">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(u)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label={`Edit ${u.name}`}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    {u.id !== me.id && (
                      <ConfirmButton onConfirm={() => remove(u.id)} title="Delete this user?" message={`${u.name} will no longer be able to sign in.`} className="rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">
                        Delete
                      </ConfirmButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editing && <UserFormModal user={editing.id ? editing : null} onSave={save} onClose={() => setEditing(null)} />}
    </>
  );
}
