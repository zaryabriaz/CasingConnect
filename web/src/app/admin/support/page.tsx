'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useAdminSession } from '@/components/admin-session';
import { api, errorText } from '@/lib/api';

type SupportMessage = {
  id: string;
  body: string;
  fromUserId: string;
  fromUserName: string;
  fromRole: 'COMPANY' | 'ADMIN';
  createdAt: string;
};

type SupportThread = {
  id: string;
  businessId: string;
  businessName: string;
  businessCountry: string | null;
  status: 'OPEN' | 'CLOSED';
  lastMessageAt: string;
  lastMessagePreview?: string | null;
  lastMessageRole?: 'COMPANY' | 'ADMIN' | null;
  messageCount?: number;
  messages?: SupportMessage[];
};

function formatWhen(iso: string) {
  try {
    const date = new Date(iso);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function dayLabel(iso: string) {
  try {
    const date = new Date(iso);
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === now.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 12h14M13 6l7 6-7 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AdminSupportPage() {
  useAdminSession();
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [active, setActive] = useState<SupportThread | null>(null);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [mobilePane, setMobilePane] = useState<'list' | 'chat'>('list');
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  function resizeComposer() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  async function loadThreads() {
    try {
      const data = await api<SupportThread[]>('/admin/support/threads');
      setThreads(data);
      if (!activeIdRef.current && data[0] && window.matchMedia('(min-width: 901px)').matches) {
        setActiveId(data[0].id);
      }
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  async function loadThread(id: string) {
    setLoadingThread(true);
    setError(null);
    try {
      const data = await api<SupportThread>(`/admin/support/threads/${id}`);
      setActive(data);
      const list = data.messages ?? [];
      setMessages(list);
      lastIdRef.current = list[list.length - 1]?.id ?? null;
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setLoadingThread(false);
    }
  }

  async function pollMessages() {
    const id = activeIdRef.current;
    if (!id) return;
    const afterId = lastIdRef.current;
    try {
      const newer = await api<SupportMessage[]>(
        `/admin/support/threads/${id}/messages${
          afterId ? `?afterId=${encodeURIComponent(afterId)}` : ''
        }`,
      );
      if (newer.length === 0) return;
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const merged = [...prev];
        for (const row of newer) {
          if (!seen.has(row.id)) merged.push(row);
        }
        lastIdRef.current = merged[merged.length - 1]?.id ?? lastIdRef.current;
        return merged;
      });
      void loadThreads();
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void loadThreads();
  }, []);

  useEffect(() => {
    if (!activeId) return;
    void loadThread(activeId);
  }, [activeId]);

  useEffect(() => {
    const timer = window.setInterval(() => void pollMessages(), 4000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    resizeComposer();
  }, [body]);

  async function onSend(event: FormEvent) {
    event.preventDefault();
    if (!activeId || !body.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api<SupportMessage>(`/admin/support/threads/${activeId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: body.trim() }),
      });
      setBody('');
      setMessages((prev) => {
        if (prev.some((m) => m.id === created.id)) return prev;
        const next = [...prev, created];
        lastIdRef.current = created.id;
        return next;
      });
      await loadThreads();
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(next: 'OPEN' | 'CLOSED') {
    if (!activeId) return;
    setBusy(true);
    try {
      const updated = await api<SupportThread>(`/admin/support/threads/${activeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      setActive(updated);
      await loadThreads();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  function selectThread(id: string) {
    setActiveId(id);
    setMobilePane('chat');
  }

  function backToList() {
    setMobilePane('list');
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  const waitingCount = threads.filter(
    (t) => t.lastMessageRole === 'COMPANY' && t.status === 'OPEN',
  ).length;

  let lastDay = '';

  return (
    <div className="admin-support-page">
      <div className="admin-page-head admin-support-head">
        <div>
          <h1>Support chat</h1>
          <p className="admin-lead">
            Reply to companies in-app. Global company chat is coming soon.
          </p>
        </div>
        <div className="admin-stats">
          <div className="admin-stat">
            <strong>{threads.length}</strong>
            <span>threads</span>
          </div>
          <div className={`admin-stat${waitingCount ? ' brass' : ''}`}>
            <strong>{waitingCount}</strong>
            <span>waiting</span>
          </div>
        </div>
      </div>

      {error ? <p className="admin-flash bad">{error}</p> : null}

      <div
        className={`admin-support-layout${mobilePane === 'chat' ? ' show-chat' : ' show-list'}`}
      >
        <div className="admin-support-list">
          <div className="admin-support-list-bar">
            <strong>Inbox</strong>
            <button type="button" className="admin-btn ghost" onClick={() => void loadThreads()}>
              Refresh
            </button>
          </div>
          {threads.length === 0 ? (
            <p className="admin-support-empty">No support chats yet.</p>
          ) : (
            <ul className="admin-support-thread-list">
              {threads.map((row) => {
                const selected = row.id === activeId;
                const waiting = row.lastMessageRole === 'COMPANY' && row.status === 'OPEN';
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={`admin-support-thread${selected ? ' is-active' : ''}${
                        waiting ? ' is-waiting' : ''
                      }`}
                      onClick={() => selectThread(row.id)}
                    >
                      <span className="admin-support-avatar" aria-hidden="true">
                        {initials(row.businessName)}
                      </span>
                      <span className="admin-support-thread-body">
                        <span className="admin-support-thread-top">
                          <strong>{row.businessName}</strong>
                          <em>{formatWhen(row.lastMessageAt)}</em>
                        </span>
                        <span className="admin-support-thread-sub">
                          {row.businessCountry || '—'}
                          {waiting ? <span className="admin-support-pill">Needs reply</span> : null}
                          {row.status === 'CLOSED' ? (
                            <span className="admin-support-pill muted">Closed</span>
                          ) : null}
                        </span>
                        <span className="admin-support-preview">
                          {row.lastMessagePreview || 'No messages'}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="admin-support-pane">
          {!activeId || !active ? (
            <div className="admin-support-empty-pane">
              <strong>Select a conversation</strong>
              <p>Choose a company from the inbox to read and reply.</p>
            </div>
          ) : (
            <>
              <div className="admin-support-pane-bar">
                <button
                  type="button"
                  className="admin-support-back"
                  onClick={backToList}
                  aria-label="Back to inbox"
                >
                  ←
                </button>
                <span className="admin-support-avatar" aria-hidden="true">
                  {initials(active.businessName)}
                </span>
                <div className="admin-support-pane-titles">
                  <strong>{active.businessName}</strong>
                  <span>
                    {active.businessCountry || '—'} · {active.status}
                  </span>
                </div>
                <div className="admin-support-pane-actions">
                  {active.status === 'OPEN' ? (
                    <button
                      type="button"
                      className="admin-btn ghost"
                      disabled={busy}
                      onClick={() => void setStatus('CLOSED')}
                    >
                      Close
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="admin-btn"
                      disabled={busy}
                      onClick={() => void setStatus('OPEN')}
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>

              <div className="admin-support-pane-body">
                {loadingThread ? (
                  <div className="admin-support-loading" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="admin-support-empty-pane">
                    <p>No messages in this thread yet.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const admin = msg.fromRole === 'ADMIN';
                    const day = dayLabel(msg.createdAt);
                    const showDay = day && day !== lastDay;
                    if (day) lastDay = day;
                    return (
                      <div key={msg.id} className="admin-support-block">
                        {showDay ? <div className="admin-support-day">{day}</div> : null}
                        <div
                          className={`admin-support-msg${admin ? ' is-admin' : ' is-company'}`}
                        >
                          <div className="admin-support-msg-bubble">{msg.body}</div>
                          <div className="admin-support-msg-meta">
                            {admin ? 'You' : msg.fromUserName} · {formatWhen(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <form className="admin-support-composer" onSubmit={(event) => void onSend(event)}>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Reply as CasingConnect…"
                  maxLength={4000}
                  required
                />
                <button
                  type="submit"
                  className="admin-support-send"
                  disabled={busy || !body.trim()}
                  aria-label={busy ? 'Sending' : 'Send reply'}
                >
                  {busy ? <span className="admin-support-send-dot" /> : <SendIcon />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
