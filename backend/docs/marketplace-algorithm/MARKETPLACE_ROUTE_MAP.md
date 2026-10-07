# Marketplace Route Map

## Global Prefix
**Prefix:** None (`''`)
The application is served at the root domain (`/`).

## Provider Routes
- **Route:** `GET /provider-task/opportunities`
- **Controller:** `ProviderTaskController`
- **Service:** `ProviderTaskService`
- **Auth:** `@ApiBearerAuth` with `@UseGuards(JwtAuthGuard)` + `@CurrentUser()`
- **DTO / Query Params:** `providerWebsiteId`, `page`, `limit` (Implicit Query params)

## Admin Configuration Routes
- **Route:** `GET /admin/marketplace-config`
- **Route:** `PATCH /admin/marketplace-config`
- **Controller:** `AdminMarketplaceConfigController`
- **Service:** `AdminMarketplaceConfigService`
- **Auth:** `@ApiBearerAuth` with `@AdminGuard()`
- **DTO:** `UpdateScoringConfigDto`

## Admin Override Routes
- **Route:** `POST /admin/marketplace-overrides`
- **Route:** `GET /admin/marketplace-overrides`
- **Route:** `PATCH /admin/marketplace-overrides/:id`
- **Route:** `DELETE /admin/marketplace-overrides/:id`
- **Controller:** `AdminMarketplaceOverrideController`
- **Service:** `MarketplaceOverrideService`
- **Auth:** `@ApiBearerAuth` with `@AdminGuard()`
- **DTOs:** `CreateMarketplaceOverrideDto`, `UpdateMarketplaceOverrideDto`, `RevokeMarketplaceOverrideDto`

## Existing Website and Task Integration
- **Website Create (`CreateWebsiteDto`):** Accepts `marketplaceCategoryId`, `marketplaceTagIds`, `secondaryMarketplaceCategoryIds`
- **Task Create (`CreateTaskDto`):** Accepts `targetMarketplaceCategoryId`, `marketplaceTagIds`, `secondaryTargetMarketplaceCategoryIds`

## Monitoring Routes
- **Route:** `GET /admin/analytics/marketplace`
- **Route:** `GET /admin/analytics/domain-pairs`
- **Controller:** `AdminAnalyticsController`
- **Service:** `MarketplaceAnalyticsDashboardService`, `AdminAnalyticsService`
- **Auth:** `@ApiBearerAuth` with `@AdminGuard()` (via module config or controller auth)

## Module Registration Graph
- `AppModule` 
  -> `ProviderTaskModule` -> `ProviderTaskController`
- `AppModule` 
  -> `AdminModule` -> `AdminMarketplaceConfigModule` -> `AdminMarketplaceConfigController`
- `AppModule` 
  -> `AdminModule` -> `AdminMarketplaceOverrideModule` -> `AdminMarketplaceOverrideController`
- `AppModule` 
  -> `AdminModule` -> `AdminAnalyticsModule` -> `AdminAnalyticsController`

## Missing or Compatibility Routes
- **Marketplace Config:** The route is `/admin/marketplace-config` rather than the spec's `/admin/marketplace/scoring-config`. They are equivalent.
- **Marketplace Overrides:** The route is `/admin/marketplace-overrides` rather than the spec's `/admin/marketplace/overrides`. They are equivalent.
