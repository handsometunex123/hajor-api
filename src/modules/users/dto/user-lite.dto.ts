import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UserLiteDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName?: string;

  @ApiProperty()
  lastName?: string;

  @ApiProperty()
  email?: string;

  @ApiProperty()
  phone?: string;

  @ApiProperty({ required: false })
  dob?: string;

  @ApiProperty({ required: false })
  address?: string;

  @ApiProperty({ required: false })
  trustScore?: number;

  @ApiProperty({ required: false, description: "Whether the user's BVN is verified" })
  bvnVerified?: boolean;


  @ApiProperty({ required: false })
  createdAt?: string;

  @ApiProperty({ required: false, description: 'Unique referral code for this user' })
  referralCode?: string;

  @ApiProperty({ required: false, example: 'EMAIL', description: 'Notification delivery channel: EMAIL, SMS, or BOTH' })
  notificationChannel?: string;

  @ApiProperty({ enum: UserRole, enumName: 'UserRole', required: false, example: UserRole.USER })
  role?: UserRole;

  @ApiProperty({ required: false })
  kycTier?: number;

  @ApiProperty({ required: false })
  bvnVerifiedAt?: string;

  @ApiProperty({ required: false })
  bvnVerificationRef?: string;

  @ApiProperty({ required: false })
  emailVerifiedAt?: string;

  @ApiProperty({ required: false })
  lastActiveAt?: string;
}
