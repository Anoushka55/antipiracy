'use client';

import Link from 'next/link';
import { useApi } from '@/hooks/useApi';
import { Badge } from '@/components/shared/Badge';
import { PageLoader } from '@/components/shared/LoadingDots';
import type { CatalogueAsset } from '@/lib/types';

export default function CataloguePage() {
  const { data, loading } = useApi<{ items: CatalogueAsset[] }>('catalogue');
  if (loading || !data) return <PageLoader />;
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-4">
      <h1 className="text-2xl font-bold">S. Chand Protected Catalogue</h1>
      <p className="text-sm text-[#6B7280]">Tenant-scoped rights inventory used for matching, validation and financial estimates.</p>
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] border-b border-[#E2E8F0]">
            <tr>{['Title', 'ISBN', 'Edition', 'Author', 'Category', 'Priority', 'Rights Owner', 'Territories', 'Status'].map((h) => <th key={h} className="text-left px-3 py-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.items.map((a) => (
              <tr key={a.id} className="border-b border-[#E2E8F0]">
                <td className="px-3 py-3 font-semibold"><Link className="text-[#c83328]" href={`/catalogue/${a.id}`}>{a.title}</Link></td>
                <td className="px-3 py-3 font-mono">{a.isbn}</td>
                <td className="px-3 py-3">{a.edition}</td>
                <td className="px-3 py-3">{a.author}</td>
                <td className="px-3 py-3">{a.category}</td>
                <td className="px-3 py-3">{a.priorityTitle ? <Badge color="red">Yes</Badge> : <Badge color="grey">No</Badge>}</td>
                <td className="px-3 py-3">{a.rightsOwner}</td>
                <td className="px-3 py-3">{a.territories.join(', ')}</td>
                <td className="px-3 py-3">{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
