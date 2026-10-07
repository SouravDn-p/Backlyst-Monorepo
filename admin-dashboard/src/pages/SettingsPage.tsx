import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Loader2, RefreshCw, Save, Search } from "lucide-react";
import {
  type BadgeDefinition,
  type BillingInterval,
  type MarketplaceCompliance,
  type MarketplaceScoringConfig,
  type MarketplaceVisibilityStatus,
  type PlanTier,
  type PlatformFeatureToggle,
  type PlatformFeatureToggleKey,
  type ReferralRewardConfig,
  type SubscriptionPlan,
  useGetSystemBadgeDefinitionsQuery,
  useGetSystemFeatureTogglesQuery,
  useGetSystemMarketplaceConfigQuery,
  useGetSystemMarketplaceVisibilityQuery,
  useGetSystemReferralRewardConfigQuery,
  useGetSystemSubscriptionPlansQuery,
  useUpdateSystemBadgeDefinitionMutation,
  useUpdateSystemFeatureTogglesMutation,
  useUpdateSystemMarketplaceConfigMutation,
  useUpdateSystemReferralRewardConfigMutation,
  useUpdateSystemSubscriptionPlanMutation,
} from "@/redux/feature/systemConfigurationApi";
import { usePermissions } from "../utils/usePermissions";

type PlanForm = { price: string; billingInterval: BillingInterval; monthlyTaskCredits: number; maxTaskCreditCapacity: number; maxWebsites: number; visibilityCreditCapacity: number; isActive: boolean };
type ReferralForm = Pick<ReferralRewardConfig, "rewardPerReferralCredits" | "maxUserReferralPool" | "oneCreditPerUserEnforced">;
type MarketplaceForm = Pick<MarketplaceScoringConfig, "visibilityWeight" | "qualityActiveThreshold" | "qualityPremiumAccessThreshold" | "restrictedVisibilityFactor" | "underReviewVisibilityFactor" | "restrictedDailyCapFactor" | "qualityGradualTransitions" | "qualityMinInteractionsForStatus" | "maxProviderMatchesPerDay" | "isActive">;
type BadgeForm = { threshold: number; secondaryThreshold: number; validityDays: number; refreshWindowDays: number; gracePeriodDays: number; isActive: boolean };
type Notice = { type: "success" | "error"; text: string } | null;

