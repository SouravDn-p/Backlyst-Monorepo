import Link from "next/link";

type LegalDocumentLinkProps = {
  href: string;
  children: React.ReactNode;
};

export function LegalDocumentLink({ href, children }: LegalDocumentLinkProps) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand-orange font-bold underline underline-offset-2 hover:text-brand-orange/80"
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </Link>
  );
}
