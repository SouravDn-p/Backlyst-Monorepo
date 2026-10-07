import BlogHero from '@/components/blog/BlogHero';
import BlogResources from '@/components/blog/BlogResources';
import CTASection from '@/components/landing/CtaSection';
import { FileCheck, PlayCircle } from 'lucide-react';

const BlogPage = () => {
  return (
    <div>
        <BlogHero />
        <BlogResources />
        <div className="mx-auto">
        <CTASection
          title="Ready to grow your authority?"
          description="Join the new era of SEO outreach. Buy credits, create your first task, and experience backlink building without the friction."
          primaryAction={{
            label: "CREATE YOUR FIRST TASK",
            href: "/dashboard",
            icon: <FileCheck className="w-6 h-6" />,
          }}
          secondaryAction={{
            label: "HOW IT WORKS",
            href: "/how-it-works",
            icon: <PlayCircle className="w-6 h-6" />,
          }}
        />
      </div>
    </div>
  )
}

export default BlogPage;