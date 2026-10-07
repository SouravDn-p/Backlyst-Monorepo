import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';

/**
 * Spec §22 (M-20): query DTO for inspecting a domain pair via the
 * `DomainPairStat` aggregate (spec §12). The pair is identified by two raw
 * domains (websites or URLs); the service normalizes + sorts them into the
 * same `normalizedPairKey` used by `ValidationEngine.buildPairKey`.
 *
 * Audit R-Repeat-6: the optional `scope` filter lets an admin request a
 * repeat-pair-focused (`REPEAT_PAIR`) or reciprocal-focused (`RECIPROCAL`)
 * view of the pair, surfacing only the relevant cooldown + override history
 * instead of the combined repeat/reciprocal aggregate. When omitted, the
 * existing combined aggregate is returned.
 */
export class InspectDomainPairQueryDto {
  @ApiProperty({
    description:
      'First domain (raw website host or URL). Normalized (lowercased, www. stripped) before matching.',
    example: 'example-provider.com',
  })
  @IsString()
  domainA!: string;

  @ApiProperty({
    description:
      'Second domain (raw website host or URL). Normalized (lowercased, www. stripped) before matching.',
    example: 'example-requester.com',
  })
  @IsString()
  domainB!: string;

  @ApiPropertyOptional({
    description:
      'How many recent DomainInteraction rows (same pair) to include. 0 disables the recent-interactions list.',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  limit?: number;

  @ApiPropertyOptional({
    description:
      'Audit R-Repeat-6: restrict the response to a single rule scope. `REPEAT_PAIR` focuses on same-direction repeat cooldown + overrides; `RECIPROCAL` focuses on reverse-direction reciprocal cooldown + overrides. Omit for the combined view.',
    enum: ['REPEAT_PAIR', 'RECIPROCAL'],
  })
  @IsOptional()
  @IsIn(['REPEAT_PAIR', 'RECIPROCAL'])
  scope?: 'REPEAT_PAIR' | 'RECIPROCAL';
}
