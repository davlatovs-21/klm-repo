import type { ReactNode } from "react";
import DashboardTabs from "@/components/DashboardTabs";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <DashboardTabs />
      {children}
    </>
  );
}
