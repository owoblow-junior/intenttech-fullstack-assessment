export type School = {
  schoolName: string;
  qualification: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
};
export type ProfileInput = {
  userInfo: {
    profilePhoto: string;
    firstName: string;
    lastName: string;
    dob: string;
    occupation: string;
    gender: 'Female' | 'Male' | 'Non-binary' | 'Prefer not to say' | '';
  };
  userContact: {
    email: string;
    phoneNumber: string;
    fax: string;
    linkedInUrl: string;
  };
  userAddress: {
    address: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  userAcademics: { schools: School[] };
};
export type Profile = ProfileInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
export const blankSchool: School = {
  schoolName: '',
  qualification: '',
  fieldOfStudy: '',
  startDate: '',
  endDate: '',
};
export const blankProfile: ProfileInput = {
  userInfo: {
    profilePhoto: '',
    firstName: '',
    lastName: '',
    dob: '',
    occupation: '',
    gender: '',
  },
  userContact: { email: '', phoneNumber: '', fax: '', linkedInUrl: '' },
  userAddress: {
    address: '',
    city: '',
    state: '',
    country: 'Nigeria',
    zipCode: '',
  },
  userAcademics: { schools: [{ ...blankSchool }] },
};
export const dateLabel = (d: string) =>
  d
    ? new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : 'Present';
