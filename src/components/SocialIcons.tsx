import { BRAND } from "@/lib/brand";

const FacebookSVG = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>;
const TwitterSVG = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>;
const InstagramSVG = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>;
const TikTokSVG = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></svg>;
const LinkedInSVG = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>;

export const SocialIcons = ({
  className = "",
  variant = "footer"
}: {
  className?: string;
  variant?: "footer" | "contact";
}) => {
  const socials = [
    { name: "Facebook", href: BRAND.socials.facebook, icon: <FacebookSVG /> },
    { name: "Twitter", href: BRAND.socials.twitter, icon: <TwitterSVG /> },
    { name: "Instagram", href: BRAND.socials.instagram, icon: <InstagramSVG /> },
    { name: "TikTok", href: BRAND.socials.tiktok, icon: <TikTokSVG /> },
    { name: "LinkedIn", href: BRAND.socials.linkedin, icon: <LinkedInSVG /> },
  ].filter(s => s.href);

  if (variant === "contact") {
    return (
      <div className={`flex flex-wrap items-center gap-4 ${className}`}>
        {socials.map((s) => (
          <a
            key={s.name}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.name}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground shadow-brand transition-all duration-300 hover:scale-110 hover:-translate-y-1 hover:shadow-elevated"
          >
            {s.icon}
          </a>
        ))}
      </div>
    );
  }

  // Footer variant
  return (
    <div className={`flex items-center gap-5 ${className}`}>
      {socials.map((s) => (
        <a
          key={s.name}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={s.name}
          className="text-surface-dark-foreground/70 hover:text-white hover:-translate-y-1 transition-all duration-300"
        >
          {s.icon}
        </a>
      ))}
    </div>
  );
};
