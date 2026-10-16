import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Download, FileText, LoaderCircle, X } from 'lucide-react';
import { API_URL } from './store';
import type { Profile } from './types';

const NoticeContext = createContext<(message: string, error?: boolean) => void>(() => {});
export const useNotice = () => useContext(NoticeContext);
export function Notices({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 7000);
    return () => clearTimeout(t);
  }, [notice]);
  return (
    <NoticeContext.Provider value={(text, error = false) => setNotice({ text, error })}>
      {children}
      {notice && (
        <div
          className={`toast ${notice.error ? 'toast-error' : ''}`}
          role={notice.error ? 'alert' : 'status'}
        >
          {notice.error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{notice.text}</span>
          <button aria-label="Dismiss notification" onClick={() => setNotice(null)}>
            <X size={16} />
          </button>
        </div>
      )}
    </NoticeContext.Provider>
  );
}
export function StatePanel({
  title,
  message,
  retry,
  loading = false,
}: {
  title: string;
  message?: string;
  retry?: () => void;
  loading?: boolean;
}) {
  return (
    <div className="state-panel">
      {loading ? <LoaderCircle className="spin" size={30} /> : <AlertCircle size={30} />}
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      {retry && (
        <button className="btn btn-primary" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function ExportButtons({ profile, small = false }: { profile: Profile; small?: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const notice = useNotice();
  async function download(ext: 'pdf' | 'docx') {
    setBusy(ext);
    try {
      const r = await fetch(`${API_URL}/users/${profile.id}/${ext}`);
      if (!r.ok) throw new Error('Download failed. Please try again.');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${profile.userInfo.firstName}-${profile.userInfo.lastName}-resume.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notice(`${ext.toUpperCase()} downloaded.`);
    } catch {
      notice('The download failed. Please try again.', true);
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="export-buttons">
      {(['pdf', 'docx'] as const).map((ext) => (
        <button
          type="button"
          disabled={!!busy}
          className={`btn btn-secondary ${small ? 'btn-small' : ''}`}
          onClick={() => download(ext)}
          key={ext}
          aria-label={`Download ${profile.userInfo.firstName} ${profile.userInfo.lastName} as ${ext.toUpperCase()}`}
        >
          {busy === ext ? (
            <LoaderCircle className="spin" size={15} />
          ) : ext === 'pdf' ? (
            <Download size={15} />
          ) : (
            <FileText size={15} />
          )}
          <span>{ext.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}
export function DeleteDialog({
  profile,
  busy,
  onCancel,
  onDelete,
}: {
  profile: Profile | null;
  busy: boolean;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (profile) ref.current?.showModal();
    else ref.current?.close();
  }, [profile]);
  return (
    <dialog
      ref={ref}
      className="delete-dialog"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onCancel();
      }}
      aria-labelledby="delete-title"
      aria-describedby="delete-description"
    >
      <div className="delete-icon">
        <AlertCircle size={25} />
      </div>
      <h2 id="delete-title">Delete this profile?</h2>
      <p id="delete-description">
        {profile?.userInfo.firstName} {profile?.userInfo.lastName}’s personal details, contact,
        address and academic records will be permanently removed.
      </p>
      <div className="dialog-actions">
        <button
          type="button"
          className="btn btn-secondary"
          autoFocus
          onClick={onCancel}
          disabled={busy}
        >
          Keep profile
        </button>
        <button type="button" className="btn btn-danger" onClick={onDelete} disabled={busy}>
          {busy ? <LoaderCircle className="spin" size={16} /> : null}Delete profile
        </button>
      </div>
    </dialog>
  );
}