const TIERS: PlanTier[] = ["FREE", "SILVER", "GOLD", "PLATINUM", "ENTERPRISE"];
const BILLING_INTERVALS: BillingInterval[] = ["MONTHLY", "YEARLY"];
const VISIBILITY_STATUSES: MarketplaceVisibilityStatus[] = ["VISIBLE", "GRACE_PERIOD", "HIDDEN"];
const COMPLIANCE_FILTERS: MarketplaceCompliance[] = ["COMPLIANT", "NON_COMPLIANT"];
const DEFAULT_PLAN_FORM: PlanForm = { price: "0", billingInterval: "MONTHLY", monthlyTaskCredits: 0, maxTaskCreditCapacity: 0, maxWebsites: 0, visibilityCreditCapacity: 0, isActive: false };
const DEFAULT_MARKETPLACE_FORM: MarketplaceForm = { visibilityWeight: 0, qualityActiveThreshold: 0, qualityPremiumAccessThreshold: 0, restrictedVisibilityFactor: 0, underReviewVisibilityFactor: 0, restrictedDailyCapFactor: 0, qualityGradualTransitions: false, qualityMinInteractionsForStatus: 0, maxProviderMatchesPerDay: 0, isActive: false };
const FEATURE_TOGGLE_KEYS: PlatformFeatureToggleKey[] = [
  "USER_REVIEWS_RATINGS",
  "REFERRAL_ENGINE_INCENTIVES",
  "VISIBILITY_DISCOVERY_REWARDS",
  "INTERNAL_ENTITY_MESSAGING",
  "EXTERNAL_NODE_API_ACCESS",
  "SELF_SERVICE_DISPUTE_CENTER",
];
const FEATURE_TOGGLE_KEY_SET = new Set<string>(FEATURE_TOGGLE_KEYS);
type SupportedPlatformFeatureToggle = PlatformFeatureToggle & { key: PlatformFeatureToggleKey };
const isSupportedFeatureToggleKey = (key: string): key is PlatformFeatureToggleKey => FEATURE_TOGGLE_KEY_SET.has(key);
const normalizeFeatureToggles = (toggles: PlatformFeatureToggle[] = []): SupportedPlatformFeatureToggle[] => {
  const byKey = new Map<PlatformFeatureToggleKey, SupportedPlatformFeatureToggle>();

  toggles.forEach((toggle) => {
    if (isSupportedFeatureToggleKey(toggle.key)) {
      byKey.set(toggle.key, { ...toggle, key: toggle.key });
    }
  });

  return FEATURE_TOGGLE_KEYS.flatMap((key) => {
    const toggle = byKey.get(key);
    return toggle ? [toggle] : [];
  });
};
const Toggle = ({ checked, onChange, color = "#155DFC", disabled = false }: { checked: boolean; onChange: () => void; color?: string; disabled?: boolean }) => (
  <button type="button" onClick={onChange} disabled={disabled} className="relative inline-flex h-[22px] w-[40px] shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-60" style={{ backgroundColor: checked ? color : "#D1D5DC" }}>
    <span className="pointer-events-none inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out" style={{ transform: checked ? "translateX(20px)" : "translateX(2px)", marginTop: "2px" }} />
  </button>
);
const Card = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => <section className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5"><div><h2 className="text-[12px] sm:text-[13px] font-bold text-[#000] uppercase tracking-wide">{title}</h2><p className="text-[9px] sm:text-[10px] text-[#717680] uppercase tracking-wide mt-0.5">{subtitle}</p></div>{children}</section>;
const FieldLabel = ({ children }: { children: React.ReactNode }) => <label className="text-[9px] font-bold text-[#717680] uppercase tracking-widest">{children}</label>;
const NumberInput = ({ value, onChange, min = 0, max, step = 1, width = "w-[80px]" }: { value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number; width?: string }) => <input type="number" value={Number.isFinite(value) ? value : 0} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} className={`${width} h-[36px] bg-white border border-[#D1D5DC] rounded-lg px-3 text-[13px] font-bold text-[#000] text-center outline-none focus:border-[#155DFC]`} />;
const SaveButton = ({ children, onClick, loading, disabled = false, dark = true, tone }: { children: React.ReactNode; onClick: () => void; loading: boolean; disabled?: boolean; dark?: boolean; tone?: "dark" | "outline" | "success" }) => { const style = tone === "success" ? "bg-[#00C950] text-white hover:bg-[#00b045]" : tone === "outline" || !dark ? "border border-[#D1D5DC] text-[#414651] hover:bg-gray-50" : "bg-[#101828] text-white hover:bg-[#1D2939]"; return <button type="button" onClick={onClick} disabled={disabled || loading} className={`w-full h-[40px] sm:h-[42px] rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${style}`}>{loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}{children}</button>; };
const NoticeBar = ({ notice }: { notice: Notice }) => notice ? <div className={`rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-wide ${notice.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{notice.text}</div> : null;
const getApiErrorMessage = (error: unknown, fallback: string) => { const maybe = error as { data?: { message?: string | string[] }; message?: string }; const message = maybe?.data?.message ?? maybe?.message; return Array.isArray(message) ? message.join(" ") : message || fallback; };
const isNoPlansFoundError = (error: unknown) => {
  const maybe = error as { status?: number; data?: { message?: string } };
  return maybe?.status === 409 && maybe?.data?.message === "No plans found";
};
const planToForm = (plan: SubscriptionPlan): PlanForm => ({ price: plan.price ?? "0", billingInterval: plan.billingInterval ?? "MONTHLY", monthlyTaskCredits: plan.monthlyTaskCredits ?? 0, maxTaskCreditCapacity: plan.maxTaskCreditCapacity ?? 0, maxWebsites: plan.maxWebsites ?? 0, visibilityCreditCapacity: plan.visibilityCreditCapacity ?? 0, isActive: Boolean(plan.isActive) });
const badgeToForm = (badge: BadgeDefinition): BadgeForm => ({ threshold: badge.threshold ?? 0, secondaryThreshold: badge.secondaryThreshold ?? 0, validityDays: badge.validityDays ?? 0, refreshWindowDays: badge.refreshWindowDays ?? 0, gracePeriodDays: badge.gracePeriodDays ?? 0, isActive: Boolean(badge.isActive) });
const SettingsPage = () => {
  const { can } = usePermissions();
  const canUpdate = can("PLATFORM_SETTINGS", "canUpdate");

  const [activeTier, setActiveTier] = useState<PlanTier>("FREE");
  const [planForms, setPlanForms] = useState<Partial<Record<PlanTier, PlanForm>>>({});
  const [referralForm, setReferralForm] = useState<ReferralForm>({ rewardPerReferralCredits: 0, maxUserReferralPool: 0, oneCreditPerUserEnforced: false });
  const [featureForms, setFeatureForms] = useState<SupportedPlatformFeatureToggle[]>([]);
  const [marketplaceForm, setMarketplaceForm] = useState<MarketplaceForm>(DEFAULT_MARKETPLACE_FORM);
  const [badgeForms, setBadgeForms] = useState<Record<string, BadgeForm>>({});
  const [visibilityFilters, setVisibilityFilters] = useState<{ search: string; visibilityStatus: MarketplaceVisibilityStatus | ""; compliance: MarketplaceCompliance | "" }>({ search: "", visibilityStatus: "", compliance: "" });
  const [visibilityPage, setVisibilityPage] = useState(1);
  const [notice, setNotice] = useState<Notice>(null);
  const [badgeNotice, setBadgeNotice] = useState<Notice>(null);
  const [referralNotice, setReferralNotice] = useState<Notice>(null);

  const { data: plansResponse, isLoading: plansLoading, isFetching: plansFetching, error: plansError, refetch: refetchPlans } = useGetSystemSubscriptionPlansQuery();
  const { data: referralResponse, isLoading: referralLoading, error: referralError, refetch: refetchReferral } = useGetSystemReferralRewardConfigQuery();
  const { data: togglesResponse, isLoading: togglesLoading, error: togglesError, refetch: refetchToggles } = useGetSystemFeatureTogglesQuery();
  const { data: marketplaceResponse, isLoading: marketplaceLoading, error: marketplaceError, refetch: refetchMarketplace } = useGetSystemMarketplaceConfigQuery();
  const { data: badgesResponse, isLoading: badgesLoading, error: badgesError, refetch: refetchBadges } = useGetSystemBadgeDefinitionsQuery();
  const { data: visibilityResponse, isLoading: visibilityLoading, isFetching: visibilityFetching, error: visibilityError, refetch: refetchVisibility } = useGetSystemMarketplaceVisibilityQuery({ page: visibilityPage, limit: 10, ...visibilityFilters });

  const [updatePlanPricing, { isLoading: savingPlanPricing }] = useUpdateSystemSubscriptionPlanMutation();
  const [updatePlanLimits, { isLoading: savingPlanLimits }] = useUpdateSystemSubscriptionPlanMutation();
  const [updateReferral, { isLoading: savingReferral }] = useUpdateSystemReferralRewardConfigMutation();
  const [updateFeatures, { isLoading: savingFeatures }] = useUpdateSystemFeatureTogglesMutation();
  const [updateMarketplace, { isLoading: savingMarketplace }] = useUpdateSystemMarketplaceConfigMutation();
  const [updateBadge, { isLoading: savingBadge }] = useUpdateSystemBadgeDefinitionMutation();

  const plans = plansResponse?.data ?? [];
  const planByTier = useMemo(() => Object.fromEntries(plans.map((plan) => [plan.tier, plan])) as Partial<Record<PlanTier, SubscriptionPlan>>, [plans]);
  const activePlan = planByTier[activeTier];
  const activePlanForm = planForms[activeTier] ?? DEFAULT_PLAN_FORM;
  const badges = badgesResponse?.data ?? [];
  const visibilityData = visibilityResponse?.data;
  const isInitialLoading = plansLoading || referralLoading || togglesLoading || marketplaceLoading || badgesLoading || visibilityLoading;

  useEffect(() => {
    if (!plans.length) return;
    setPlanForms(Object.fromEntries(plans.map((plan) => [plan.tier, planToForm(plan)])) as Partial<Record<PlanTier, PlanForm>>);
    if (!planByTier[activeTier]) setActiveTier(plans[0].tier);
  }, [plans, planByTier, activeTier]);
  useEffect(() => { if (referralResponse?.data) setReferralForm({ rewardPerReferralCredits: referralResponse.data.rewardPerReferralCredits, maxUserReferralPool: referralResponse.data.maxUserReferralPool, oneCreditPerUserEnforced: referralResponse.data.oneCreditPerUserEnforced }); }, [referralResponse]);
  useEffect(() => { if (togglesResponse?.data.toggles) setFeatureForms(normalizeFeatureToggles(togglesResponse.data.toggles)); }, [togglesResponse]);
  useEffect(() => {
    if (!marketplaceResponse?.data) return;
    const config = marketplaceResponse.data;
    setMarketplaceForm({ visibilityWeight: config.visibilityWeight ?? 0, qualityActiveThreshold: config.qualityActiveThreshold ?? 0, qualityPremiumAccessThreshold: config.qualityPremiumAccessThreshold ?? 0, restrictedVisibilityFactor: config.restrictedVisibilityFactor ?? 0, underReviewVisibilityFactor: config.underReviewVisibilityFactor ?? 0, restrictedDailyCapFactor: config.restrictedDailyCapFactor ?? 0, qualityGradualTransitions: Boolean(config.qualityGradualTransitions), qualityMinInteractionsForStatus: config.qualityMinInteractionsForStatus ?? 0, maxProviderMatchesPerDay: config.maxProviderMatchesPerDay ?? 0, isActive: Boolean(config.isActive) });
  }, [marketplaceResponse]);
  useEffect(() => { if (badges.length) setBadgeForms(Object.fromEntries(badges.map((badge) => [badge.id, badgeToForm(badge)]))); }, [badges]);

  const setPlanField = <K extends keyof PlanForm>(field: K, value: PlanForm[K]) => setPlanForms((prev) => ({ ...prev, [activeTier]: { ...(prev[activeTier] ?? DEFAULT_PLAN_FORM), [field]: value } }));
  const showSuccess = (text: string) => setNotice({ type: "success", text });
  const showError = (error: unknown, fallback: string) => setNotice({ type: "error", text: getApiErrorMessage(error, fallback) });

  const savePlanPricing = async () => { if (!activePlan) return; try { const result = await updatePlanPricing({ id: activePlan.id, body: { price: activePlanForm.price, billingInterval: activePlanForm.billingInterval } }).unwrap(); setPlanForms((prev) => ({ ...prev, [result.data.tier]: planToForm(result.data) })); showSuccess("Subscription pricing updated."); } catch (error) { showError(error, "Failed to update subscription pricing."); } };
  const savePlanLimits = async () => { if (!activePlan) return; try { const result = await updatePlanLimits({ id: activePlan.id, body: { monthlyTaskCredits: activePlanForm.monthlyTaskCredits, maxTaskCreditCapacity: activePlanForm.maxTaskCreditCapacity, maxWebsites: activePlanForm.maxWebsites, visibilityCreditCapacity: activePlanForm.visibilityCreditCapacity, isActive: activePlanForm.isActive } }).unwrap(); setPlanForms((prev) => ({ ...prev, [result.data.tier]: planToForm(result.data) })); showSuccess("Tier limits updated."); } catch (error) { showError(error, "Failed to update tier limits."); } };
  const saveMarketplace = async () => { try { const result = await updateMarketplace({ ...marketplaceForm, reasonCode: "ADMIN_SYSTEM_CONFIG_UPDATE" }).unwrap(); const config = result.data; setMarketplaceForm({ visibilityWeight: config.visibilityWeight ?? 0, qualityActiveThreshold: config.qualityActiveThreshold ?? 0, qualityPremiumAccessThreshold: config.qualityPremiumAccessThreshold ?? 0, restrictedVisibilityFactor: config.restrictedVisibilityFactor ?? 0, underReviewVisibilityFactor: config.underReviewVisibilityFactor ?? 0, restrictedDailyCapFactor: config.restrictedDailyCapFactor ?? 0, qualityGradualTransitions: Boolean(config.qualityGradualTransitions), qualityMinInteractionsForStatus: config.qualityMinInteractionsForStatus ?? 0, maxProviderMatchesPerDay: config.maxProviderMatchesPerDay ?? 0, isActive: Boolean(config.isActive) }); showSuccess("Marketplace configuration updated."); } catch (error) { showError(error, "Failed to update marketplace configuration."); } };
  const saveReferral = async () => { setReferralNotice(null); try { const result = await updateReferral(referralForm).unwrap(); setReferralForm({ rewardPerReferralCredits: result.data.rewardPerReferralCredits, maxUserReferralPool: result.data.maxUserReferralPool, oneCreditPerUserEnforced: result.data.oneCreditPerUserEnforced }); const msg = "Referral reward configuration updated."; setReferralNotice({ type: "success", text: msg }); showSuccess(msg); } catch (error) { const text = getApiErrorMessage(error, "Failed to update referral reward configuration."); setReferralNotice({ type: "error", text }); showError(error, "Failed to update referral reward configuration."); } };
  const saveFeatures = async () => { try { const supportedFeatures = normalizeFeatureToggles(featureForms); const result = await updateFeatures({ toggles: supportedFeatures.map(({ key, enabled }) => ({ key, enabled })) }).unwrap(); setFeatureForms(normalizeFeatureToggles(result.data.toggles)); showSuccess("Platform feature toggles updated."); } catch (error) { showError(error, "Failed to update platform feature toggles."); } };
  const saveBadges = async () => { setBadgeNotice(null); try { if (!badges.length) { const msg = "No badge definitions loaded yet."; setBadgeNotice({ type: "error", text: msg }); showError({ message: msg }, msg); return; } const changed = badges.filter((badge) => { const form = badgeForms[badge.id]; return form && (form.threshold !== (badge.threshold ?? 0) || form.secondaryThreshold !== (badge.secondaryThreshold ?? 0) || form.validityDays !== (badge.validityDays ?? 0) || form.refreshWindowDays !== (badge.refreshWindowDays ?? 0) || form.gracePeriodDays !== (badge.gracePeriodDays ?? 0) || form.isActive !== badge.isActive); }); if (!changed.length) { const msg = "Badge thresholds are already up to date."; setBadgeNotice({ type: "success", text: msg }); showSuccess(msg); return; } const results = await Promise.all(changed.map((badge) => updateBadge({ id: badge.id, body: badgeForms[badge.id] }).unwrap())); setBadgeForms((prev) => ({ ...prev, ...Object.fromEntries(results.map((result) => [result.data.id, badgeToForm(result.data)])) })); const msg = "Badge threshold logic updated."; setBadgeNotice({ type: "success", text: msg }); showSuccess(msg); } catch (error) { const text = getApiErrorMessage(error, "Failed to update badge thresholds."); setBadgeNotice({ type: "error", text }); showError(error, "Failed to update badge thresholds."); } };
  const noPlansFound = isNoPlansFoundError(plansError);
  const topErrors = [plansError, referralError, togglesError, marketplaceError, badgesError, visibilityError].filter((error) => Boolean(error) && !isNoPlansFoundError(error));
  return (
    <div className="w-full font-arimo space-y-4 sm:space-y-6">
      <section className="space-y-2">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div><h1 className="text-[18px] sm:text-[20px] lg:text-[22px] font-bold text-[#000] uppercase tracking-tight leading-tight">System Configuration</h1><p className="text-[10px] sm:text-[11px] text-[#717680] font-medium mt-1 uppercase tracking-[0.04em] leading-relaxed">Restricted Super-Admin Control Plane. All configuration is loaded from live backend modules and saved per section.</p></div>
          <button type="button" onClick={() => { refetchPlans(); refetchReferral(); refetchToggles(); refetchMarketplace(); refetchBadges(); refetchVisibility(); }} className="h-[36px] px-4 border border-[#D1D5DC] rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 self-start hover:bg-gray-50"><RefreshCw size={14} className={plansFetching || visibilityFetching ? "animate-spin" : ""} /> Refresh Live Data</button>
        </div>
        <NoticeBar notice={notice} />
        {topErrors.length > 0 && <NoticeBar notice={{ type: "error", text: "Some configuration modules failed to load. Check admin token and backend availability." }} />}
        {noPlansFound && <NoticeBar notice={{ type: "error", text: "No subscription plans found in backend data. Other system modules can still be managed." }} />}
      </section>

      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        {TIERS.map((tier) => { const hasPlan = Boolean(planByTier[tier]); return <button key={tier} onClick={() => setActiveTier(tier)} disabled={!hasPlan} className="px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-[12px] font-bold uppercase tracking-wider transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed" style={activeTier === tier ? { backgroundColor: "#414651", color: "#FFFFFF" } : { backgroundColor: "#E9EAEB", color: "#252B37" }}>{tier}</button>; })}
      </div>

      {isInitialLoading && <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 flex items-center gap-3 text-[12px] font-bold uppercase tracking-wider text-[#414651]"><Loader2 size={18} className="animate-spin" /> Loading system configuration modules</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start">
        <Card title="1. Subscription Pricing" subtitle="Configuration for primary billing tiers.">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-6">
            <div className="space-y-1.5"><FieldLabel>Tier</FieldLabel><p className="text-[13px] font-bold text-[#000] uppercase">{activePlan?.name || activeTier}</p></div>
            <div className="space-y-1.5"><FieldLabel>Base Price ($)</FieldLabel><input value={activePlanForm.price} onChange={(event) => setPlanField("price", event.target.value)} className="w-[100px] h-[36px] bg-white border border-[#D1D5DC] rounded-lg px-3 text-[13px] font-bold text-[#000] text-center outline-none focus:border-[#155DFC]" /></div>
            <div className="space-y-1.5"><FieldLabel>Billing Cycle</FieldLabel><div className="relative"><select value={activePlanForm.billingInterval} onChange={(event) => setPlanField("billingInterval", event.target.value as BillingInterval)} className="h-[36px] w-[140px] bg-white border border-[#D1D5DC] rounded-lg px-3 pr-8 text-[12px] font-bold text-[#000] uppercase appearance-none outline-none focus:border-[#155DFC]">{BILLING_INTERVALS.map((interval) => <option key={interval}>{interval}</option>)}</select><ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717680] pointer-events-none" /></div></div>
          </div>
          <p className="text-[10px] text-[#717680] uppercase tracking-wide">Last Updated: {activePlan?.updatedAt ? new Date(activePlan.updatedAt).toLocaleString() : "Not available"}</p>
          {canUpdate && <SaveButton loading={savingPlanPricing} disabled={!activePlan || plansLoading} onClick={savePlanPricing}>Update Price</SaveButton>}
        </Card>

        <Card title="2. Credit Limits Per Tier" subtitle="Enforced credit ceilings and website capacity.">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5"><FieldLabel>Monthly Credits</FieldLabel><NumberInput value={activePlanForm.monthlyTaskCredits} onChange={(value) => setPlanField("monthlyTaskCredits", value)} /></div>
            <div className="space-y-1.5"><FieldLabel>Max Credits</FieldLabel><NumberInput value={activePlanForm.maxTaskCreditCapacity} onChange={(value) => setPlanField("maxTaskCreditCapacity", value)} /></div>
            <div className="space-y-1.5"><FieldLabel>Websites</FieldLabel><NumberInput value={activePlanForm.maxWebsites} onChange={(value) => setPlanField("maxWebsites", value)} /></div>
            <div className="space-y-1.5"><FieldLabel>Visibility CR</FieldLabel><NumberInput value={activePlanForm.visibilityCreditCapacity} onChange={(value) => setPlanField("visibilityCreditCapacity", value)} /></div>
          </div>
          <div className="flex items-center justify-between gap-3"><div><p className="text-[11px] sm:text-[12px] font-bold text-[#000] uppercase">Plan Enabled</p><p className="text-[9px] text-[#717680] uppercase tracking-wide mt-0.5">Controls whether this tier is active.</p></div><Toggle checked={activePlanForm.isActive} onChange={() => setPlanField("isActive", !activePlanForm.isActive)} /></div>
          {canUpdate && <SaveButton loading={savingPlanLimits} disabled={!activePlan || plansLoading} onClick={savePlanLimits}>Save Tier Configurations</SaveButton>}
        </Card>
        <Card title="3. Marketplace Visibility Rules" subtitle="Discovery scoring and quality eligibility parameters.">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5"><FieldLabel>Visibility Weight</FieldLabel><NumberInput value={marketplaceForm.visibilityWeight} step={0.01} max={1} onChange={(value) => setMarketplaceForm((prev) => ({ ...prev, visibilityWeight: value }))} /></div>
            <div className="space-y-1.5"><FieldLabel>Active Quality</FieldLabel><NumberInput value={marketplaceForm.qualityActiveThreshold} max={100} onChange={(value) => setMarketplaceForm((prev) => ({ ...prev, qualityActiveThreshold: value }))} /></div>
            <div className="space-y-1.5"><FieldLabel>Premium Quality</FieldLabel><NumberInput value={marketplaceForm.qualityPremiumAccessThreshold} max={100} onChange={(value) => setMarketplaceForm((prev) => ({ ...prev, qualityPremiumAccessThreshold: value }))} /></div>
            <div className="space-y-1.5"><FieldLabel>Restricted Factor</FieldLabel><NumberInput value={marketplaceForm.restrictedVisibilityFactor} step={0.01} max={1} onChange={(value) => setMarketplaceForm((prev) => ({ ...prev, restrictedVisibilityFactor: value }))} /></div>
            <div className="space-y-1.5"><FieldLabel>Review Factor</FieldLabel><NumberInput value={marketplaceForm.underReviewVisibilityFactor} step={0.01} max={1} onChange={(value) => setMarketplaceForm((prev) => ({ ...prev, underReviewVisibilityFactor: value }))} /></div>
            <div className="space-y-1.5"><FieldLabel>Daily Cap Factor</FieldLabel><NumberInput value={marketplaceForm.restrictedDailyCapFactor} step={0.01} max={1} onChange={(value) => setMarketplaceForm((prev) => ({ ...prev, restrictedDailyCapFactor: value }))} /></div>
            <div className="space-y-1.5"><FieldLabel>Min Interactions</FieldLabel><NumberInput value={marketplaceForm.qualityMinInteractionsForStatus} onChange={(value) => setMarketplaceForm((prev) => ({ ...prev, qualityMinInteractionsForStatus: value }))} /></div>
            <div className="space-y-1.5"><FieldLabel>Matches / Day</FieldLabel><NumberInput value={marketplaceForm.maxProviderMatchesPerDay} max={100} onChange={(value) => setMarketplaceForm((prev) => ({ ...prev, maxProviderMatchesPerDay: value }))} /></div>
          </div>
          <div className="flex items-center justify-between gap-3"><div><p className="text-[11px] sm:text-[12px] font-bold text-[#000] uppercase">Visibility Eligibility Toggle</p><p className="text-[9px] text-[#717680] uppercase tracking-wide mt-0.5">Enable or disable marketplace scoring config.</p></div><Toggle checked={marketplaceForm.isActive} color="#00C950" onChange={() => setMarketplaceForm((prev) => ({ ...prev, isActive: !prev.isActive }))} /></div>
          <div className="flex items-center justify-between gap-3"><div><p className="text-[11px] sm:text-[12px] font-bold text-[#000] uppercase">Gradual Quality Transitions</p><p className="text-[9px] text-[#717680] uppercase tracking-wide mt-0.5">Backend-backed quality status behavior.</p></div><Toggle checked={marketplaceForm.qualityGradualTransitions} color="#00C950" onChange={() => setMarketplaceForm((prev) => ({ ...prev, qualityGradualTransitions: !prev.qualityGradualTransitions }))} /></div>
          {canUpdate && <SaveButton loading={savingMarketplace} disabled={!marketplaceResponse?.data || marketplaceLoading} onClick={saveMarketplace}>Update Marketplace Logic</SaveButton>}
        </Card>

        <Card title="4. Grace Period Configuration" subtitle="Runtime grace windows are visible; editing awaits backend endpoint.">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5"><FieldLabel>Grace Duration</FieldLabel><input readOnly value="2" className="w-full h-[36px] bg-gray-50 border border-[#D1D5DC] rounded-lg px-3 text-[13px] font-bold text-[#000] text-center outline-none" /></div>
            <div className="space-y-1.5"><FieldLabel>Grace Unit</FieldLabel><input readOnly value="MINUTES" className="w-full h-[36px] bg-gray-50 border border-[#D1D5DC] rounded-lg px-3 text-[12px] font-bold text-[#000] text-center outline-none" /></div>
            <div className="space-y-1.5"><FieldLabel>Active Grace Rows</FieldLabel><input readOnly value={visibilityData?.items.filter((item) => item.status === "GRACE_PERIOD").length ?? 0} className="w-full h-[36px] bg-gray-50 border border-[#D1D5DC] rounded-lg px-3 text-[13px] font-bold text-[#000] text-center outline-none" /></div>
            <div className="space-y-1.5"><FieldLabel>Max Extensions</FieldLabel><input readOnly value="N/A" className="w-full h-[36px] bg-gray-50 border border-[#D1D5DC] rounded-lg px-3 text-[13px] font-bold text-[#000] text-center outline-none" /></div>
          </div>
          <div className="rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 bg-amber-50 border border-amber-200 flex gap-2"><AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" /><div><p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-700">Read-only backend limitation</p><p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide mt-0.5 text-amber-800">No admin config endpoint exists for duration, extensions, or auto expiry yet.</p></div></div>
        </Card>
      </div>

        <Card title="5. Badge Thresholds" subtitle="Reward badge definitions loaded with detail endpoints.">
          <div className="space-y-3 max-h-[430px] overflow-auto pr-1">
            {badges.map((badge) => { const form = badgeForms[badge.id] ?? badgeToForm(badge); return <div key={badge.id} className="border border-[#E5E7EB] rounded-xl p-3 space-y-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[11px] sm:text-[12px] font-bold text-[#000] uppercase truncate">{badge.name}</p><p className="text-[9px] text-[#717680] uppercase tracking-wide mt-0.5 truncate">{badge.code} - {badge.triggerType}</p></div><Toggle checked={form.isActive} onChange={() => setBadgeForms((prev) => ({ ...prev, [badge.id]: { ...form, isActive: !form.isActive } }))} /></div><div className="grid grid-cols-2 sm:grid-cols-5 gap-2"><div className="space-y-1"><FieldLabel>Threshold</FieldLabel><NumberInput width="w-full" value={form.threshold} onChange={(value) => setBadgeForms((prev) => ({ ...prev, [badge.id]: { ...form, threshold: value } }))} /></div><div className="space-y-1"><FieldLabel>Secondary</FieldLabel><NumberInput width="w-full" value={form.secondaryThreshold} onChange={(value) => setBadgeForms((prev) => ({ ...prev, [badge.id]: { ...form, secondaryThreshold: value } }))} /></div><div className="space-y-1"><FieldLabel>Validity</FieldLabel><NumberInput width="w-full" value={form.validityDays} onChange={(value) => setBadgeForms((prev) => ({ ...prev, [badge.id]: { ...form, validityDays: value } }))} /></div><div className="space-y-1"><FieldLabel>Refresh</FieldLabel><NumberInput width="w-full" value={form.refreshWindowDays} onChange={(value) => setBadgeForms((prev) => ({ ...prev, [badge.id]: { ...form, refreshWindowDays: value } }))} /></div><div className="space-y-1"><FieldLabel>Grace Days</FieldLabel><NumberInput width="w-full" value={form.gracePeriodDays} onChange={(value) => setBadgeForms((prev) => ({ ...prev, [badge.id]: { ...form, gracePeriodDays: value } }))} /></div></div></div>; })}
            {!badges.length && !badgesLoading && <p className="text-[11px] font-bold text-[#717680] uppercase tracking-wide">No badge definitions returned.</p>}
          </div>
          {canUpdate && <SaveButton loading={savingBadge} disabled={badgesLoading} onClick={saveBadges}>Deploy Threshold Logic</SaveButton>}
          <NoticeBar notice={badgeNotice} />
        </Card>

        <Card title="6. Referral Reward Values" subtitle="Incentive structure for platform growth.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="space-y-1.5"><FieldLabel>Reward Per Referral (CR)</FieldLabel><NumberInput width="w-full" value={referralForm.rewardPerReferralCredits} onChange={(value) => setReferralForm((prev) => ({ ...prev, rewardPerReferralCredits: value }))} /></div><div className="space-y-1.5"><FieldLabel>Max User Referral Pool</FieldLabel><NumberInput width="w-full" value={referralForm.maxUserReferralPool} onChange={(value) => setReferralForm((prev) => ({ ...prev, maxUserReferralPool: value }))} /></div></div>
          <div className="flex items-center justify-between gap-3"><div><p className="text-[11px] sm:text-[12px] font-bold text-[#000] uppercase">One-Credit Per User Enforcement</p><p className="text-[9px] text-[#717680] uppercase tracking-wide mt-0.5">Limits referral reward to a single referred-user instance.</p></div><Toggle checked={referralForm.oneCreditPerUserEnforced} color="#00C950" onChange={() => setReferralForm((prev) => ({ ...prev, oneCreditPerUserEnforced: !prev.oneCreditPerUserEnforced }))} /></div>
          {canUpdate && <SaveButton loading={savingReferral} disabled={!referralResponse?.data || referralLoading} onClick={saveReferral}>Save Reward Configuration</SaveButton>}
          <NoticeBar notice={referralNotice} />
        </Card>

      <section className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div><h2 className="text-[12px] sm:text-[13px] font-bold text-[#000] uppercase tracking-wide">7. Marketplace Visibility</h2><p className="text-[9px] sm:text-[10px] text-[#717680] uppercase tracking-wide mt-0.5">Live website visibility, compliance, credits, and grace countdown status.</p></div>
          <p className="text-[9px] sm:text-[10px] text-[#717680] uppercase tracking-wide">Server Time: {visibilityData?.serverTime ? new Date(visibilityData.serverTime).toLocaleString() : "Not available"}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_180px] gap-3">
          <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#717680]" /><input value={visibilityFilters.search} onChange={(event) => { setVisibilityPage(1); setVisibilityFilters((prev) => ({ ...prev, search: event.target.value })); }} placeholder="Search website" className="w-full h-[38px] bg-white border border-[#D1D5DC] rounded-lg pl-9 pr-3 text-[12px] font-bold text-[#000] outline-none focus:border-[#155DFC]" /></div>
          <select value={visibilityFilters.visibilityStatus} onChange={(event) => { setVisibilityPage(1); setVisibilityFilters((prev) => ({ ...prev, visibilityStatus: event.target.value as MarketplaceVisibilityStatus | "" })); }} className="h-[38px] bg-white border border-[#D1D5DC] rounded-lg px-3 text-[11px] font-bold uppercase outline-none"><option value="">All Status</option>{VISIBILITY_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select>
          <select value={visibilityFilters.compliance} onChange={(event) => { setVisibilityPage(1); setVisibilityFilters((prev) => ({ ...prev, compliance: event.target.value as MarketplaceCompliance | "" })); }} className="h-[38px] bg-white border border-[#D1D5DC] rounded-lg px-3 text-[11px] font-bold uppercase outline-none"><option value="">All Compliance</option>{COMPLIANCE_FILTERS.map((status) => <option key={status} value={status}>{status}</option>)}</select>
        </div>
        <div className="overflow-x-auto border border-[#E5E7EB] rounded-xl">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-[#F8FAFC]"><tr className="text-[9px] text-[#717680] uppercase tracking-widest"><th className="px-3 py-3">Website</th><th className="px-3 py-3">Owner</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Compliance</th><th className="px-3 py-3">Credits</th><th className="px-3 py-3">Grace Timer</th></tr></thead>
            <tbody>
              {visibilityData?.items.map((item) => <tr key={item.website.id} className="border-t border-[#E5E7EB] text-[11px] font-bold text-[#000]"><td className="px-3 py-3"><div className="max-w-[220px]"><p className="truncate uppercase">{item.website.name}</p><p className="text-[9px] text-[#717680] truncate">{item.website.websiteUrl}</p></div></td><td className="px-3 py-3"><div className="max-w-[180px]"><p className="truncate uppercase">{item.website.owner.name}</p><p className="text-[9px] text-[#717680] truncate">{item.website.owner.email}</p></div></td><td className="px-3 py-3"><span className="rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 text-[9px] uppercase tracking-wide">{item.status}</span></td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[9px] uppercase tracking-wide border ${item.compliance === "COMPLIANT" ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"}`}>{item.compliance}</span></td><td className="px-3 py-3">{item.usage.label} / {item.visibility.credits} VIS</td><td className="px-3 py-3">{item.graceTimer?.label ?? "-"}</td></tr>)}
              {!visibilityData?.items.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-[11px] font-bold text-[#717680] uppercase tracking-wide">{visibilityFetching ? "Loading visibility records" : "No visibility records found"}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><p className="text-[10px] text-[#717680] uppercase tracking-wide">Page {visibilityData?.meta.page ?? 1} of {visibilityData?.meta.totalPages ?? 1} - {visibilityData?.meta.total ?? 0} total websites</p><div className="flex items-center gap-2"><button type="button" onClick={() => setVisibilityPage((page) => Math.max(1, page - 1))} disabled={visibilityFetching || (visibilityData?.meta.page ?? 1) <= 1} className="h-[32px] px-3 border border-[#D1D5DC] rounded-lg text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">Previous</button><button type="button" onClick={() => setVisibilityPage((page) => Math.min(visibilityData?.meta.totalPages ?? page, page + 1))} disabled={visibilityFetching || (visibilityData?.meta.page ?? 1) >= (visibilityData?.meta.totalPages ?? 1)} className="h-[32px] px-3 border border-[#D1D5DC] rounded-lg text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">Next</button></div></div>
      </section>

      <section className="rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 bg-[#101828]">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div><h2 className="text-[12px] sm:text-[13px] font-bold text-white uppercase tracking-wide">8. Platform Feature Toggles</h2><p className="text-[9px] sm:text-[10px] text-[#A4A7AE] uppercase tracking-wide mt-0.5">Enable or disable core system modules platform-wide.</p></div>
          {canUpdate && <button onClick={saveFeatures} disabled={savingFeatures || !featureForms.length} className="h-[34px] px-4 sm:px-5 bg-[#00C950] rounded-lg text-[9px] sm:text-[10px] font-bold text-white uppercase tracking-wider hover:bg-[#00b045] transition-colors self-start shrink-0 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">{savingFeatures ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Consolidate/Save Active</button>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
          {featureForms.map((feature) => <div key={feature.key} className="border border-[#2D3748] rounded-xl px-3 sm:px-4 py-3 sm:py-3.5 flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-[10px] sm:text-[11px] font-bold text-white uppercase tracking-wide truncate">{feature.label}</p><p className="text-[8px] sm:text-[9px] text-[#A4A7AE] uppercase tracking-wide mt-0.5 truncate">{feature.category}</p></div><Toggle checked={feature.enabled} onChange={() => setFeatureForms((prev) => prev.map((item) => item.key === feature.key ? { ...item, enabled: !item.enabled } : item))} /></div>)}
          {!featureForms.length && !togglesLoading && <p className="text-[11px] font-bold text-[#A4A7AE] uppercase tracking-wide">No feature toggles returned.</p>}
        </div>
      </section>
    </div>
  );
};

export default SettingsPage;
