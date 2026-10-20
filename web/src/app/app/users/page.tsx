'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Banner, Field } from '@/components/ui';
import { useSession } from '@/components/session';
import { api, errorText } from '@/lib/api';
import { canManage, labelOf, ROLES } from '@/lib/labels';
import { Member, Role } from '@/lib/types';

function isLocalWorkerEmail(email: string) {
  return email.endsWith('@users.casingconnect.local');
}

export default function UsersPage() {
  const session = useSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('STAFF');
  const manage = canManage(session.role);
  const workerMode = role === 'WORKER';

  function load() {
    return api<Member[]>('/members')
      .then(setMembers)
      .catch((caught) => setError(errorText(caught)));
  }

  useEffect(() => {
    void load();
  }, [session.business.id]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const password = String(form.get('password') ?? '');
    const email = String(form.get('email') ?? '').trim();
    setError(null);
    try {
      await api('/members', {
        method: 'POST',
        body: JSON.stringify({
          name: form.get('name'),
          role: form.get('role'),
          title: form.get('title') || undefined,
          ...(email ? { email } : {}),
          ...(password ? { password } : {}),
        }),
      });
      formEl.reset();
      setRole('STAFF');
      await load();
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  async function setActive(member: Member, active: boolean) {
    setError(null);
    try {
      await api(`/members/${member.id}`, { method: 'PATCH', body: JSON.stringify({ active }) });
      await load();
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  const workers = members.filter((member) => member.role === 'WORKER');
  const staff = members.filter((member) => member.role !== 'WORKER');

  return (
    <div className="stack">
      <div>
        <p className="tiny eyebrow">Users</p>
        <h1>Your people</h1>
        <p className="muted">
          Staff who sign in, and workers on the floor (Ahmed, Amjad, …). This is not Partners — partners are outside suppliers and customers.
        </p>
      </div>
      {error ? <Banner kind="bad">{error}</Banner> : null}
      <div className="two">
        <div className="stack">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id}>
                    <td>
                      {member.name}
                      <div className="tiny">{member.email}</div>
                      {!member.active ? <div className="tiny">Inactive</div> : null}
                    </td>
                    <td>
                      {labelOf(ROLES, member.role)}
                      {member.title ? <div className="tiny">{member.title}</div> : null}
                    </td>
                    <td>
                      {manage && member.userId !== session.user.id ? (
                        <button className="btn ghost" type="button" onClick={() => void setActive(member, !member.active)}>
                          {member.active ? 'Remove access' : 'Restore'}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="muted">
                      No staff users yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="table-wrap">
            <h2>Workers</h2>
            <p className="muted tiny">Floor people used when issuing material and recording production.</p>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {workers.map((member) => (
                  <tr key={member.id}>
                    <td>
                      {member.name}
                      {!isLocalWorkerEmail(member.email) ? <div className="tiny">{member.email}</div> : null}
                      {!member.active ? <div className="tiny">Inactive</div> : null}
                    </td>
                    <td>
                      {manage ? (
                        <button className="btn ghost" type="button" onClick={() => void setActive(member, !member.active)}>
                          {member.active ? 'Deactivate' : 'Restore'}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {workers.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="muted">
                      No workers yet. Add them with role Worker on the form.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {manage ? (
          <form className="card pad form" onSubmit={onSubmit}>
            <h2>Add a user</h2>
            <Field label="Name">
              <input name="name" required minLength={2} placeholder={workerMode ? 'Ahmed' : undefined} />
            </Field>
            <Field label="Role">
              <select name="role" value={role} onChange={(event) => setRole(event.target.value as Role)}>
                {ROLES.filter(([code]) => code !== 'OWNER').map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            {workerMode ? (
              <p className="muted tiny">Email and password are optional for workers who do not need to sign in.</p>
            ) : null}
            <Field label={workerMode ? 'Email (optional)' : 'Email'}>
              <input name="email" type="email" required={!workerMode} />
            </Field>
            <Field label={workerMode ? 'Password (optional)' : 'Password for a new account'}>
              <input name="password" type="password" minLength={workerMode ? undefined : 8} />
            </Field>
            <Field label="Title">
              <input name="title" placeholder={workerMode ? 'Floor, sorting…' : 'Accounts, supervisor…'} />
            </Field>
            <button className="btn primary" type="submit">
              {workerMode ? 'Add worker' : 'Add user'}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
