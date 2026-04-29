import { MessageCircle, Phone } from "lucide-react";
import { BRAND } from "@/lib/brand";

export const FloatingActions = () => (
  <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-3">
    <a
      href={BRAND.whatsapp}
      target="_blank"
      rel="noopener"
      aria-label="Chat on WhatsApp"
      className="relative h-13 w-13 grid place-items-center rounded-full bg-gradient-brand text-primary-foreground shadow-brand transition-smooth hover:scale-110"
      style={{ height: 56, width: 56 }}
    >
      <span className="absolute inset-0 rounded-full bg-primary-glow animate-pulse-ring" />
      <MessageCircle className="relative h-6 w-6" />
    </a>
    <a
      href={`tel:${BRAND.phoneRaw}`}
      aria-label="Call us"
      className="hidden sm:grid h-13 w-13 place-items-center rounded-full bg-secondary text-secondary-foreground shadow-card transition-smooth hover:scale-110"
      style={{ height: 56, width: 56 }}
    >
      <Phone className="h-5 w-5" />
    </a>
  </div>
);
