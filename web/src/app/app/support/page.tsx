'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Banner } from '@/components/ui';
import { useSession } from '@/components/session';
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
  status: 'OPEN' | 'CLOSED';
  lastMessageAt: string;
  messages?: SupportMessage[];
};

const QUICK_PROMPTS = [
  'Help with account setup',
  'Ask about export documents',
  'Marketplace questions',
  'Request a tailored system',
];

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

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path
        d="M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SupportChatPage() {
  const session = useSession();
  const [thread, setThread] = useState<SupportThread | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function resizeComposer() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 44), 132)}px`;
  }

  async function loadThread() {
    setError(null);
    try {
      const data = await api<SupportThread>('/support/thread');
      setThread(data);
      const list = data.messages ?? [];
      setMessages(list);
      lastIdRef.current = list[list.length - 1]?.id ?? null;
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setLoading(false);
    }
  }

  async function poll() {
    const afterId = lastIdRef.current;
    try {
      const newer = await api<SupportMessage[]>(
        `/support/thread/messages${afterId ? `?afterId=${encodeURIComponent(afterId)}` : ''}`,
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
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    setLoading(true);
    void loadThread();
  }, [session.business.id]);

  useEffect(() => {
    const timer = window.setInterval(() => void poll(), 4000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    resizeComposer();
  }, [body]);

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api<SupportMessage>('/support/thread/messages', {
        method: 'POST',
        body: JSON.stringify({ body: trimmed }),
      });
      setBody('');
      setMessages((prev) => {
        if (prev.some((m) => m.id === created.id)) return prev;
        const next = [...prev, created];
        lastIdRef.current = created.id;
        return next;
      });
      setThread((prev) => (prev ? { ...prev, status: 'OPEN' } : prev));
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  async function onSend(event: FormEvent) {
    event.preventDefault();
    await sendText(body);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  let lastDay = '';
  const closed = thread?.status === 'CLOSED';

  return (
    <div className="sc">
      {error ? <Banner kind="bad">{error}</Banner> : null}

      <section className="sc-shell" aria-label="Support chat with CasingConnect">
        <header className="sc-top">
          <div className="sc-top-main">
            <span className="sc-face" aria-hidden="true">
              CC
            </span>
            <div className="sc-top-copy">
              <p className="sc-kicker">Support</p>
              <h1>CasingConnect team</h1>
              <p className="sc-sub">{session.business.name}</p>
            </div>
          </div>
          <span className={`sc-pill${closed ? ' is-closed' : ''}`}>
            {loading ? '…' : closed ? 'Closed' : 'Open'}
          </span>
        </header>

        <div className="sc-stream">
          {loading ? (
            <div className="sc-loading" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          ) : messages.length === 0 ? (
            <div className="sc-empty">
              <span className="sc-face lg" aria-hidden="true">
                CC
              </span>
              <h2>How can we help?</h2>
              <p>
                Message us about setup, exports, Marketplace, or a tailored system. We reply in this
                chat.
              </p>
              <div className="sc-prompts">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="sc-prompt"
                    disabled={busy}
                    onClick={() => void sendText(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <p className="sc-soon-note">
                Coming soon: global company chat — talk with casing firms in any country.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const mine = msg.fromRole === 'COMPANY';
              const day = dayLabel(msg.createdAt);
              const showDay = Boolean(day && day !== lastDay);
              if (day) lastDay = day;
              return (
                <div key={msg.id} className="sc-block">
                  {showDay ? <div className="sc-day">{day}</div> : null}
                  <div className={`sc-row${mine ? ' mine' : ' theirs'}`}>
                    {!mine ? (
                      <span className="sc-face sm" aria-hidden="true">
                        CC
                      </span>
                    ) : null}
                    <div className="sc-msg">
                      <div className="sc-bubble">{msg.body}</div>
                      <time className="sc-time" dateTime={msg.createdAt}>
                        {mine ? 'You' : 'Team'} · {formatWhen(msg.createdAt)}
                      </time>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form className="sc-composer" onSubmit={(event) => void onSend(event)}>
          <label className="sc-field">
            <span className="sr-only">Message</span>
            <textarea
              ref={textareaRef}
              rows={1}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Write a message…"
              maxLength={4000}
              required
            />
          </label>
          <button
            className="sc-send"
            type="submit"
            disabled={busy || !body.trim()}
            aria-label={busy ? 'Sending' : 'Send'}
          >
            {busy ? <span className="sc-send-pulse" /> : <SendIcon />}
          </button>
        </form>
      </section>
    </div>
  );
}
