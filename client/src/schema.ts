import { z } from 'zod';
const text = (max: number) =>
  z.string().trim().min(1, 'This field is required.').max(max, `Use ${max} characters or fewer.`);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date.')
  .refine((v) => {
    const parsed = new Date(v);
    return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === v;
  }, 'Choose a valid date.');
const today = () => new Date().toISOString().slice(0, 10);
const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,30}$/, 'Use 7–30 characters: digits, spaces, +, ( ), or hyphens.');
const school = z
  .object({
    schoolName: text(160),
    qualification: text(120),
    fieldOfStudy: text(120),
    startDate: date.refine((v) => v <= today(), 'Start date cannot be in the future.'),
    endDate: z.union([date, z.literal('')]),
  })
  .superRefine((s, ctx) => {
    if (s.endDate && s.endDate < s.startDate)
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'End date must be on or after the start date.',
      });
    if (s.endDate && s.endDate > today())
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'Use an empty end date for ongoing studies.',
      });
  });
export const profileSchema = z
  .object({
    userInfo: z.object({
      profilePhoto: z.string().min(1, 'Upload a profile photo.'),
      firstName: text(80),
      lastName: text(80),
      dob: date.refine(
        (v) => v >= '1900-01-01' && v <= today(),
        'Date of birth must be between 1900 and today.',
      ),
      occupation: text(120),
      gender: z
        .enum(['Female', 'Male', 'Non-binary', 'Prefer not to say', ''])
        .refine((v) => v !== '', 'Choose a gender option.'),
    }),
    userContact: z.object({
      email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
      phoneNumber: phone,
      fax: z.union([phone, z.literal('')]),
      linkedInUrl: z.union([
        z
          .string()
          .trim()
          .max(300)
          .regex(
            /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_%\-]+\/?$/,
            'Use a full https://www.linkedin.com/in/... profile URL.',
          ),
        z.literal(''),
      ]),
    }),
    userAddress: z.object({
      address: text(250),
      city: text(100),
      state: text(100),
      country: text(100),
      zipCode: text(20),
    }),
    userAcademics: z.object({
      schools: z
        .array(school)
        .min(1, 'Add at least one school.')
        .max(20, 'A maximum of 20 schools is allowed.'),
    }),
  })
  .superRefine((p, ctx) => {
    p.userAcademics.schools.forEach((s, i) => {
      if (s.startDate && p.userInfo.dob && s.startDate < p.userInfo.dob)
        ctx.addIssue({
          code: 'custom',
          path: ['userAcademics', 'schools', i, 'startDate'],
          message: 'School start date cannot be before date of birth.',
        });
    });
  });
