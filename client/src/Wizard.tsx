import { useEffect, useRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { FormProvider, get, useFieldArray, useForm, useFormContext } from 'react-hook-form';
import type { FieldError, FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  GraduationCap,
  ImagePlus,
  LoaderCircle,
  LockKeyhole,
  Plus,
  SquarePen,
  Trash2,
} from 'lucide-react';
import { profileSchema } from './schema';
import type { ProfileInput, Profile } from './types';
import { blankProfile, blankSchool } from './types';
import {
  useCreateProfileMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  errorMessage,
} from './store';
import { StatePanel, useNotice } from './components';
import { Resume } from './Resume';

const steps = [
  {
    title: 'Personal information',
    description: 'The person behind the profile',
  },
  { title: 'Contact details', description: 'How to stay connected' },
  { title: 'Address', description: 'Where they are based' },
  { title: 'Academic background', description: 'Their learning journey' },
  { title: 'Review details', description: 'Check the complete picture' },
  { title: 'Résumé preview', description: 'Ready for the next chapter' },
];
const stepFields: FieldPath<ProfileInput>[][] = [
  ['userInfo'],
  ['userContact'],
  ['userAddress'],
  ['userAcademics'],
  [],
  [],
];
export function WizardPage() {
  const { id } = useParams();
  const { data, isLoading, error, refetch } = useGetProfileQuery(id || '', {
    skip: !id,
  });
  if (id && isLoading) return <StatePanel title="Loading profile for editing" loading />;
  if (id && (error || !data))
    return (
      <StatePanel
        title="Profile could not be loaded"
        message={errorMessage(error)}
        retry={refetch}
      />
    );
  return <Wizard key={id || 'new'} existing={data} />;
}
function Field({
  name,
  label,
  hint,
  ...props
}: {
  name: FieldPath<ProfileInput>;
  label: string;
  hint?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<ProfileInput>();
  const error = get(errors, name) as FieldError | undefined;
  const inputId = name.replaceAll('.', '-');
  return (
    <div className={`field ${error ? 'field-invalid' : ''}`}>
      <label htmlFor={inputId}>
        {label}
        {props.required === false && <span>Optional</span>}
      </label>
      <input
        {...props}
        {...register(name)}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
      />
      <div className="field-message">
        {error ? (
          <p className="field-error" id={`${inputId}-error`}>
            {error.message}
          </p>
        ) : hint ? (
          <p className="field-hint" id={`${inputId}-hint`}>
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
function PhotoUpload() {
  const {
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useFormContext<ProfileInput>();
  const photo = watch('userInfo.profilePhoto');
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('userInfo.profilePhoto', {
        message: 'Choose a JPEG or PNG photo.',
      });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('userInfo.profilePhoto', {
        message: 'Choose a photo smaller than 2 MiB.',
      });
      return;
    }
    setUploading(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (image.naturalWidth * image.naturalHeight > 25000000) throw new Error('Image too large');
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 600 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = image.naturalWidth * scale;
      canvas.height = image.naturalHeight * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Image unavailable');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      clearErrors('userInfo.profilePhoto');
      setValue('userInfo.profilePhoto', canvas.toDataURL('image/jpeg', 0.88), {
        shouldValidate: true,
        shouldDirty: true,
      });
    } catch {
      setError('userInfo.profilePhoto', {
        message: 'The photo could not be read. Choose a valid JPEG or PNG up to 25 megapixels.',
      });
    } finally {
      URL.revokeObjectURL(url);
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  }
  return (
    <div className="photo-upload">
      <div className={`upload-portrait ${photo ? 'has-photo' : ''}`}>
        {photo ? <img src={photo} alt="Uploaded profile photo" /> : <ImagePlus size={27} />}
      </div>
      <div>
        <h3>Profile photo</h3>
        <p>Give the profile a face. JPEG or PNG, up to 2 MiB.</p>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png"
          id="profile-photo"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0])}
          aria-label="Upload profile photo"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => input.current?.click()}
          className="btn btn-secondary btn-small"
        >
          {uploading ? <LoaderCircle className="spin" size={15} /> : <ImagePlus size={15} />}{' '}
          {photo ? 'Change photo' : 'Upload photo'}
        </button>
        {errors.userInfo?.profilePhoto && (
          <p className="field-error" role="alert">
            {errors.userInfo.profilePhoto.message}
          </p>
        )}
      </div>
    </div>
  );
}
function Personal() {
  const {
    register,
    formState: { errors },
  } = useFormContext<ProfileInput>();
  return (
    <>
      <PhotoUpload />
      <div className="form-grid">
        <Field
          name="userInfo.firstName"
          label="First name"
          autoComplete="given-name"
          placeholder="e.g. Ada"
          maxLength={80}
        />
        <Field
          name="userInfo.lastName"
          label="Last name"
          autoComplete="family-name"
          placeholder="e.g. Okafor"
          maxLength={80}
        />
        <Field
          name="userInfo.dob"
          label="Date of birth"
          type="date"
          autoComplete="bday"
          max={new Date().toISOString().slice(0, 10)}
          min="1900-01-01"
        />
        <div className="field">
          <label htmlFor="gender">Gender</label>
          <select
            id="gender"
            {...register('userInfo.gender')}
            aria-invalid={!!errors.userInfo?.gender}
            aria-describedby={errors.userInfo?.gender ? 'gender-error' : undefined}
          >
            <option value="">Select an option</option>
            <option>Female</option>
            <option>Male</option>
            <option>Non-binary</option>
            <option>Prefer not to say</option>
          </select>
          <div className="field-message">
            {errors.userInfo?.gender && (
              <p id="gender-error" className="field-error">
                {errors.userInfo.gender.message}
              </p>
            )}
          </div>
        </div>
        <div className="col-span-2">
          <Field
            name="userInfo.occupation"
            label="Occupation"
            placeholder="e.g. Product Designer"
            maxLength={120}
          />
        </div>
      </div>
    </>
  );
}
function Contact() {
  return (
    <div className="form-grid">
      <div className="col-span-2">
        <Field
          name="userContact.email"
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="ada@example.com"
          maxLength={254}
          hint="Each profile must have a unique email address."
        />
      </div>
      <Field
        name="userContact.phoneNumber"
        label="Phone number"
        type="tel"
        autoComplete="tel"
        placeholder="+234 803 555 0101"
        maxLength={30}
      />
      <Field
        name="userContact.fax"
        label="Fax number"
        type="tel"
        placeholder="Fax number"
        required={false}
        maxLength={30}
      />
      <div className="col-span-2">
        <Field
          name="userContact.linkedInUrl"
          label="LinkedIn profile URL"
          type="url"
          placeholder="https://www.linkedin.com/in/your-name"
          required={false}
          maxLength={300}
        />
      </div>
    </div>
  );
}
function Address() {
  return (
    <div className="form-grid">
      <div className="col-span-2">
        <Field
          name="userAddress.address"
          label="Street address"
          autoComplete="street-address"
          placeholder="12 Example Avenue"
          maxLength={250}
        />
      </div>
      <Field
        name="userAddress.city"
        label="City"
        autoComplete="address-level2"
        placeholder="Lagos"
        maxLength={100}
      />
      <Field
        name="userAddress.state"
        label="State / region"
        autoComplete="address-level1"
        placeholder="Lagos State"
        maxLength={100}
      />
      <Field
        name="userAddress.country"
        label="Country"
        autoComplete="country-name"
        placeholder="Nigeria"
        maxLength={100}
      />
      <Field
        name="userAddress.zipCode"
        label="Postal / ZIP code"
        autoComplete="postal-code"
        placeholder="100001"
        maxLength={20}
      />
    </div>
  );
}
function Academics() {
  const { control } = useFormContext<ProfileInput>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'userAcademics.schools',
  });
  return (
    <>
      <div className="section-note">
        <GraduationCap size={20} />
        <p>
          Add all previous schools, starting with the most recent. Leave the end date empty for
          ongoing studies.
        </p>
      </div>
      {fields.map((s, i) => (
        <section className="school-form" key={s.id} aria-label={`School ${i + 1}`}>
          <header>
            <h3>
              <span>{String(i + 1).padStart(2, '0')}</span>School record
            </h3>
            {fields.length > 1 && (
              <button
                type="button"
                className="icon-button danger-hover"
                aria-label={`Remove school ${i + 1}`}
                onClick={() => remove(i)}
              >
                <Trash2 size={16} />
              </button>
            )}
          </header>
          <div className="form-grid">
            <div className="col-span-2">
              <Field
                name={`userAcademics.schools.${i}.schoolName`}
                label="School name"
                placeholder="University of Lagos"
                maxLength={160}
              />
            </div>
            <Field
              name={`userAcademics.schools.${i}.qualification`}
              label="Qualification"
              placeholder="Bachelor of Science"
              maxLength={120}
            />
            <Field
              name={`userAcademics.schools.${i}.fieldOfStudy`}
              label="Field of study"
              placeholder="Computer Science"
              maxLength={120}
            />
            <Field
              name={`userAcademics.schools.${i}.startDate`}
              label="Start date"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
            />
            <Field
              name={`userAcademics.schools.${i}.endDate`}
              label="End date"
              type="date"
              required={false}
              max={new Date().toISOString().slice(0, 10)}
              hint="Leave empty if currently studying."
            />
          </div>
        </section>
      ))}
      <button
        type="button"
        className="btn btn-secondary add-school"
        onClick={() => append({ ...blankSchool })}
        disabled={fields.length >= 20}
      >
        <Plus size={16} />
        Add another school<span>{fields.length}/20</span>
      </button>
    </>
  );
}
function Wizard({ existing }: { existing?: Profile }) {
  const initial: ProfileInput = existing
    ? {
        userInfo: existing.userInfo,
        userContact: existing.userContact,
        userAddress: existing.userAddress,
        userAcademics: existing.userAcademics,
      }
    : blankProfile;
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: initial,
    mode: 'onTouched',
  });
  const [step, setStep] = useState(0);
  const [apiError, setApiError] = useState('');
  const [create, { isLoading: creating }] = useCreateProfileMutation();
  const [update, { isLoading: updating }] = useUpdateProfileMutation();
  const busy = creating || updating;
  const navigate = useNavigate();
  const notice = useNotice();
  const heading = useRef<HTMLHeadingElement>(null);
  const values = form.watch();
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (form.formState.isDirty && !busy) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [form.formState.isDirty, busy]);
  function go(n: number) {
    setStep(n);
    setApiError('');
    requestAnimationFrame(() => {
      heading.current?.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  async function next() {
    if (await form.trigger(stepFields[step], { shouldFocus: true })) go(Math.min(step + 1, 5));
  }
  const submit = form.handleSubmit(
    async (data) => {
      setApiError('');
      try {
        const result = existing
          ? await update({ id: existing.id, body: data }).unwrap()
          : await create(data).unwrap();
        form.reset(data);
        notice(
          existing
            ? 'Profile updated. All related records saved together.'
            : 'Profile created. Your résumé is ready.',
        );
        navigate(`/users/${result.id}`);
      } catch (e) {
        setApiError(errorMessage(e));
      }
    },
    (errors) => {
      const n = errors.userInfo ? 0 : errors.userContact ? 1 : errors.userAddress ? 2 : 3;
      go(n);
      notice('Please correct the highlighted fields before submitting.', true);
    },
  );
  function cancel() {
    if (!form.formState.isDirty || window.confirm('Discard your unsaved profile changes?'))
      navigate(existing ? `/users/${existing.id}` : '/users');
  }
  return (
    <div className="page-enter">
      <button type="button" className="back-link" onClick={cancel} disabled={busy}>
        <ArrowLeft size={16} />
        {existing ? 'Back to profile' : 'Back to user management'}
      </button>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{existing ? 'EDIT PROFILE' : 'NEW PROFILE'}</p>
          <h1>
            {existing ? 'Make the details current.' : 'Good profiles begin with the details.'}
          </h1>
          <p>
            {existing
              ? 'Update the information and review the résumé before saving.'
              : 'A few simple steps. One complete, beautifully presented profile.'}
          </p>
        </div>
        <span className="step-count">Step {step + 1} of 6</span>
      </div>
      <div className="wizard-layout">
        <aside className="wizard-steps" aria-label="Profile creation steps">
          <ol>
            {steps.map((s, n) => (
              <li key={s.title} className={n === step ? 'current' : n < step ? 'done' : ''}>
                <button
                  type="button"
                  disabled={n > step || busy}
                  aria-current={n === step ? 'step' : undefined}
                  onClick={() => go(n)}
                >
                  <span className="step-circle">{n < step ? <Check size={15} /> : n + 1}</span>
                  <span>
                    <strong>{s.title}</strong>
                    <small>{s.description}</small>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="wizard-assurance">
            <LockKeyhole size={18} />
            <p>
              Nothing is submitted until you review the complete résumé and select{' '}
              {existing ? 'Save changes' : 'Create profile'}.
            </p>
          </div>
        </aside>
        <FormProvider {...form}>
          <form
            noValidate
            className={`wizard-panel ${step >= 4 ? 'wizard-preview-panel' : ''}`}
            onSubmit={(e) => {
              if (step < 5) {
                e.preventDefault();
                void next();
              } else void submit(e);
            }}
          >
            <header className="wizard-panel-header">
              <p className="eyebrow">STEP {String(step + 1).padStart(2, '0')}</p>
              <h2 ref={heading} tabIndex={-1}>
                {steps[step].title}
              </h2>
              <p>
                {
                  [
                    'Let’s start with the basics. All fields are required.',
                    'A valid email and phone number help keep records useful.',
                    'Enter the full address, including the postal or ZIP code.',
                    'Build the academic history, one school at a time.',
                    'Check every detail below. You can go back to correct any section.',
                    'This is how the profile will appear. Submit when everything looks right.',
                  ][step]
                }
              </p>
            </header>
            <fieldset disabled={busy} className="wizard-fields">
              {step === 0 ? (
                <Personal />
              ) : step === 1 ? (
                <Contact />
              ) : step === 2 ? (
                <Address />
              ) : step === 3 ? (
                <Academics />
              ) : step === 4 ? (
                <>
                  <div className="review-edit-links">
                    {steps.slice(0, 4).map((s, n) => (
                      <button type="button" key={s.title} onClick={() => go(n)}>
                        <SquarePen size={14} />
                        {s.title}
                      </button>
                    ))}
                  </div>
                  <Resume profile={values} compact />
                  <div className="review-check">
                    <CheckCircle2 size={17} />
                    All four sections are ready. Next, see the final résumé preview.
                  </div>
                </>
              ) : (
                <Resume profile={values} compact />
              )}
            </fieldset>
            {apiError && (
              <div className="form-api-error" role="alert">
                <strong>Profile could not be saved.</strong>
                <p>{apiError}</p>
                <button type="button" className="text-button" onClick={() => go(1)}>
                  Edit contact details
                </button>
              </div>
            )}
            <footer className="wizard-footer">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => (step > 0 ? go(step - 1) : cancel())}
              >
                {step > 0 ? (
                  <>
                    <ArrowLeft size={16} />
                    Previous step
                  </>
                ) : (
                  'Cancel'
                )}
              </button>
              <div className="wizard-next">
                {step >= 4 && (
                  <span>{step === 5 ? 'Ready to submit' : 'Review before submitting'}</span>
                )}
                {step < 5 ? (
                  <button
                    key="continue"
                    type="button"
                    className="btn btn-primary"
                    onClick={(e) => {
                      e.preventDefault();
                      void next();
                    }}
                  >
                    Continue
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <button key="submit" type="submit" className="btn btn-primary" disabled={busy}>
                    {busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{' '}
                    {busy ? 'Saving profile…' : existing ? 'Save changes' : 'Create profile'}
                  </button>
                )}
              </div>
            </footer>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}
