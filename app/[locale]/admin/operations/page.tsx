import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/data';
import { AdminNavigation } from '@/components/admin/admin-navigation';
import { OperationsPreview } from '@/components/admin/operations-preview';

export default async function OperationsPage({ params }: { params: { locale: 'en' | 'zh' } }) {
  const { role } = await requireAdmin(params.locale);
  if (role !== 'super_admin') redirect(`/${params.locale}/admin`);
  return <main className="mx-auto max-w-6xl px-4 py-10"><h1 className="text-3xl font-bold text-forest">{params.locale === 'zh' ? '物料与采购' : 'Materials & purchasing'}</h1><AdminNavigation locale={params.locale} /><OperationsPreview zh={params.locale === 'zh'} /></main>;
}
