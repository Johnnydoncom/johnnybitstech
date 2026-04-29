import { FileText, Mail, Users, Globe, ArrowRight } from "lucide-react";
import Link from "next/link";

const CARDS = [
  { title: "Blog Posts", desc: "Create, edit and manage your blog content.", href: "/admin/blog", icon: FileText, color: "bg-primary/10 text-primary" },
  { title: "Newsletter", desc: "View subscribers and manage your mailing list.", href: "/admin/newsletter", icon: Mail, color: "bg-accent text-accent-foreground" },
  { title: "Clients", desc: "Manage the client logos shown on your website.", href: "/admin/clients", icon: Users, color: "bg-primary/10 text-primary" },
  { title: "SEO & Sitemap", desc: "Generate sitemaps and manage blog SEO metadata.", href: "/admin/seo", icon: Globe, color: "bg-accent text-accent-foreground" },
];

export default function AdminDashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Welcome back. Manage your website from here.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className={`inline-grid h-11 w-11 place-items-center rounded-xl ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-display text-lg font-bold">{card.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{card.desc}</p>
            <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Manage <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
