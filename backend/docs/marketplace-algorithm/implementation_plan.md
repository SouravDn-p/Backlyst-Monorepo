# Implementation Plan: Marketplace Route Contract Hardening

## Goal Description
Perform a focused route-contract hardening task to align the Backlyst backend with the exact marketplace algorithm specifications, enforce strict provider opportunity query validation, verify taxonomy updates, and capture runtime route mappings.

## Open Questions
- Is modifying the `@Controller` decorator to accept an array of paths (e.g., `@Controller(['admin/marketplace-config', 'admin/marketplace/scoring-config'])`) acceptable for creating route aliases in NestJS, or would you prefer dedicated wrapper methods using `@Get('../marketplace/scoring-config')`?

## Proposed Changes

### Phase 1: Route Consumer Audit
- Analyzed the repository: `admin/marketplace-config`, `admin/marketplace-overrides`, and `provider-task/opportunities` are heavily referenced in test documentation (`test/e2e/marketplace-algorithm.api.spec.ts`) and reports.
- **Canonical Decision:** The existing paths (`admin/marketplace-config`, `admin/marketplace-overrides`) must be preserved for backward compatibility with existing tests and clients. The original specification paths will be added as aliases.

### Phase 2: Admin Route Compatibility
#### [MODIFY] `src/modules/admin/admin-marketplace-config/admin-marketplace-config.controller.ts`
- Update controller path to handle both existing and spec routes: `@Controller(['admin/marketplace-config', 'admin/marketplace/scoring-config'])` or add duplicate delegation methods depending on compatibility.

#### [MODIFY] `src/modules/admin/admin-marketplace-override/admin-marketplace-override.controller.ts`
- Update controller path: `@Controller(['admin/marketplace-overrides', 'admin/marketplace/overrides'])` or add duplicate delegation methods.

### Phase 3: Provider Query DTO
#### [NEW] `src/modules/task/provider-task/dto/get-provider-opportunities-query.dto.ts`
- Create `GetProviderOpportunitiesQueryDto` with strict validation:
  - `providerWebsiteId`: `@IsOptional() @IsString() @IsNotEmpty()`
  - `page`: `@IsOptional() @Type(() => Number) @IsInt() @Min(1)` (default 1)
  - `limit`: `@IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)` (default 10)

#### [MODIFY] `src/modules/task/provider-task/provider-task.controller.ts`
- Update `getOpportunities` to use `GetProviderOpportunitiesQueryDto` via `@Query()`.
- Remove manual default parameters, allowing the DTO and ValidationPipe to handle transformation.

#### [MODIFY] `src/modules/task/provider-task/provider-task.controller.spec.ts`
- Add tests to verify validation rules (page=0 rejected, limit=0 rejected, malformed values rejected, etc.).

### Phase 4: Taxonomy Update Verification
- Inspect `UpdateWebsiteDto` and `UpdatePlacementTaskDto`.
- Trace taxonomy fields (`marketplaceCategoryId`, `marketplaceTagIds`, `targetMarketplaceCategoryId`, `secondaryTargetMarketplaceCategoryIds`) to their respective services (`WebsiteService` and `PlacementTaskService`).
- If update logic (replacing relationships, handling empty arrays) is missing, implement it.

### Phase 5: Runtime Boot & Validation
- Start isolated Redis using `docker-compose -f docker-compose.dev.yml up -d redis`.
- Execute `pnpm start` and capture route mappings to prove routes exist.
- Run `pnpm prisma validate`, `pnpm tsc --noEmit`, and `pnpm build`.
- Execute tests for provider opportunity DTOs, admin config aliases, admin override aliases, and taxonomy updates.

## Verification Plan
### Automated Tests
- `pnpm test -- provider-task.controller.spec.ts`
- `pnpm test -- admin-marketplace-config.controller.spec.ts`
- `pnpm test -- admin-marketplace-override.controller.spec.ts`
- `pnpm tsc --noEmit`
- `pnpm prisma validate`

### Manual Verification
- Start Redis, boot app, and inspect standard output for mapped `/admin/marketplace/scoring-config` and `/admin/marketplace/overrides` routes.
