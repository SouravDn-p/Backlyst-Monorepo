import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  CreateAdminSubscriptionPlanDto,
  PlanTierDtoEnum,
} from './dto/create-admin-subscription-plan.dto';
import { UpdateAdminSubscriptionPlanDto } from './dto/update-admin-subscription-plan.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';

@Injectable()
export class AdminSubscriptionPlanService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAdminSubscriptionPlanDto: CreateAdminSubscriptionPlanDto) {
    const { features, credit, taskCreditsPerCycle, ...rest } =
      createAdminSubscriptionPlanDto;
    const nextTaskCreditsPerCycle = taskCreditsPerCycle ?? credit ?? 0;

    const matchingPlan = await this.prisma.subscriptionPlan.findFirst({
      where: {
        tier: rest.tier,
        isActive: true,
      },
    });

    if (matchingPlan) {
      throw new ConflictException(
        `Plan with tier ${rest.tier} already exists and its now active, chose another tier or inavtive the existing plan first`,
      );
    }

    const data = await this.prisma.subscriptionPlan.create({
      data: {
        ...rest,
        taskCreditsPerCycle: nextTaskCreditsPerCycle,
        credit: credit ?? nextTaskCreditsPerCycle,
        features: features as any,
      },
    });

    return sendResponse('Plan added successfully', data);
  }

  async findAll(isActive?: boolean, tier?: PlanTierDtoEnum) {
    const where: {
      isActive?: boolean;
      tier?: PlanTierDtoEnum;
    } = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (tier !== undefined) {
      where.tier = tier;
    }

    const data = await this.prisma.subscriptionPlan.findMany({ where });

    if (data.length === 0) throw new ConflictException('No plans found');
    return sendResponse('Plans fetched successfully', data);
  }

  async update(id: string, payload: UpdateAdminSubscriptionPlanDto) {
    const existingPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!existingPlan) {
      throw new ConflictException('Plan not found');
    }

    if (payload.tier || payload.isActive === true) {
      const targetTier = payload.tier ?? existingPlan.tier;
      const targetIsActive = payload.isActive ?? existingPlan.isActive;

      if (targetIsActive) {
        const matchingActivePlan = await this.prisma.subscriptionPlan.findFirst(
          {
            where: {
              tier: targetTier,
              isActive: true,
              id: {
                not: id,
              },
            },
          },
        );

        if (matchingActivePlan) {
          throw new ConflictException(
            `Plan with tier ${targetTier} already exists and is active.`,
          );
        }
      }
    }

    if (Object.keys(payload).length === 0) {
      throw new BadRequestException('At least one field is required to update');
    }

    const {
      features,
      monthlyTaskCredits,
      taskCreditsPerCycle,
      credit,
      ...rest
    } = payload;
    const nextTaskCreditsPerCycle =
      taskCreditsPerCycle ?? monthlyTaskCredits ?? undefined;

    const data = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...rest,
        ...(nextTaskCreditsPerCycle !== undefined
          ? {
              taskCreditsPerCycle: nextTaskCreditsPerCycle,
              credit: credit ?? nextTaskCreditsPerCycle,
            }
          : credit !== undefined
            ? { credit }
            : {}),
        ...(features ? { features: features as any } : {}),
      },
    });

    return sendResponse('Plan updated successfully', data);
  }

  async makePlanInActive(id: string) {
    const isPlanActive = await this.prisma.subscriptionPlan.findFirst({
      where: { id },
    });

    if (!isPlanActive) {
      throw new ConflictException('Plan not found');
    } else if (!isPlanActive.isActive) {
      throw new ConflictException('Plan already inactive');
    }

    const data = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return sendResponse('Plan inactivated successfully', data);
  }
}
