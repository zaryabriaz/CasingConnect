'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useSession } from '@/components/session';
import { Banner, Field } from '@/components/ui';
import { api, apiForm, errorText, mediaUrl } from '@/lib/api';
import { canManage } from '@/lib/labels';

const DEFAULT_PRIMARY = '#0b342b';
const DEFAULT_ACCENT = '#b8923f';
const MAX_GALLERY = 12;

const PRESETS = [
  { label: 'Forest & brass', primary: DEFAULT_PRIMARY, accent: DEFAULT_ACCENT },
  { label: 'Navy & copper', primary: '#14233d', accent: '#c4783a' },
  { label: 'Charcoal & gold', primary: '#1c1c1c', accent: '#c9a227' },
  { label: 'Slate & teal', primary: '#1e2f36', accent: '#2a9d8f' },
];

type PublicSiteEditor = {
  enabled: boolean;
  published: boolean;
  tagline: string | null;
  headline: string | null;
  about: string | null;
  products: string | null;
  markets: string | null;
  primaryColor: string;
  accentColor: string;
  coverUrl: string | null;
  logoUrl: string | null;
  gallery: string[];
  slug: string;
  name: string;
  country: string;
  city: string | null;
  phone: string | null;
  email: string | null;
  publicUrl: string;
};

function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };
    img.src = url;
  });
}

