import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { UpdateReferralRewardConfigDto } from './dto/update-referral-reward-config.dto';

const REFERRAL_REWARD_CONFIG_ID = 'REFERRAL_REWARD_CONFIG';

@Injectable()
export class ReferralRewardConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig() {
    const config = await this.prisma.referralRewardConfig.upsert({
      where: {
        id: REFERRAL_REWARD_CONFIG_ID,
      },
      update: {},
      create: {
        id: REFERRAL_REWARD_CONFIG_ID,
      },
    });

    return sendResponse('Referral reward config fetched successfully', config);
  }

  async updateConfig(payload: UpdateReferralRewardConfigDto) {
    if (Object.keys(payload).length === 0) {
      throw new BadRequestException('At least one field is required to update');
    }

    const config = await this.prisma.referralRewardConfig.upsert({
      where: {
        id: REFERRAL_REWARD_CONFIG_ID,
      },
      update: payload,
      create: {
        id: REFERRAL_REWARD_CONFIG_ID,
        ...payload,
      },
    });

    return sendResponse('Referral reward config updated successfully', config);
  }
}
