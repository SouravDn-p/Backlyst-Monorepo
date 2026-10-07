import { ApiProperty } from '@nestjs/swagger';

export class MarketplaceLiquidityFlagsDto {
  @ApiProperty({
    example: false,
    description:
      'True when eligible provider supply is below minViableMatches while demand exists.',
  })
  LOW_SUPPLY: boolean;

  @ApiProperty({
    example: false,
    description:
      'True when open-task demand is below minViableMatches while supply exists.',
  })
  LOW_DEMAND: boolean;
}

export class MarketplaceLiquidityDto {
  @ApiProperty({ example: 42, description: 'Count of open marketplace tasks.' })
  demand: number;

  @ApiProperty({
    example: 128,
    description: 'Count of eligible provider websites.',
  })
  supply: number;

  @ApiProperty({
    example: 0.33,
    description: 'demand / max(supply, 1), rounded to 2 decimal places.',
  })
  supplyDemandRatio: number;

  @ApiProperty({
    example: 3.05,
    description: 'supply / max(demand, 1), rounded to 2 decimal places.',
  })
  providerRequesterRatio: number;

  @ApiProperty({ type: MarketplaceLiquidityFlagsDto })
  flags: MarketplaceLiquidityFlagsDto;

  @ApiProperty({
    example: 10,
    description: 'Supply/demand sufficiency reference from scoring config.',
  })
  minViableMatches: number;

  @ApiProperty({ example: '2026-07-16T10:00:00.000Z' })
  generatedAt: string;
}
