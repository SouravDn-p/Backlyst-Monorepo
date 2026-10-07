import DeliveryStatusCard from "@/components/ui/common/DeliveryStatusCard";
import { DeliveryDetail } from "@/components/ui/common/DelivetyDetail";
import { CheckCircle2, Database, History, Link2 } from "lucide-react";

export default function BriefOverviewTab() {
  return (
    <div className="space-y-5">
      {/* Status cards */}
      <div className="grid md:grid-cols-3 gap-3">
        <DeliveryStatusCard
          label="ECOSYSTEM STATUS"
          value="OPEN OPPRTUNITY"
          icon={<CheckCircle2 className="w-5 h-5 text-primary" />}
          valueClass="text-primary"
        />
        <DeliveryStatusCard
          label="DELIVERY DEADLINE"
          icon={<History className="w-5 h-5 text-primary" />}
          value="5 DAYS LEFT"
          valueClass="text-primary"
        />
        <DeliveryStatusCard
          label="REWARDS (CR)"
          icon={<Database className="w-5 h-5 text-primary" />}
          value="+120.00 CR"
          valueClass="text-primary"
        />
      </div>

      {/* Project intent */}
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-4 px-2">
          Project Intent &amp; Requirements
        </p>
      </div>
      <section className="p-4 border-x rounded-xl">
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-4 pb-4 border-b border-[#e9eaeb]   ">
          <DeliveryDetail
            label="ECOSYSTEM RELEVANCY"
            value="High-Authority Tier"
          />
          <DeliveryDetail
            label="PLACEMENT PROTOCOL"
            value="Dofollow Permanent"
          />
        </div>

        <div className="pt-4 space-y-4 px-1">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#535862] mb-1">
              DESTINATION TARGET
            </p>
            <a
              href="https://SaasFlow.io/enterprise-scalling-guide"
              className="flex items-center gap-1.5 text-sm  hover:underline"
            >
              <Link2 className="w-5 h-5 shrink-0 text-primary" />
              <span> https://SaasFlow.io/enterprise-scalling-guide</span>
            </a>
          </div>

          <div>
            <p className="text-sm pt-4 md:pt-0 font-semibold uppercase tracking-wide text-[#535862] mb-1">
              REQUESTER INSTRUCTIONS
            </p>
            <p className="text-sm text-[#535862] leading-relaxed">
              The Backlink must be placed within a contextually relevant
              paragraph of at least 150 words on an indexed technology or
              business-related blog. Ensure the placement site has stable
              organic traffic metrics and no spam
            </p>
          </div>
        </div>
      </section>

      <section className="md:px-12 rounded-2xl">
        <div className="px-4 py-4 flex gap-x-4 rounded-xl bg-[#FFF4ED] border-b border-indigo-100 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-md mb-4 p-2 mt-4 md:mt-1">
            <Database className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm font-normal text-left text-gray-600">
              Institutional Credit Settlement
            </h2>
            <p className="mt-3 text-sm text-gray-600 text-left max-w-xl mx-auto">
              Fulfillment of this opportunity earns your ledger{" "}
              <span className="font-medium text-indigo-700">120.00 CR</span>{" "}
              upon verification.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
