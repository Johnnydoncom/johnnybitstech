"use client";

import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { useReveal } from "@/hooks/useReveal";
import { FloatingActions } from "@/components/FloatingActions";

export const Layout = ({ children }: { children: ReactNode }) => {
  useReveal();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 pt-16 md:pt-20">{children}</main>
      <Footer />
      <FloatingActions />
    </div>
  );
};
