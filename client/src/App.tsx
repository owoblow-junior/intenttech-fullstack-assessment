import { useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileCheck2,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  SquarePen,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  useDeleteProfileMutation,
  useGetProfileQuery,
  useGetProfilesQuery,
  API_URL,
  errorMessage,
} from './store';
import type { Profile } from './types';
import { dateLabel } from './types';
import { DeleteDialog, ExportButtons, StatePanel, useNotice } from './components';
import { Resume } from './Resume';
import { WizardPage } from './Wizard';

function Logo() {
  return (
    <Link to="/" className="brand">
      <span className="brand-mark">
        i<span />
      </span>
      <span>
        intenttech<span className="brand-sub">PROFILES WORKSPACE</span>
      </span>
    </Link>
  );
}
export default function App() {
  const [menu, setMenu] = useState(false);
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? 'sidebar-open' : ''}`}>
        <Logo />
        <button
          className="mobile-close icon-button"
          onClick={() => setMenu(false)}
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation" onClick={() => setMenu(false)}>
          <NavLink to="/" end>
            <LayoutDashboard size={18} />
            Overview
          </NavLink>
          <NavLink to="/users">
            <Users size={18} />
            User management
          </NavLink>
          <NavLink to="/admin">
            <ShieldCheck size={18} />
            Admin dashboard
          </NavLink>
        </nav>
        <div className="sidebar-guide">
          <span className="guide-icon">
            <FileCheck2 size={21} />
          </span>
          <h3>Every detail. One profile.</h3>
          <p>From personal information to academic history, all in one place.</p>
          <Link to="/users/new" onClick={() => setMenu(false)}>
            Create a profile <ArrowRight size={15} />
          </Link>
        </div>
        <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer" className="api-link">
          <BookOpen size={16} />
          API documentation
          <ExternalLink size={13} />
        </a>
        <div className="sidebar-user">
          <div className="avatar initials">SO</div>
          <div>
            <strong>Seun Owoyemi</strong>
            <small>Assessment workspace</small>
          </div>
        </div>
      </aside>
      {menu && (
        <button
          aria-label="Close navigation"
          className="nav-overlay"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu icon-button"
              onClick={() => setMenu(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>Profiles</strong>
          </div>
          <span className="demo-badge">
            <span />
            Assessment demo · fictional data only
          </span>
        </header>
        <main id="main-content">
          <Routes>
            <Route path="/" element={<Management overview />} />
            <Route path="/users" element={<Management />} />
            <Route path="/admin" element={<Management admin />} />
            <Route path="/users/new" element={<WizardPage />} />
            <Route path="/users/:id" element={<ProfilePage />} />
            <Route path="/users/:id/edit" element={<WizardPage />} />
            <Route
              path="*"
              element={
                <div className="state-panel">
                  <h1>Page not found</h1>
                  <Link className="btn btn-primary" to="/">
                    Back to overview
                  </Link>
                </div>
              }
            />
          </Routes>
        </main>
        <footer className="app-footer">
          <span>IntentTech · Profiles workspace</span>
          <span>Built by Emmanuel Seun Owoyemi</span>
        </footer>
      </div>
    </div>
  );
}
function Management({ overview = false, admin = false }: { overview?: boolean; admin?: boolean }) {
  const { data: profiles, isLoading, error, refetch, isFetching } = useGetProfilesQuery();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [deleting, setDeleting] = useState<Profile | null>(null);
  const [remove, { isLoading: removing }] = useDeleteProfileMutation();
  const notice = useNotice();
  const filtered = useMemo(
    () =>
      (profiles || [])
        .filter((p) =>
          [
            p.userInfo.firstName,
            p.userInfo.lastName,
            p.userInfo.occupation,
            p.userContact.email,
            p.userAddress.city,
          ]
            .join(' ')
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .sort((a, b) =>
          sort === 'name'
            ? `${a.userInfo.firstName} ${a.userInfo.lastName}`.localeCompare(
                `${b.userInfo.firstName} ${b.userInfo.lastName}`,
              )
            : sort === 'oldest'
              ? a.createdAt.localeCompare(b.createdAt)
              : b.createdAt.localeCompare(a.createdAt),
        ),
    [profiles, search, sort],
  );
  const totalSchools = (profiles || []).reduce((n, p) => n + p.userAcademics.schools.length, 0);
  async function deleteProfile() {
    if (!deleting) return;
    try {
      await remove(deleting.id).unwrap();
      setDeleting(null);
      notice('Profile and all related records deleted.');
    } catch (e) {
      notice(errorMessage(e), true);
    }
  }
  return (
    <div className="page-enter">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {admin ? 'ADMINISTRATION' : overview ? 'YOUR WORKSPACE' : 'PROFILE DIRECTORY'}
          </p>
          <h1>
            {admin
              ? 'Admin dashboard'
              : overview
                ? 'A clear view of your people.'
                : 'User management'}
          </h1>
          <p>
            {admin
              ? 'Review complete submissions and download a résumé in the format you need.'
              : overview
                ? 'Create, manage and bring every profile together.'
                : 'All your profiles, organised and ready to share.'}
          </p>
        </div>
        <Link to="/users/new" className="btn btn-primary">
          <Plus size={18} />
          Create profile
        </Link>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <div>
            <p>Total profiles</p>
            <h2>{profiles?.length ?? '—'}</h2>
            <small>Complete user records</small>
          </div>
          <span className="stat-icon">
            <Users size={22} />
          </span>
        </div>
        <div className="stat-card">
          <div>
            <p>Academic records</p>
            <h2>{profiles ? totalSchools : '—'}</h2>
            <small>Schools across all profiles</small>
          </div>
          <span className="stat-icon sage">
            <BookOpen size={22} />
          </span>
        </div>
        <div className="stat-card">
          <div>
            <p>Ready to download</p>
            <h2>{profiles?.length ?? '—'}</h2>
            <small>PDF & editable DOCX</small>
          </div>
          <span className="stat-icon gold">
            <FileCheck2 size={22} />
          </span>
        </div>
      </div>
      {overview && (
        <div className="overview-callout">
          <div>
            <p className="eyebrow">FROM INFORMATION TO PRESENTATION</p>
            <h2>A profile worth a second look.</h2>
            <p>
              Collect the details once. Get a beautifully presented résumé,
              <br className="desktop-br" /> ready to view, update or download.
            </p>
            <Link to="/users/new">
              Start a new profile <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mini-resume" aria-hidden="true">
            <div className="mini-header">
              <div className="mini-portrait" />
              <div>
                <i />
                <i />
              </div>
            </div>
            <div className="mini-lines">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="mini-seal">
              <CheckMark />
              Profile complete
            </div>
          </div>
        </div>
      )}
      <section className="directory-panel">
        <header className="panel-header">
          <div>
            <h2>
              {admin ? 'Submitted profiles' : overview ? 'Profile directory' : 'All profiles'}
              <span className="count-badge">{profiles?.length ?? 0}</span>
            </h2>
            <p>
              {admin
                ? 'Each record includes personal details, contact, address and academics.'
                : 'Select a profile to view their résumé and complete information.'}
            </p>
          </div>
          {isFetching && !isLoading && <span className="sync-indicator">Refreshing…</span>}
        </header>
        <div className="directory-controls">
          <label className="search-box">
            <Search size={18} />
            <input
              aria-label="Search profiles"
              placeholder="Search by name, email, role or city…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Clear search">
                <X size={16} />
              </button>
            )}
          </label>
          <label className="sort-select">
            <SlidersHorizontal size={16} />
            <select
              aria-label="Sort profiles"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="recent">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
            </select>
          </label>
        </div>
        {isLoading ? (
          <StatePanel title="Loading profiles" loading />
        ) : error ? (
          <StatePanel
            title="Profiles could not be loaded"
            message={errorMessage(error)}
            retry={refetch}
          />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Users size={30} />
            <h3>{search ? 'No matching profiles' : 'Your first profile starts here.'}</h3>
            <p>
              {search
                ? 'Try another name, email, role or city.'
                : 'Create a profile to see it in your directory.'}
            </p>
            {!search && (
              <Link to="/users/new" className="btn btn-primary">
                <Plus size={16} />
                Create profile
              </Link>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <table className="profiles-table">
              <thead>
                <tr>
                  <th>NAME & OCCUPATION</th>
                  <th>CONTACT</th>
                  <th>{admin ? 'SUBMISSION DETAILS' : 'LOCATION'}</th>
                  <th>
                    {admin ? 'DOWNLOAD' : 'ADDED'} <ArrowDown size={12} />
                  </th>
                  <th className="actions-heading">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link className="profile-identity" to={`/users/${p.id}`}>
                        <img className="avatar" src={p.userInfo.profilePhoto} alt="" />
                        <span>
                          <strong>
                            {p.userInfo.firstName} {p.userInfo.lastName}
                          </strong>
                          <small>{p.userInfo.occupation}</small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <span>{p.userContact.email}</span>
                      <small>{p.userContact.phoneNumber}</small>
                    </td>
                    <td>
                      <span>
                        {p.userAddress.city}, {p.userAddress.country}
                      </span>
                      <small>
                        {admin
                          ? `${p.userAcademics.schools.length} schools · ${dateLabel(p.createdAt.slice(0, 10))}`
                          : p.userAddress.state}
                      </small>
                    </td>
                    <td>
                      {admin ? (
                        <ExportButtons profile={p} small />
                      ) : (
                        <span className="date-cell">{dateLabel(p.createdAt.slice(0, 10))}</span>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link to={`/users/${p.id}`} className="view-link">
                          View
                          <ArrowRight size={13} />
                        </Link>
                        <Link
                          to={`/users/${p.id}/edit`}
                          className="icon-button"
                          aria-label={`Edit ${p.userInfo.firstName} ${p.userInfo.lastName}`}
                        >
                          <SquarePen size={16} />
                        </Link>
                        <button
                          className="icon-button danger-hover"
                          onClick={() => setDeleting(p)}
                          aria-label={`Delete ${p.userInfo.firstName} ${p.userInfo.lastName}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <footer className="panel-footer">
          <span>
            {filtered.length} {filtered.length === 1 ? 'profile' : 'profiles'}
            {search ? ' matching your search' : ''}
          </span>
          <span>
            <ShieldCheck size={13} />
            All details saved together
          </span>
        </footer>
      </section>
      <DeleteDialog
        profile={deleting}
        busy={removing}
        onCancel={() => setDeleting(null)}
        onDelete={deleteProfile}
      />
    </div>
  );
}
function CheckMark() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16">
      <path d="m3 8 3 3 7-7" stroke="currentColor" fill="none" strokeWidth="2" />
    </svg>
  );
}
function ProfilePage() {
  const { id = '' } = useParams();
  const { data: p, isLoading, error, refetch } = useGetProfileQuery(id);
  const [deleting, setDeleting] = useState(false);
  const [remove, { isLoading: removing }] = useDeleteProfileMutation();
  const notice = useNotice();
  const navigate = useNavigate();
  async function deleteProfile() {
    try {
      await remove(id).unwrap();
      notice('Profile deleted.');
      navigate('/users');
    } catch (e) {
      notice(errorMessage(e), true);
    }
  }
  if (isLoading) return <StatePanel title="Loading profile" loading />;
  if (error || !p)
    return <StatePanel title="Profile unavailable" message={errorMessage(error)} retry={refetch} />;
  return (
    <div className="page-enter">
      <Link className="back-link" to="/users">
        <ArrowLeft size={16} />
        Back to user management
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PROFILE RECORD</p>
          <h1>
            {p.userInfo.firstName} {p.userInfo.lastName}
          </h1>
          <p>
            <Clock3 size={14} />
            Updated {dateLabel(p.updatedAt.slice(0, 10))}
          </p>
        </div>
        <div className="profile-toolbar">
          <ExportButtons profile={p} />
          <Link to={`/users/${p.id}/edit`} className="btn btn-primary">
            <SquarePen size={16} />
            Edit profile
          </Link>
          <button
            className="icon-button danger-hover"
            onClick={() => setDeleting(true)}
            aria-label="Delete this profile"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      <div className="resume-stage">
        <Resume profile={p} />
      </div>
      <DeleteDialog
        profile={deleting ? p : null}
        busy={removing}
        onCancel={() => setDeleting(false)}
        onDelete={deleteProfile}
      />
    </div>
  );
}
