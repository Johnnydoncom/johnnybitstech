import type { Metadata } from "next";
import { Layout } from "@/components/layout/Layout";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Home",
  description: "Premium digital services and solutions",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout>
      <>
        {children}
        <Script id="tawk-to" strategy="lazyOnload">
          {`
            var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
            (function(){
            var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
            s1.async=true;
            s1.src='https://embed.tawk.to/61251667d6e7610a49b1c743/1fdsdv3a8';
            s1.charset='UTF-8';
            s1.setAttribute('crossorigin','*');
            s0.parentNode.insertBefore(s1,s0);
            })();
          `}
        </Script>
      </>
    </Layout>
  );
}