export default function AppPublicSitePage() {
  const session = useSession();
  const manage = canManage(session.role);
  const coverRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [site, setSite] = useState<PublicSiteEditor | null>(null);
  const [published, setPublished] = useState(false);
  const [tagline, setTagline] = useState('');
  const [headline, setHeadline] = useState('');
  const [about, setAbout] = useState('');
  const [products, setProducts] = useState('');
  const [markets, setMarkets] = useState('');
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function applyEditor(data: PublicSiteEditor) {
    setSite({ ...data, gallery: data.gallery ?? [] });
    setPublished(data.published);
    setTagline(data.tagline ?? '');
    setHeadline(data.headline ?? '');
    setAbout(data.about ?? '');
    setProducts(data.products ?? '');
    setMarkets(data.markets ?? '');
    setPrimaryColor(data.primaryColor || DEFAULT_PRIMARY);
    setAccentColor(data.accentColor || DEFAULT_ACCENT);
  }

  async function load() {
    try {
      const data = await api<PublicSiteEditor>('/business/public-site');
      applyEditor(data);
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  useEffect(() => {
    void load();
  }, [session.business.id]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!manage || !site?.enabled) return;
    setSaving(true);
    setError(null);
    setNote(null);
    try {
      const data = await api<PublicSiteEditor>('/business/public-site', {
        method: 'PUT',
        body: JSON.stringify({
          published,
          tagline,
          headline,
          about,
          products,
          markets,
          primaryColor,
          accentColor,
        }),
      });
      applyEditor(data);
      setNote(
        data.published
          ? 'Your public website is live.'
          : 'Saved. Turn on “Activate website” when you are ready to go live.',
      );
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setSaving(false);
    }
  }

  async function onMakeDefaultSettings() {
    if (!manage || !site?.enabled) return;
    setPrimaryColor(DEFAULT_PRIMARY);
    setAccentColor(DEFAULT_ACCENT);
    setSaving(true);
    setError(null);
    setNote(null);
    try {
      const data = await api<PublicSiteEditor>('/business/public-site', {
        method: 'PUT',
        body: JSON.stringify({
          published,
          tagline,
          headline,
          about,
          products,
          markets,
          primaryColor: DEFAULT_PRIMARY,
          accentColor: DEFAULT_ACCENT,
        }),
      });
      applyEditor(data);
      setNote('Default colour scheme applied (forest & brass).');
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(
    path: string,
    file: File,
    successNote: string,
    validate?: (file: File) => Promise<void>,
  ) {
    if (!manage || !site?.enabled) return;
    setUploading(true);
    setError(null);
    setNote(null);
    try {
      if (validate) await validate(file);
      const form = new FormData();
      form.append('file', file);
      const data = await apiForm<PublicSiteEditor>(path, form);
      applyEditor(data);
      setNote(successNote);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setUploading(false);
    }
  }

  async function onCoverPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await uploadFile('/business/public-site/cover', file, 'Cover photo updated.', async (picked) => {
      const { width, height } = await readImageSize(picked);
      if (width < 1600 || height < 900) {
        throw new Error(
          `Cover must be at least 1600×900 pixels (yours is ${width}×${height}).`,
        );
      }
    });
  }

  async function onLogoPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await uploadFile('/business/public-site/logo', file, 'Company logo updated.', async (picked) => {
      const { width, height } = await readImageSize(picked);
      if (width < 128 || height < 128) {
        throw new Error(`Logo must be at least 128×128 pixels (yours is ${width}×${height}).`);
      }
      if (width > 800 || height > 800) {
        throw new Error(`Logo must be at most 800×800 pixels (yours is ${width}×${height}).`);
      }
    });
  }

  async function onGalleryPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if ((site?.gallery.length ?? 0) >= MAX_GALLERY) {
      setError(`Gallery can have at most ${MAX_GALLERY} images.`);
      return;
    }
    await uploadFile(
      '/business/public-site/gallery',
      file,
      'Gallery image added.',
      async (picked) => {
        const { width, height } = await readImageSize(picked);
        if (width < 800 || height < 600) {
          throw new Error(
            `Gallery images must be at least 800×600 pixels (yours is ${width}×${height}).`,
          );
        }
      },
    );
  }

  async function onRemoveCover() {
    if (!manage || !site?.enabled || !site.coverUrl) return;
    setUploading(true);
    setError(null);
    setNote(null);
    try {
      const data = await api<PublicSiteEditor>('/business/public-site/cover', { method: 'DELETE' });
      applyEditor(data);
      setNote('Cover removed. Default cover is showing until you upload a new one.');
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setUploading(false);
    }
  }

  async function onRemoveLogo() {
    if (!manage || !site?.enabled || !site.logoUrl) return;
    setUploading(true);
    setError(null);
    setNote(null);
    try {
      const data = await api<PublicSiteEditor>('/business/public-site/logo', { method: 'DELETE' });
      applyEditor(data);
      setNote('Logo removed.');
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setUploading(false);
    }
  }

  async function onRemoveGallery(url: string) {
    if (!manage || !site?.enabled) return;
    setUploading(true);
    setError(null);
    setNote(null);
    try {
      const data = await api<PublicSiteEditor>(
        `/business/public-site/gallery?url=${encodeURIComponent(url)}`,
        { method: 'DELETE' },
      );
      applyEditor(data);
      setNote('Gallery image removed.');
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setUploading(false);
    }
  }

  const coverPreview = mediaUrl(site?.coverUrl) ?? '/site/default-cover.jpg';
  const logoPreview = mediaUrl(site?.logoUrl);
  const isDefaultColors =
    primaryColor.toLowerCase() === DEFAULT_PRIMARY &&
    accentColor.toLowerCase() === DEFAULT_ACCENT;

  return (
    <div className="stack">
      <div>
        <p className="tiny eyebrow">Your company</p>
        <h1>Public website</h1>
        <p className="muted">
          Logo, cover, gallery, About, Products, Markets, and colours — then activate when ready.
        </p>
      </div>

      {error ? <Banner kind="bad">{error}</Banner> : null}
      {note ? <Banner kind="note">{note}</Banner> : null}

      {!site ? <p className="muted">Loading…</p> : null}

      {site && !site.enabled ? (
        <div className="card pad stack">
          <h2>Activate website is disabled</h2>
          <p className="muted">
            CasingConnect admin has not enabled <strong>Activate website</strong> for {site.name}.
            Ask support to turn it on so you can publish your public company site.
          </p>
        </div>
      ) : null}

      {site?.enabled ? (
        <form className="card pad form" onSubmit={onSave}>
          <div className="stack" style={{ gap: '0.35rem' }}>
            <h2>Activate &amp; share</h2>
            <p className="tiny">
              Public URL:{' '}
              {published ? (
                <Link href={site.publicUrl} target="_blank">
                  {site.publicUrl}
                </Link>
              ) : (
                <span className="muted">{site.publicUrl} (not live yet)</span>
              )}
            </p>
          </div>

          <label className="checks">
            <input
              type="checkbox"
              checked={published}
              disabled={!manage}
              onChange={(event) => setPublished(event.target.checked)}
            />
            Activate website (live for anyone with the link)
          </label>

          <h2>Company logo</h2>
          <p className="tiny muted">
            Shown in the site header next to your company name. 128–800 px, JPG/PNG/WebP, up to 2
            MB.
          </p>
          <div className="row" style={{ gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.1)',
                background: '#fff',
                display: 'grid',
                placeItems: 'center',
                overflow: 'hidden',
              }}
            >
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <span className="tiny muted">No logo</span>
              )}
            </div>
            <input
              ref={logoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(event) => void onLogoPick(event)}
            />
            {manage ? (
              <div className="row" style={{ gap: '0.55rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn primary"
                  disabled={uploading}
                  onClick={() => logoRef.current?.click()}
                >
                  {site.logoUrl ? 'Change logo' : 'Upload logo'}
                </button>
                {site.logoUrl ? (
                  <button
                    type="button"
                    className="btn"
                    disabled={uploading}
                    onClick={() => void onRemoveLogo()}
                  >
                    Remove logo
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <h2>Cover photo</h2>
          <p className="tiny muted">
            Full-bleed hero image. Minimum <strong>1600×900</strong> pixels. JPG, PNG, or WebP —
            up to 6 MB.
          </p>
          <div
            style={{
              position: 'relative',
              borderRadius: 14,
              overflow: 'hidden',
              minHeight: 180,
              background: '#122821',
              border: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            <img
              src={coverPreview}
              alt="Website cover preview"
              style={{
                display: 'block',
                width: '100%',
                height: 220,
                objectFit: 'cover',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(10,30,24,0.72) 100%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 16,
                bottom: 14,
                right: 16,
                color: '#f8f6f0',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt=""
                  style={{
                    width: 44,
                    height: 44,
                    objectFit: 'contain',
                    background: '#fff',
                    borderRadius: 8,
                    padding: 4,
                  }}
                />
              ) : null}
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: accentColor,
                    fontWeight: 700,
                  }}
                >
                  {tagline || 'Your tagline'}
                </p>
                <p style={{ margin: '0.35rem 0 0', fontSize: '1.25rem', fontWeight: 600 }}>
                  {site.name}
                </p>
              </div>
            </div>
          </div>
          <input
            ref={coverRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(event) => void onCoverPick(event)}
          />
          {manage ? (
            <div className="row" style={{ gap: '0.55rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn primary"
                disabled={uploading}
                onClick={() => coverRef.current?.click()}
              >
                {uploading ? 'Uploading…' : site.coverUrl ? 'Change cover photo' : 'Upload cover photo'}
              </button>
              {site.coverUrl ? (
                <button
                  type="button"
                  className="btn"
                  disabled={uploading}
                  onClick={() => void onRemoveCover()}
                >
                  Use default cover
                </button>
              ) : null}
            </div>
          ) : null}

          <h2>Gallery</h2>
          <p className="tiny muted">
            Plant and product photos for buyers. Up to {MAX_GALLERY} images, minimum{' '}
            <strong>800×600</strong> each. Section is hidden on the public site when empty.
          </p>
          {site.gallery.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: 10,
              }}
            >
              {site.gallery.map((url) => {
                const src = mediaUrl(url);
                return (
                  <div
                    key={url}
                    style={{
                      position: 'relative',
                      borderRadius: 10,
                      overflow: 'hidden',
                      border: '1px solid rgba(0,0,0,0.08)',
                      aspectRatio: '4 / 3',
                      background: '#eee',
                    }}
                  >
                    {src ? (
                      <img
                        src={src}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : null}
                    {manage ? (
                      <button
                        type="button"
                        className="btn"
                        disabled={uploading}
                        onClick={() => void onRemoveGallery(url)}
                        style={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          padding: '0.25rem 0.5rem',
                          fontSize: 12,
                        }}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="tiny muted">No gallery images yet.</p>
          )}
          <input
            ref={galleryRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(event) => void onGalleryPick(event)}
          />
          {manage ? (
            <button
              type="button"
              className="btn primary"
              disabled={uploading || site.gallery.length >= MAX_GALLERY}
              onClick={() => galleryRef.current?.click()}
            >
              {site.gallery.length >= MAX_GALLERY
                ? `Gallery full (${MAX_GALLERY})`
                : 'Add gallery photo'}
            </button>
          ) : null}

          <h2>Colour scheme</h2>
          <p className="tiny muted">
            Pick a preset, set your own colours, or restore the default CasingConnect scheme.
          </p>
          <div className="row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="btn"
                disabled={!manage}
                onClick={() => {
                  setPrimaryColor(preset.primary);
                  setAccentColor(preset.accent);
                }}
                style={{
                  borderColor:
                    primaryColor === preset.primary && accentColor === preset.accent
                      ? preset.primary
                      : undefined,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    marginRight: 8,
                    background: `linear-gradient(135deg, ${preset.primary} 50%, ${preset.accent} 50%)`,
                  }}
                />
                {preset.label}
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: '1rem', flexWrap: 'wrap' }}>
            <Field label="Primary">
              <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={primaryColor}
                  disabled={!manage}
                  onChange={(event) => setPrimaryColor(event.target.value)}
                  style={{ width: 48, height: 36, padding: 0, border: 'none' }}
                />
                <input
                  value={primaryColor}
                  disabled={!manage}
                  onChange={(event) => setPrimaryColor(event.target.value)}
                  maxLength={7}
                  pattern="^#[0-9a-fA-F]{6}$"
                />
              </div>
            </Field>
            <Field label="Accent">
              <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={accentColor}
                  disabled={!manage}
                  onChange={(event) => setAccentColor(event.target.value)}
                  style={{ width: 48, height: 36, padding: 0, border: 'none' }}
                />
                <input
                  value={accentColor}
                  disabled={!manage}
                  onChange={(event) => setAccentColor(event.target.value)}
                  maxLength={7}
                  pattern="^#[0-9a-fA-F]{6}$"
                />
              </div>
            </Field>
          </div>
          {manage ? (
            <button
              type="button"
              className="btn"
              disabled={saving || isDefaultColors}
              onClick={() => void onMakeDefaultSettings()}
            >
              Make default settings
            </button>
          ) : null}

          <h2>Headline</h2>
          <Field label="Tagline">
            <input
              value={tagline}
              disabled={!manage}
              onChange={(event) => setTagline(event.target.value)}
              maxLength={160}
              placeholder="Natural sheep casings · Export ready"
            />
          </Field>
          <Field label="Headline">
            <input
              value={headline}
              disabled={!manage}
              onChange={(event) => setHeadline(event.target.value)}
              maxLength={200}
              placeholder="Trusted casing partner for EU & Middle East buyers"
            />
          </Field>

          <h2>About</h2>
          <p className="tiny muted">Shown on the About section of your public site.</p>
          <Field label="About text">
            <textarea
              value={about}
              disabled={!manage}
              onChange={(event) => setAbout(event.target.value)}
              rows={5}
              maxLength={4000}
              placeholder="Who you are, how long you have traded, and what buyers can expect."
            />
          </Field>

          <h2>Products</h2>
          <p className="tiny muted">
            One item per line — shown as the Products list on your public site.
          </p>
          <Field label="Products & qualities">
            <textarea
              value={products}
              disabled={!manage}
              onChange={(event) => setProducts(event.target.value)}
              rows={5}
              maxLength={2000}
              placeholder={
                'Sheep casings A/B · calibrated\nHog casings · salted export packs\nCustom packing by buyer specification'
              }
            />
          </Field>

          <h2>Markets</h2>
          <p className="tiny muted">
            One region per line — shown as market chips on your public site.
          </p>
          <Field label="Markets">
            <textarea
              value={markets}
              disabled={!manage}
              onChange={(event) => setMarkets(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder={'European Union\nMiddle East\nSoutheast Asia'}
            />
          </Field>

          {manage ? (
            <div className="row" style={{ gap: '0.55rem', flexWrap: 'wrap' }}>
              <button className="btn primary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save website'}
              </button>
              {published ? (
                <Link className="btn" href={site.publicUrl} target="_blank">
                  View live site
                </Link>
              ) : null}
            </div>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
