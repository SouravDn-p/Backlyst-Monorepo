import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserSubscriptionPlanService {
  constructor(private readonly prisma: PrismaService) {}

  findAllPlan = async () => {
    return await this.prisma.subscriptionPlan.findMany({
      where: {
        isActive: true,
      },
    });
  };
}
