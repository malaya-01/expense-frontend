import Link from "next/link";
import { JournalPageHeader } from "../../_components/JournalPageHeader";
import { JournalShell } from "../../_components/JournalShell";

export default function JournalFavoritesPage() {
  return (
    <JournalShell activeNav="favorites" headerTitle="Favorites">
      <JournalPageHeader title="Favorites" subtitle="Starred pages for quick access" />
      <ul className="space-y-1">
        <li><Link href="/journal/editor" className="jrn-doc-row"><span>⭐</span> Q2 career goals</Link></li>
        <li><Link href="/journal/daily" className="jrn-doc-row"><span>⭐</span> Daily journal template</Link></li>
      </ul>
    </JournalShell>
  );
}
