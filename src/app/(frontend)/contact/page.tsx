"use client";
import { useState } from "react";
import { z } from "zod";
import { Mail, Phone, MapPin, MessageCircle, Send, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

import { BRAND } from "@/lib/brand";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().email("Enter a valid email").max(160),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  budget: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().min(10, "Tell us a bit more about your project").max(2000),
});

const Contact = () => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      budget: String(fd.get("budget") ?? ""),
      message: String(fd.get("message") ?? ""),
    };
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      toast({
        title: "Please check your form",
        description: parsed.error.issues[0]?.message ?? "Invalid input",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const subject = encodeURIComponent(`New project inquiry from ${parsed.data.name}`);
    const body = encodeURIComponent(
      `Name: ${parsed.data.name}\nEmail: ${parsed.data.email}\nPhone: ${parsed.data.phone}\nBudget: ${parsed.data.budget}\n\n${parsed.data.message}`
    );
    window.location.href = `mailto:${BRAND.email}?subject=${subject}&body=${body}`;
    setTimeout(() => {
      setSubmitting(false);
      toast({ title: "Email opened", description: "We'll reply within one business day." });
    }, 600);
  };

  return (
    <>
      

      <section className="surface-dark relative overflow-hidden -mt-16 md:-mt-20 pt-32 pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -top-10 right-0 h-96 w-96 rounded-full bg-primary-glow/20 blur-3xl animate-blob" />
        <div className="container-tight relative">
          <p className="reveal text-sm font-semibold uppercase tracking-[0.25em] text-primary-glow">Contact</p>
          <h1 className="reveal mt-4 font-display text-4xl md:text-6xl font-bold tracking-tight max-w-3xl" data-delay="80">
            Let's discuss your <span className="text-gradient">project.</span>
          </h1>
          <p className="reveal mt-6 text-lg text-surface-dark-foreground/75 max-w-2xl" data-delay="160">
            Tell us a little about what you need — we'll get back to you within one business day.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container-tight grid gap-12 lg:grid-cols-5">
          {/* Form */}
          <form onSubmit={onSubmit} className="reveal lg:col-span-3 rounded-3xl bg-card border border-border p-8 md:p-10 shadow-card">
            <h2 className="font-display text-2xl font-bold">Send us a message</h2>
            <p className="text-sm text-muted-foreground mt-1">We typically reply within a few hours.</p>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Your name *</Label>
                <Input id="name" name="name" required maxLength={80} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" required maxLength={160} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" maxLength={40} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="budget">Budget</Label>
                <Input id="budget" name="budget" placeholder="e.g. ₦500k – ₦1M" maxLength={40} className="mt-1.5" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="message">Project details *</Label>
                <Textarea id="message" name="message" required rows={6} maxLength={2000} placeholder="Tell us what you'd like to build, your goals and timeline." className="mt-1.5" />
              </div>
            </div>

            <Button type="submit" variant="brand" size="xl" className="mt-7 w-full sm:w-auto" disabled={submitting}>
              {submitting ? "Opening email…" : "Send message"} <ArrowRight className="ml-1 h-5 w-5" />
            </Button>
          </form>

          {/* Contact info */}
          <aside className="lg:col-span-2 space-y-4">
            {[
              { i: Phone, t: "Call us", v: BRAND.phone, href: `tel:${BRAND.phoneRaw}` },
              { i: Mail, t: "Email us", v: BRAND.email, href: `mailto:${BRAND.email}` },
              { i: MessageCircle, t: "WhatsApp", v: "Chat with us instantly", href: BRAND.whatsapp, ext: true },
              { i: Send, t: "Messenger", v: "Send us a DM", href: BRAND.messenger, ext: true },
            ].map((c, i) => (
              <a
                key={c.t}
                href={c.href}
                target={c.ext ? "_blank" : undefined}
                rel={c.ext ? "noopener" : undefined}
                className="reveal flex items-center gap-4 rounded-2xl bg-card border border-border p-5 shadow-card hover:-translate-y-1 hover:shadow-elevated transition-smooth"
                data-delay={`${i * 60}`}
              >
                <div className="grid place-items-center h-12 w-12 rounded-xl bg-gradient-brand text-primary-foreground shadow-brand">
                  <c.i className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.t}</div>
                  <div className="font-semibold">{c.v}</div>
                </div>
              </a>
            ))}

            <div className="reveal rounded-2xl bg-card border border-border p-5 shadow-card" data-delay="240">
              <div className="flex items-center gap-3">
                <div className="grid place-items-center h-12 w-12 rounded-xl bg-accent text-accent-foreground">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Visit us</div>
              </div>
              <p className="mt-3 text-sm leading-relaxed">{BRAND.address}</p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
};

export default Contact;
