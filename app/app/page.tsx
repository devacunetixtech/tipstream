import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard";

export const metadata: Metadata = {
  title: "App",
  description: "Create and manage your live BOT payment streams.",
};

export default function AppPage() {
  return <Dashboard />;
}
