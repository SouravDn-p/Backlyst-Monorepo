"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type FAQContent =
  | { type: "paragraph"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

type FAQItem = {
  q: string;
  content: FAQContent[];
};

const faqs: FAQItem[] = [
  {
    q: "How are publishers verified on Backlyst?",
    content: [
      {
        type: "paragraph",
        text: "Every publisher undergoes a rigorous 12-point verification process including DR metrics, organic traffic auditing, and manual content quality checks by our internal SEO team.",
      },
    ],
  },
  {
    q: "Can I request custom anchor or content?",
    content: [
      {
        type: "paragraph",
        text: "Absolutely! When creating a task, you have full control over anchor text, surrounding content guidelines, and even the writer's tone and style preferences.",
      },
    ],
  },
  {
    q: "How does the audit process system work?",
    content: [
      {
        type: "paragraph",
        text: "Our system continuously monitors your link status. If a link drops or metrics change significantly within the guarantee period, a replacement protocol is automatically triggered.",
      },
    ],
  },
  {
    q: "What happens if a link is removed?",
    content: [
      {
        type: "paragraph",
        text: "All professional and enterprise plans include our Link Replacement Guarantee. If a link is removed within 12 months, we will reach out to the provider or provide a comparable alternative at no extra cost.",
      },
    ],
  },
  {
    q: "How many credits does a backlink or guest post cost?",
    content: [
      {
        type: "paragraph",
        text: "Credits are simple and predictable:",
      },
      {
        type: "ul",
        items: [
          "Backlink = 1 task credit",
          "Guest Post = 2 task credits (higher SEO value)",
          "Domain Authority (DA) does not affect credit cost",
          "Credits are deducted only after verification and acceptance",
        ],
      },
    ],
  },
  {
    q: "How can I earn additional task credits?",
    content: [
      {
        type: "paragraph",
        text: "You can earn credits in three ways:",
      },
      {
        type: "ol",
        items: [
          "+1 credit per verified weekly backlink",
          "+1 milestone bonus for every 10 verified backlinks",
          "Referral reward after the referred user completes their first verified backlink",
        ],
      },
    ],
  },
  {
    q: "How does marketplace visibility work?",
    content: [
      {
        type: "ul",
        items: [
          "1 verified backlink per week maintains visibility",
          "2-day grace period before visibility pauses",
          "Visibility credits cost £9.99 (7-day extension each)",
          "Posting restores visibility for free",
          "DA affects ranking position only, not credits",
        ],
      },
    ],
  },
  {
    q: "Are there limits on credit balances?",
    content: [
      {
        type: "ul",
        items: [
          "Each tier has a maximum task credit capacity",
          "Users cannot exceed their tier limit",
          "Subscription credits refresh monthly",
          "Earned & referral credits never expire",
          "Visibility credits are separate from task credits",
        ],
      },
    ],
  },
  {
    q: "How are milestones and badges awarded?",
    content: [
      {
        type: "ul",
        items: [
          "Every 10 verified backlinks → +1 bonus credit",
          "Milestones tracked per website",
          "Badges valid for 30 days",
          "Eligibility continuously re-evaluated",
          "Some badges may grant visibility credits",
        ],
      },
    ],
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-white py-16 md:py-24 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-gray-900">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-gray-600 text-lg">
            Everything you need to know about how Backlyst works.
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;

            return (
              <div
                key={i}
                className="border border-gray-200 rounded-xl bg-gray-50/60 transition-all duration-200 cursor-pointer"
              >
                {/* Question */}
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left cursor-pointer"
                >
                  <span className="text-base md:text-lg font-medium text-gray-900">
                    {faq.q}
                  </span>

                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Answer */}
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-6 pb-6 pt-2 space-y-4 text-gray-700 text-sm md:text-base leading-relaxed">
                      {faq.content.map((block, idx) => {
                        if (block.type === "paragraph") {
                          return <p key={idx}>{block.text}</p>;
                        }

                        if (block.type === "ul") {
                          return (
                            <ul
                              key={idx}
                              className="space-y-2 pl-5 list-disc marker:text-gray-400"
                            >
                              {block.items.map((item, j) => (
                                <li key={j} className="pl-1">
                                  {item}
                                </li>
                              ))}
                            </ul>
                          );
                        }

                        if (block.type === "ol") {
                          return (
                            <ol
                              key={idx}
                              className="space-y-2 pl-5 list-decimal marker:text-gray-400"
                            >
                              {block.items.map((item, j) => (
                                <li key={j} className="pl-1">
                                  {item}
                                </li>
                              ))}
                            </ol>
                          );
                        }

                        return null;
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
