import { Mail, Phone, MapPin, Linkedin, GraduationCap } from 'lucide-react';
import type { ProfileInput } from './types';
import { dateLabel } from './types';
export function Resume({ profile, compact = false }: { profile: ProfileInput; compact?: boolean }) {
  const {
    userInfo: i,
    userContact: c,
    userAddress: a,
    userAcademics: { schools },
  } = profile;
  return (
    <article className={`resume ${compact ? 'resume-compact' : ''}`} aria-label="Résumé preview">
      <header className="resume-header">
        <div>
          <p className="eyebrow">PERSONAL PROFILE</p>
          <h2>
            {i.firstName || 'First name'} {i.lastName || 'Last name'}
          </h2>
          <p className="resume-role">{i.occupation || 'Occupation'}</p>
        </div>
        {i.profilePhoto && (
          <img src={i.profilePhoto} alt={`${i.firstName} ${i.lastName}`} className="resume-photo" />
        )}
      </header>
      <div className="resume-body">
        <aside className="resume-aside">
          <h3>Contact</h3>
          <p>
            <Mail size={14} />
            <span>{c.email || 'Email address'}</span>
          </p>
          <p>
            <Phone size={14} />
            <span>{c.phoneNumber || 'Phone number'}</span>
          </p>
          <p>
            <MapPin size={14} />
            <span>
              {[a.address, a.city, a.state, a.country, a.zipCode].filter(Boolean).join(', ') ||
                'Address'}
            </span>
          </p>
          {c.linkedInUrl && (
            <p>
              <Linkedin size={14} />
              <a href={c.linkedInUrl} target="_blank" rel="noreferrer">
                {c.linkedInUrl.replace('https://', '')}
              </a>
            </p>
          )}
          {c.fax && (
            <p>
              <span>
                <b>Fax</b>
                <br />
                {c.fax}
              </span>
            </p>
          )}
          <h3>Personal details</h3>
          <p>
            <span>
              <b>Date of birth</b>
              <br />
              {i.dob ? dateLabel(i.dob) : 'Not yet entered'}
            </span>
          </p>
          <p>
            <span>
              <b>Gender</b>
              <br />
              {i.gender || 'Not yet entered'}
            </span>
          </p>
        </aside>
        <section className="resume-education">
          <h3>
            <GraduationCap size={18} />
            Academic background
          </h3>
          {schools.map((s, n) => (
            <div className="school-entry" key={n}>
              <div className="school-dot" />
              <p className="school-period">
                {s.startDate ? dateLabel(s.startDate) : 'Start date'} — {dateLabel(s.endDate)}
              </p>
              <h4>{s.schoolName || 'School name'}</h4>
              <p>{s.qualification || 'Qualification'}</p>
              <p className="muted">{s.fieldOfStudy || 'Field of study'}</p>
            </div>
          ))}
        </section>
      </div>
      <footer className="resume-footer">
        INTENTTECH <span>PROFILE RECORD</span>
      </footer>
    </article>
  );
}
