import { AscendSchoolCupAdmin, type SchoolAdminRow } from "@/components/ascend/ascend-school-cup-admin";
import type { Locale } from "@/lib/constants";
import { requireAdmin } from "@/lib/data";
import { createServiceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminAscendLeaderboardPage({ params }: { params: { locale: Locale } }) {
  await requireAdmin(params.locale);
  const service = createServiceClient();
  const { data: schoolRows } = await service.from("ascend_schools").select("id,school_name").eq("is_active", true).order("school_name");
  const schools: SchoolAdminRow[] = (schoolRows ?? []).map((school) => ({
    id: school.id,
    schoolName: school.school_name
  }));

  return (
    <main className="flex min-h-screen items-start justify-center bg-paper px-5 py-12 text-forest md:px-8">
      <div className="w-full max-w-xl">
        <AscendSchoolCupAdmin schools={schools} />
      </div>
    </main>
  );
}
