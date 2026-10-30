import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import InventoryAdminPage from '../inventory/page';
export const dynamic = 'force-dynamic';
import { requireAdmin } from '@/lib/data';
import { AdminNavigation } from '@/components/admin/admin-navigation';
import { OperationsPreview } from '@/components/admin/operations-preview';

export default async function OperationsPage({ params }: { params: { locale: 'en' | 'zh' } }) {
  const { role } = await requireAdmin(params.locale);
  if (role !== 'super_admin') redirect(`/${params.locale}/admin`);
  const db = createClient();
  let ready = false;
  try {
    const probes = await Promise.all([
      db.from('inventory_suppliers').select('country_name,default_currency').limit(1),
      db.from('inventory_materials').select('id').limit(1),
      db.from('inventory_purchase_receipts').select('id').limit(1),
      db.from('inventory_fixed_assets').select('id').limit(1),
      db.from('inventory_opening_batches').select('id').limit(1)
    ]);
    ready = probes.every(probe => !probe.error);
  } catch { ready = false; }
  if (ready) return InventoryAdminPage({ params });
  return <main className="mx-auto max-w-6xl px-4 py-10"><h1 className="text-3xl font-bold text-forest">{params.locale === 'zh' ? '物料与采购' : 'Materials & purchasing'}</h1><AdminNavigation locale={params.locale} /><p role="status" className="mt-6 rounded-xl bg-white p-4">{params.locale === 'zh' ? '正式版等待数据库启用；下方保留原有预览，尚不能录入正式库存。' : 'The live module awaits database activation. Your original preview remains below; official stock entry is not yet available.'}</p><OperationsPreview zh={params.locale === 'zh'} /></main>;
}
