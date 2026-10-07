import Link from "next/link";
import {
  REGISTRATION_LEGAL_DOCUMENTS,
  type RegistrationLegalDocument,
} from "@/lib/legal/documents";
import type { LegalPolicy } from "@/lib/legal/policyTypes";

type LegalDocumentArticleProps = {
  document: RegistrationLegalDocument;
  policy: LegalPolicy;
};

export function LegalDocumentArticle({
  document,
  policy,
}: LegalDocumentArticleProps) {
  const relatedDocuments = REGISTRATION_LEGAL_DOCUMENTS.filter(
    (item) => item.slug !== document.slug,
  );

  return (
    <article className="bg-white pt-20">
      <header className="border-b border-gray-200 bg-[#fdfdff]">
        <div className="mx-auto max-w-3xl px-4 py-14 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Backlyst Legal
          </p>
          <h1 className="mt-4 font-sora text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            {document.name}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
            {document.description}
          </p>

          <dl className="mt-8 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Version
              </dt>
              <dd className="mt-1 font-medium text-gray-900">{policy.version}</dd>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Effective date
              </dt>
              <dd className="mt-1 font-medium text-gray-900">
                {policy.effectiveDate}
              </dd>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Governing law
              </dt>
              <dd className="mt-1 font-medium text-gray-900">
                {policy.governingLaw}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <nav
          aria-label="Table of contents"
          className="rounded-2xl border border-gray-200 bg-gray-50 p-6"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Contents
          </h2>
          <ol className="mt-4 space-y-2 text-sm">
            {policy.sections.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-gray-700 hover:text-primary"
                >
                  {index + 1}. {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-4 space-y-12">
          {policy.sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-28"
            >
              <h2 className="font-sora text-xl font-semibold text-gray-900 md:text-2xl">
                {index + 1}. {section.title}
              </h2>
              <div className="mt-4 space-y-4 text-[15px] leading-7 text-gray-700">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets ? (
                  <ul className="list-disc space-y-2 pl-5">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ))}
        </div>

        <aside className="mt-16 border-t border-gray-200 pt-10">
          <h2 className="font-sora text-lg font-semibold text-gray-900">
            Related documents
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {relatedDocuments.map((item) => (
              <li key={item.slug}>
                <Link
                  href={item.href}
                  className="block rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-800 hover:border-primary hover:text-primary"
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-gray-500">
            Last updated {policy.lastUpdated}. Questions about this document can
            be sent via the{" "}
            <Link
              href="/contact"
              className="font-semibold text-primary hover:text-primary/80"
            >
              Contact page
            </Link>
            .
          </p>
          <p className="mt-3 text-sm text-gray-500">
            <Link
              href="/auth/register"
              className="font-semibold text-primary hover:text-primary/80"
            >
              Return to account registration
            </Link>
          </p>
        </aside>
      </div>
    </article>
  );
}
