import Link from "next/link";
import { Mail, Phone, MapPin, MessageCircle, Send } from "lucide-react";
import { BRAND, NAV_LINKS, SERVICES } from "@/lib/brand";

export const Footer = () => {
  return (
    <footer className="surface-dark mt-24">
      <div className="container-tight py-16 grid gap-12 grid-cols-2 lg:grid-cols-4">
        <div className="col-span-2 lg:col-span-1">
          <Link href="/" className="inline-flex items-center gap-2 mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/johnnybits-logo.png" alt={BRAND.name} className="h-10 w-auto brightness-110" />
          </Link>
          <p className="text-sm text-surface-dark-foreground/75 leading-relaxed max-w-xs">
            Creative web design, development & digital marketing agency based in
            Ibadan, Nigeria. We help brands grow online.
          </p>
        </div>

        <div>
          <h4 className="font-display font-semibold mb-4 text-surface-dark-foreground">Explore</h4>
          <ul className="space-y-2.5 text-sm">
            {NAV_LINKS.map((l) => (
              <li key={l.to}>
                <Link
                  href={l.to}
                  className="text-surface-dark-foreground/70 hover:text-primary-glow transition-smooth"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-display font-semibold mb-4 text-surface-dark-foreground">Services</h4>
          <ul className="space-y-2.5 text-sm">
            {SERVICES.slice(0, 6).map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/services/${s.slug}`}
                  className="text-surface-dark-foreground/70 hover:text-primary-glow transition-smooth"
                >
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="col-span-2 lg:col-span-1">
          <h4 className="font-display font-semibold mb-4 text-surface-dark-foreground">Contact</h4>
          <ul className="space-y-3 text-sm text-surface-dark-foreground/80">
            <li className="flex items-start gap-3">
              <MapPin className="h-4 w-4 mt-0.5 text-primary-glow shrink-0" />
              <span>{BRAND.address}</span>
            </li>
            <li>
              <a href={`tel:${BRAND.phoneRaw}`} className="flex items-center gap-3 hover:text-primary-glow">
                <Phone className="h-4 w-4 text-primary-glow" /> {BRAND.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${BRAND.email}`} className="flex items-center gap-3 hover:text-primary-glow">
                <Mail className="h-4 w-4 text-primary-glow" /> {BRAND.email}
              </a>
            </li>
            <li>
              <a href={BRAND.whatsapp} target="_blank" rel="noopener" className="flex items-center gap-3 hover:text-primary-glow">
                <MessageCircle className="h-4 w-4 text-primary-glow" /> WhatsApp
              </a>
            </li>
            <li>
              <a href={BRAND.messenger} target="_blank" rel="noopener" className="flex items-center gap-3 hover:text-primary-glow">
                <Send className="h-4 w-4 text-primary-glow" /> Messenger
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-tight py-6 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs text-surface-dark-foreground/60">
          <p>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</p>
          <p>Designed & built in Ibadan, Nigeria 🇳🇬</p>
        </div>
      </div>
    </footer>
  );
};
