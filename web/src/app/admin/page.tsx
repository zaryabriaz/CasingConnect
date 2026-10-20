'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  errorText,
  impersonateBusiness,
  listAdminBusinesses,
  saveToken,
  updateAdminBusiness,
} from '@/lib/api';
import { ACTIVITIES, labelOf } from '@/lib/labels';
import { AdminBusiness } from '@/lib/types';

export default function AdminBusinessesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AdminBusiness[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const next = await listAdminBusinesses();
    setRows(next);
  }

  useEffect(() => {
    load().catch((caught) => setError(errorText(caught)));
  }, []);

  const stats = useMemo(() => {
    if (!rows) return null;
    return {
      total: rows.length,
      active: rows.filter((row) => row.active).length,
      suspended: rows.filter((row) => !row.active).length,
      sites: rows.filter((row) => row.publicSiteEnabled).length,
    };
  }, [rows]);

  async function toggleActive(row: AdminBusiness) {
    setBusyId(row.id);
    setError(null);
    try {
      await updateAdminBusiness(row.id, { active: !row.active });
      await load();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusyId(null);
    }
  }

  async function togglePublicSite(row: AdminBusiness) {
    setBusyId(row.id);
    setError(null);
    try {
      await updateAdminBusiness(row.id, { publicSiteEnabled: !row.publicSiteEnabled });
      await load();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusyId(null);
    }
  }

  async function openBooks(row: AdminBusiness) {
    setBusyId(row.id);
    setError(null);
    try {
      const session = await impersonateBusiness(row.id);
      saveToken(session.accessToken);
      router.push('/app');
    } catch (caught) {
      setError(errorText(caught));
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1>Businesses</h1>
          <p className="admin-lead">
            Support firms, suspend access, and control Activate website for each company.
          </p>
        </div>
        {stats ? (
          <div className="admin-stats">
            <div className="admin-stat">
              <strong>{stats.total}</strong>
              <span>firms</span>
            </div>
            <div className="admin-stat">
              <strong>{stats.active}</strong>
              <span>active</span>
            </div>
            {stats.suspended ? (
              <div className="admin-stat warn">
                <strong>{stats.suspended}</strong>
                <span>suspended</span>
              </div>
            ) : null}
            <div className="admin-stat brass">
              <strong>{stats.sites}</strong>
              <span>sites on</span>
            </div>
          </div>
        ) : null}
      </div>

      {error ? <p className="admin-flash bad">{error}</p> : null}

      <div className="admin-biz-list">
        {!rows ? (
          <p className="admin-empty">Loading businesses…</p>
        ) : rows.length === 0 ? (
          <p className="admin-empty">No businesses yet.</p>
        ) : (
          rows.map((row) => {
            const place = [row.city, row.country].filter(Boolean).join(', ') || 'No location';
            const busy = busyId === row.id;

            return (
              <article key={row.id} className={`admin-biz-card${row.active ? '' : ' is-off'}`}>
                <div className="admin-biz-card-main">
                  <div className="admin-biz-card-head">
                    <div className="admin-biz-card-title">
                      <h2>{row.name}</h2>
                      <p className="admin-biz-slug">{row.slug}</p>
                    </div>
                    <div className="admin-biz-flags">
                      <span className={`admin-badge${row.active ? '' : ' off'}`}>
                        {row.active ? 'Active' : 'Suspended'}
                      </span>
                      <span className={`admin-badge${row.publicSiteEnabled ? ' reviewed' : ' off'}`}>
                        {row.publicSiteEnabled ? 'Site on' : 'Site off'}
                      </span>
                    </div>
                  </div>

                  <div className="admin-biz-meta">
                    <span>{place}</span>
                    <span>
                      {row.memberCount} member{row.memberCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  {row.activities.length ? (
                    <div className="admin-chip-row">
                      {row.activities.map((code) => (
                        <span key={code} className="admin-chip">
                          {labelOf(ACTIVITIES, code)}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {row.publicSiteEnabled ? (
                    <div className="admin-biz-site">
                      {row.publicSitePublished ? (
                        <Link href={`/site/${row.slug}`} target="_blank">
                          Live site · /site/{row.slug}
                        </Link>
                      ) : (
                        <span>Website enabled · not published yet</span>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="admin-biz-card-actions">
                  <button
                    type="button"
                    className="admin-btn primary"
                    disabled={!row.active || busy}
                    onClick={() => void openBooks(row)}
                  >
                    Open books
                  </button>
                  <button
                    type="button"
                    className={`admin-btn${row.publicSiteEnabled ? ' warn' : ''}`}
                    disabled={busy}
                    title={
                      row.publicSiteEnabled
                        ? 'Disable Activate website for this business'
                        : 'Allow Activate website in their portal'
                    }
                    onClick={() => void togglePublicSite(row)}
                  >
                    {row.publicSiteEnabled ? 'Site off' : 'Site on'}
                  </button>
                  <button
                    type="button"
                    className={`admin-btn${row.active ? ' warn' : ''}`}
                    disabled={busy}
                    onClick={() => void toggleActive(row)}
                  >
                    {row.active ? 'Suspend' : 'Activate'}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </>
  );
}
