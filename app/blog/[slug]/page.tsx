import { redirect } from "next/navigation";
export default function BlogArticleRedirect({ params }: { params: { slug: string } }) { redirect(`/en/blog/${params.slug}`); }
