import { redirect } from "next/navigation";
export default function GuideRedirect({ params }: { params: { slug: string } }) { redirect(`/en/guides/${params.slug}`); }
