import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AppSidebar from "@/components/AppSidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <div className="lg:flex min-h-screen">
      <AppSidebar user={user} />
      <main className="flex-1 min-w-0 p-4 lg:p-6">{children}</main>
    </div>
  );
}
