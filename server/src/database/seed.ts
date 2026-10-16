import '../env';
import sharp from 'sharp';
import { makeDataSource } from './data-source';
import { UsersService } from '../users/users.service';
import { UserContact } from '../users/entities';
async function seed() {
  const db = await makeDataSource().initialize();
  try {
    const service = new UsersService(db);
    const samples = [
      ['Ada', 'Okafor', 'Product Designer', 'Female', 'Lagos', '#c58564'],
      ['Tunde', 'Adeyemi', 'Software Engineer', 'Male', 'Abuja', '#658783'],
      ['Maya', 'Williams', 'Operations Manager', 'Female', 'Ibadan', '#ac9682'],
      ['Chidi', 'Nwosu', 'Data Analyst', 'Male', 'Enugu', '#737d9b'],
      ['Zara', 'Bello', 'Architect', 'Female', 'Kano', '#b59b63'],
      ['Samuel', 'Mensah', 'Financial Analyst', 'Male', 'Accra', '#8f9772'],
    ];
    for (let n = 0; n < samples.length; n++) {
      const [firstName, lastName, occupation, gender, city, color] = samples[n];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
      if (await db.getRepository(UserContact).exists({ where: { email } })) continue;
      const photo = await sharp(
        Buffer.from(
          `<svg width="240" height="240" xmlns="http://www.w3.org/2000/svg"><rect width="240" height="240" fill="${color}"/><circle cx="120" cy="91" r="43" fill="#ece2d3"/><path d="M38 240v-38a82 70 0 0 1 164 0v38" fill="#ece2d3"/></svg>`,
        ),
      )
        .jpeg()
        .toBuffer();
      await service.create({
        userInfo: {
          firstName,
          lastName,
          occupation,
          gender,
          dob: `199${n}-06-15`,
          profilePhoto: `data:image/jpeg;base64,${photo.toString('base64')}`,
        },
        userContact: {
          email,
          phoneNumber: `+234 803 555 010${n}`,
          fax: n === 0 ? '+234 1 555 0101' : undefined,
          linkedInUrl: `https://www.linkedin.com/in/${firstName.toLowerCase()}-example`,
        },
        userAddress: {
          address: `${12 + n} Example Avenue`,
          city,
          state: city,
          country: city === 'Accra' ? 'Ghana' : 'Nigeria',
          zipCode: '100001',
        },
        userAcademics: {
          schools: [
            {
              schoolName: n % 2 === 0 ? 'University of Lagos' : 'University of Ibadan',
              qualification: 'Bachelor of Science',
              fieldOfStudy: [
                'Industrial Design',
                'Computer Science',
                'Business Administration',
                'Statistics',
                'Architecture',
                'Finance',
              ][n],
              startDate: '2010-09-01',
              endDate: '2014-06-30',
            },
            {
              schoolName: 'Example College',
              qualification: 'Senior School Certificate',
              fieldOfStudy: 'General Studies',
              startDate: '2004-09-01',
              endDate: '2010-06-30',
            },
          ],
        },
      });
    }
    console.log('Six fictional sample profiles are ready. Existing records were preserved.');
  } finally {
    await db.destroy();
  }
}
seed().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
