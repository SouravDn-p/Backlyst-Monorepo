import { UserRole, UserBusinessType } from '@prisma/client';

export class CreateUserByAdminDto {
  name: string;

  email: string;

  password: string;

  phoneNumber: string;

  role: UserRole;

  companyName?: string;
  companyWebsite?: string;
  companyIndustry?: string;

  businessType?: UserBusinessType;

  isVerified?: boolean;
  isBlocked?: boolean;
}
