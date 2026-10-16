import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsDefined,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const Trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
const OptionalText = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value));
export class UserInfoDto {
  @ApiProperty({
    description: 'JPEG/PNG base64 data URL, at most 2 MiB decoded',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2800000)
  @Matches(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/)
  profilePhoto!: string;
  @ApiProperty({ example: 'Ada' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName!: string;
  @ApiProperty({ example: 'Okafor' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName!: string;
  @ApiProperty({ example: '1995-06-15' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  dob!: string;
  @ApiProperty({ example: 'Product Designer' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  occupation!: string;
  @ApiProperty({ enum: ['Female', 'Male', 'Non-binary', 'Prefer not to say'] })
  @IsIn(['Female', 'Male', 'Non-binary', 'Prefer not to say'])
  gender!: string;
}
export class UserContactDto {
  @ApiProperty({ example: 'ada@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  email!: string;
  @ApiProperty({ example: '+234 803 555 0101' })
  @Trim()
  @IsString()
  @Matches(/^\+?[0-9 ()-]{7,30}$/)
  phoneNumber!: string;
  @ApiPropertyOptional()
  @OptionalText()
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9 ()-]{7,30}$/)
  fax?: string;
  @ApiPropertyOptional({ example: 'https://www.linkedin.com/in/ada-example' })
  @OptionalText()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Matches(/^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_%\-]+\/?$/)
  linkedInUrl?: string;
}
export class UserAddressDto {
  @ApiProperty()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  address!: string;
  @ApiProperty()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;
  @ApiProperty()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  state!: string;
  @ApiProperty()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  country!: string;
  @ApiProperty()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  zipCode!: string;
}
export class SchoolDto {
  @ApiProperty()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  schoolName!: string;
  @ApiProperty()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  qualification!: string;
  @ApiProperty()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fieldOfStudy!: string;
  @ApiProperty({ example: '2014-09-01' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  startDate!: string;
  @ApiPropertyOptional({
    description: 'Omit for ongoing studies',
    example: '2018-06-30',
  })
  @OptionalText()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  endDate?: string;
}
export class UserAcademicsDto {
  @ApiProperty({ type: [SchoolDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SchoolDto)
  schools!: SchoolDto[];
}
export class SaveUserDto {
  @ApiProperty({ type: UserInfoDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => UserInfoDto)
  userInfo!: UserInfoDto;
  @ApiProperty({ type: UserContactDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => UserContactDto)
  userContact!: UserContactDto;
  @ApiProperty({ type: UserAddressDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => UserAddressDto)
  userAddress!: UserAddressDto;
  @ApiProperty({ type: UserAcademicsDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => UserAcademicsDto)
  userAcademics!: UserAcademicsDto;
}
