import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import TopBar from "@/components/TopBar";
import Footer from "@/components/Footer";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background text-on-surface overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 bg-surface overflow-y-auto z-10">
        <MobileNav />
        <TopBar />
        <main className="flex-1 p-6 md:p-10 lg:p-16">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
