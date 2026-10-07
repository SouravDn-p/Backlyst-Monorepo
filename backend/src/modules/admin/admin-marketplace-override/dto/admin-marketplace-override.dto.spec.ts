import { validate } from 'class-validator';
import { CreateMarketplaceOverrideDto } from './admin-marketplace-override.dto';

describe('AdminMarketplaceOverrideDto Validation', () => {
  it('rejects missing or invalid reasonCode', async () => {
    const dto = new CreateMarketplaceOverrideDto();
    dto.type = 'BOOST';
    // reasonCode is missing

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'reasonCode')).toBe(true);
  });

  it('rejects invalid activeUntil values', async () => {
    const dto = new CreateMarketplaceOverrideDto();
    dto.type = 'BOOST';
    dto.reasonCode = 'TEST_REASON';
    dto.activeUntil = 'not-a-date' as any; // Invalid type

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'activeUntil')).toBe(true);
  });

  it('rejects invalid boost, penalty or score values', async () => {
    const dto = new CreateMarketplaceOverrideDto();
    dto.type = 'SCORE_OVERRIDE';
    dto.reasonCode = 'TEST';
    dto.visibilityScore = 150; // Max is 100
    dto.opportunityScore = -10; // Min is 0

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'visibilityScore')).toBe(true);
    expect(errors.some(e => e.property === 'opportunityScore')).toBe(true);
  });

  it('accepts valid override dto', async () => {
    const dto = new CreateMarketplaceOverrideDto();
    dto.type = 'BOOST';
    dto.reasonCode = 'TEST_REASON';
    dto.activeUntil = new Date();
    dto.visibilityScore = 80;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
