import { redirect } from "next/navigation";
export default function SearchRedirect({ searchParams }: { searchParams?: { q?: string } }) { const query = searchParams?.q ? `?q=${encodeURIComponent(searchParams.q)}` : ""; redirect(`/en/search${query}`); }
