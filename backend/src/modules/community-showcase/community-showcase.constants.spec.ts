import { RankingPeriod, ShowcaseEntityType, ShowcaseSection } from '@prisma/client';
import {
  COMMUNITY_SHOWCASE_SECTIONS,
  getDefaultPeriodForShowcaseSection,
  getSupportedPeriodsForShowcaseSection,
  isShowcaseSectionEntityTypeCompatible,
} from './community-showcase.constants';

describe('community-showcase.constants', () => {
  it('exposes the full supported public section set', () => {
    expect(COMMUNITY_SHOWCASE_SECTIONS).toHaveLength(10);
    expect(COMMUNITY_SHOWCASE_SECTIONS.map((item) => item.key)).toEqual([
      ShowcaseSection.TOP_CONTRIBUTORS,
      ShowcaseSection.TRUSTED_PARTNERS,
      ShowcaseSection.FEATURED_MEMBERS,
      ShowcaseSection.FEATURED_WEBSITES,
      ShowcaseSection.MOST_SUCCESSFUL_WEBSITES,
      ShowcaseSection.HIGHEST_RATED_PROVIDERS,
      ShowcaseSection.RISING_STARS,
      ShowcaseSection.TOP_PERFORMERS_WEEK,
      ShowcaseSection.TOP_PERFORMERS_MONTH,
      ShowcaseSection.ADMIN_FEATURED_MEMBERS,
    ]);
  });

  it('keeps weekly and monthly top performer periods locked to their intended range', () => {
    expect(getDefaultPeriodForShowcaseSection(ShowcaseSection.TOP_PERFORMERS_WEEK)).toBe(
      RankingPeriod.THIS_WEEK,
    );
    expect(getSupportedPeriodsForShowcaseSection(ShowcaseSection.TOP_PERFORMERS_WEEK)).toEqual([
      RankingPeriod.THIS_WEEK,
    ]);
    expect(getDefaultPeriodForShowcaseSection(ShowcaseSection.TOP_PERFORMERS_MONTH)).toBe(
      RankingPeriod.THIS_MONTH,
    );
    expect(getSupportedPeriodsForShowcaseSection(ShowcaseSection.TOP_PERFORMERS_MONTH)).toEqual([
      RankingPeriod.THIS_MONTH,
    ]);
  });

  it('enforces section and entity compatibility', () => {
    expect(
      isShowcaseSectionEntityTypeCompatible(
        ShowcaseSection.FEATURED_WEBSITES,
        ShowcaseEntityType.WEBSITE,
      ),
    ).toBe(true);
    expect(
      isShowcaseSectionEntityTypeCompatible(
        ShowcaseSection.FEATURED_WEBSITES,
        ShowcaseEntityType.USER,
      ),
    ).toBe(false);
  });
});
