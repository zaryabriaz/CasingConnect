'use client';

import { useEffect, useState } from 'react';
import { errorText, listAdminUsers } from '@/lib/api';
import { labelOf, ROLES } from '@/lib/labels';
import { AdminUser } from '@/lib/types';

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAdminUsers()
      .then(setRows)
      .catch((caught) => setError(errorText(caught)));
  }, []);

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1>Users</h1>
          <p className="admin-lead">
            Everyone with a CasingConnect login, including platform admins.
          </p>
        </div>
        {rows ? (
          <div className="admin-stats">
            <div className="admin-stat">
              <strong>{rows.length}</strong>
              <span>users</span>
            </div>
            <div className="admin-stat brass">
              <strong>{rows.filter((row) => row.isSuperAdmin).length}</strong>
              <span>admins</span>
            </div>
          </div>
        ) : null}
      </div>

      {error ? <p className="admin-flash bad">{error}</p> : null}

      <div className="admin-panel">
        {!rows ? (
          <p className="admin-empty">Loading users…</p>
        ) : rows.length === 0 ? (
          <p className="admin-empty">No users yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Access</th>
                <th>Memberships</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td data-label="Person">
                    <strong>{row.name}</strong>
                    <div className="muted">{row.email}</div>
                  </td>
                  <td data-label="Access">
                    {row.isSuperAdmin ? (
                      <span className="admin-badge">Super admin</span>
                    ) : (
                      <span className="muted">Member</span>
                    )}
                  </td>
                  <td data-label="Memberships">
                    {row.memberships.length === 0 ? (
                      <span className="muted">—</span>
                    ) : (
                      row.memberships.map((membership) => (
                        <div key={`${membership.businessId}-${membership.role}`} className="muted">
                          {membership.businessName} · {labelOf(ROLES, membership.role)}
                          {!membership.active ? ' (inactive)' : ''}
                        </div>
                      ))
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
