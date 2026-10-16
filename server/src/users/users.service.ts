import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import sharp from 'sharp';
import { SaveUserDto } from './dto';
import { UserInfo, UserContact, UserAddress, School } from './entities';

export const relations = {
  userContact: true,
  userAddress: true,
  schools: true,
};
export function serialize(u: UserInfo) {
  return {
    id: u.id,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    userInfo: {
      profilePhoto: u.profilePhoto,
      firstName: u.firstName,
      lastName: u.lastName,
      dob: u.dob,
      occupation: u.occupation,
      gender: u.gender,
    },
    userContact: {
      email: u.userContact.email,
      phoneNumber: u.userContact.phoneNumber,
      fax: u.userContact.fax || '',
      linkedInUrl: u.userContact.linkedInUrl || '',
    },
    userAddress: {
      address: u.userAddress.address,
      city: u.userAddress.city,
      state: u.userAddress.state,
      country: u.userAddress.country,
      zipCode: u.userAddress.zipCode,
    },
    userAcademics: {
      schools: u.schools
        .sort((a, b) => a.position - b.position)
        .map((s) => ({
          schoolName: s.schoolName,
          qualification: s.qualification,
          fieldOfStudy: s.fieldOfStudy,
          startDate: s.startDate,
          endDate: s.endDate || '',
        })),
    },
  };
}
export type ProfileRecord = ReturnType<typeof serialize>;

@Injectable()
export class UsersService {
  constructor(@Inject(DataSource) private readonly db: DataSource) {}
  private async validateAndNormalize(dto: SaveUserDto) {
    const today = new Date().toISOString().slice(0, 10);
    if (dto.userInfo.dob > today || dto.userInfo.dob < '1900-01-01')
      throw new BadRequestException('Date of birth must be between 1900 and today.');
    for (const school of dto.userAcademics.schools) {
      if (school.startDate < dto.userInfo.dob || school.startDate > today)
        throw new BadRequestException('School start date must be between date of birth and today.');
      if (school.endDate && (school.endDate < school.startDate || school.endDate > today))
        throw new BadRequestException(
          'School end date must be between start date and today. Omit it for ongoing studies.',
        );
    }
    const photo = Buffer.from(dto.userInfo.profilePhoto.split(',')[1], 'base64');
    if (photo.length > 2 * 1024 * 1024)
      throw new BadRequestException('Profile photo must be smaller than 2 MiB.');
    try {
      const image = sharp(photo, { limitInputPixels: 25000000 });
      const meta = await image.metadata();
      if (!['jpeg', 'png'].includes(meta.format || '') || (meta.pages || 1) > 1)
        throw new Error('Unsupported image');
      const normalized = await image
        .rotate()
        .resize(600, 600, { fit: 'cover', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      dto.userInfo.profilePhoto = `data:image/jpeg;base64,${normalized.toString('base64')}`;
    } catch {
      throw new BadRequestException(
        'Profile photo must be a valid, non-animated JPEG or PNG image.',
      );
    }
  }
  private conflict(error: unknown): never {
    if (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === '23505'
    )
      throw new ConflictException('A profile with this email already exists.');
    throw error;
  }
  private async read(manager: EntityManager, id: string) {
    const u = await manager.findOne(UserInfo, { where: { id }, relations });
    if (!u) throw new NotFoundException('Profile not found.');
    return serialize(u);
  }
  async create(dto: SaveUserDto) {
    await this.validateAndNormalize(dto);
    try {
      return await this.db.transaction(async (m) => {
        const info = await m.save(UserInfo, m.create(UserInfo, dto.userInfo));
        await m.save(UserContact, {
          ...dto.userContact,
          userId: info.id,
          fax: dto.userContact.fax || null,
          linkedInUrl: dto.userContact.linkedInUrl || null,
        });
        await m.save(UserAddress, { ...dto.userAddress, userId: info.id });
        await m.save(
          School,
          dto.userAcademics.schools.map((s, position) => ({
            ...s,
            userId: info.id,
            position,
            endDate: s.endDate || null,
          })),
        );
        return this.read(m, info.id);
      });
    } catch (e) {
      this.conflict(e);
    }
  }
  async update(id: string, dto: SaveUserDto) {
    await this.validateAndNormalize(dto);
    try {
      return await this.db.transaction(async (m) => {
        const info = await m.findOne(UserInfo, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!info) throw new NotFoundException('Profile not found.');
        await m.update(UserInfo, id, {
          ...dto.userInfo,
          updatedAt: new Date(),
        });
        await m.update(
          UserContact,
          { userId: id },
          {
            ...dto.userContact,
            fax: dto.userContact.fax || null,
            linkedInUrl: dto.userContact.linkedInUrl || null,
          },
        );
        await m.update(UserAddress, { userId: id }, dto.userAddress);
        await m.delete(School, { userId: id });
        await m.save(
          School,
          dto.userAcademics.schools.map((s, position) => ({
            ...s,
            userId: id,
            position,
            endDate: s.endDate || null,
          })),
        );
        return this.read(m, id);
      });
    } catch (e) {
      this.conflict(e);
    }
  }
  async remove(id: string) {
    const result = await this.db.getRepository(UserInfo).delete(id);
    if (!result.affected) throw new NotFoundException('Profile not found.');
  }
  get(id: string) {
    return this.read(this.db.manager, id);
  }
  async all() {
    return (
      await this.db
        .getRepository(UserInfo)
        .find({ relations, order: { createdAt: 'DESC', id: 'ASC' } })
    ).map(serialize);
  }
}
