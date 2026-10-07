import { RewardsController } from './rewards.controller';
describe('RewardsController', () => {
  it('returns stable rewards dashboard shape', async () => {
    const controller = new RewardsController(
      { getOrCreateProfile: jest.fn().mockResolvedValue({ earnedBadgeCount: 2 }) } as any,
      {
        getMyBadgesData: jest.fn().mockResolvedValue({
          earned: [{ code: 'FIRST_SUCCESS' }],
          active: [{ code: 'HIGH_APPROVAL' }],
          locked: [],
          inactive: [],
          kickstarter: [],
          hallOfFame: [],
          eligible: [],
        }),
      } as any,
      {
        getMyAdditionalRewardsData: jest.fn().mockResolvedValue([]),
        getMyActiveBenefitsData: jest.fn().mockResolvedValue([]),
      } as any,
      { getMyLedgerRows: jest.fn().mockResolvedValue([]) } as any,
    );
    const result = await controller.getMyRewards('user-1');
    expect(result.data).toEqual(
      expect.objectContaining({
        summary: expect.any(Object),
        profile: expect.any(Object),
        badges: expect.objectContaining({
          earned: expect.any(Array),
          active: expect.any(Array),
          locked: expect.any(Array),
          inactive: expect.any(Array),
          kickstarter: expect.any(Array),
          hallOfFame: expect.any(Array),
        }),
        activeBenefits: expect.any(Array),
        additionalRewards: expect.any(Array),
        recentLedger: expect.any(Array),
        nextAchievements: expect.any(Array),
      }),
    );
  });
});
