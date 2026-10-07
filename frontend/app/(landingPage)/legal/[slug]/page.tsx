import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocumentArticle } from "@/components/legal/LegalDocumentArticle";
import {
  getLegalDocumentBySlug,
  REGISTRATION_LEGAL_DOCUMENTS,
} from "@/lib/legal/documents";
import { getLegalPolicyBySlug } from "@/lib/legal/policies";

type LegalPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return REGISTRATION_LEGAL_DOCUMENTS.map((document) => ({
    slug: document.slug,
  }));
}

export async function generateMetadata({
  params,
}: LegalPageProps): Promise<Metadata> {
  const { slug } = await params;
  const document = getLegalDocumentBySlug(slug);

  if (!document) {
    return { title: "Legal document | Backlyst" };
  }

  return {
    title: `${document.name} | Backlyst`,
    description: document.description,
  };
}

export default async function LegalDocumentPage({ params }: LegalPageProps) {
  const { slug } = await params;
  const document = getLegalDocumentBySlug(slug);
  const policy = getLegalPolicyBySlug(slug);

  if (!document || !policy) {
    notFound();
  }

  return <LegalDocumentArticle document={document} policy={policy} />;
}
