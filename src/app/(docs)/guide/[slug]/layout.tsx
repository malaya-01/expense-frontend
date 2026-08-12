import { GUIDE_CHAPTERS } from "@/lib/guide/chapters";

export function generateStaticParams() {
  return GUIDE_CHAPTERS.map((chapter) => ({ slug: chapter.slug }));
}

export default function LegacyGuideSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
