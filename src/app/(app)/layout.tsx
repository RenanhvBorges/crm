import Image from "next/image";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { SidebarNav } from "@/components/sidebar-nav";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? null;
  }

  return (
    <div className="flex min-h-screen w-full">
      <aside className="flex w-60 shrink-0 flex-col bg-oxford-blue text-white">
        <div className="p-6">
          <Image
            src="/brand/logo-oxford-horizontal-white.png"
            alt="Oxford"
            width={120}
            height={27}
            priority
          />
        </div>

        <SidebarNav role={role} />

        <form action={signOut} className="p-3">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} strokeWidth={1.5} />
            Sair
          </button>
        </form>
      </aside>

      <div className="flex-1 bg-bg-surface-2">
        <main className="mx-auto max-w-6xl px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
