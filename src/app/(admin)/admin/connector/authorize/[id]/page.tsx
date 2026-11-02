import { notFound } from "next/navigation";
import { AlertTriangle, Check, ShieldCheck, X } from "lucide-react";
import { getDb } from "@/db/client";
import { verifySession } from "@/lib/auth";
import { getConsentRequest } from "@/lib/oauth/flow";
import { Button } from "@/components/ui/button";
import { decideConsent } from "./actions";

export const dynamic = "force-dynamic";

const CAN = [
  "Read published blog articles, site pages and the brand guidelines",
  "Add keywords to the blog queue and plan topic clusters",
  "Run the writing pipeline and save its stage outputs",
  "Create article drafts that wait for your review",
];
const CANNOT = ["Publish, approve, reject or delete articles", "Change any other page of the website", "Access clients, newsletter or settings"];

export default async function AuthorizeConnectorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const [request, session] = await Promise.all([getConsentRequest(getDb(), id), verifySession()]);
  if (!request) notFound();

  const closed = request.status !== "pending" || error === "expired";

  return (
    <div className="max-w-xl">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold tracking-tight">Connect to the Blog Agent</h1>
        </div>

        {closed ? (
          <p className="mt-6 text-muted-foreground">
            This connection request has {request.status === "decided" ? "already been answered" : "expired"}. Start the connection again from Claude.
          </p>
        ) : (
          <>
            <p className="mt-4 text-muted-foreground">
              <span className="font-semibold text-foreground">{request.clientName}</span> wants to use the Johnnybits Blog Agent on your behalf
              {session ? <> (signed in as {session.email})</> : null}.
            </p>

            <dl className="mt-6 grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Client</dt>
              <dd className="break-all">{request.clientId}</dd>
              <dt className="text-muted-foreground">Returns to</dt>
              <dd className="font-medium">{request.redirectHost}</dd>
            </dl>

            {request.loopbackRedirect && (
              <div className="mt-6 flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <p>This returns to a program on a computer (for example Claude Code). Approve only if you started this connection yourself.</p>
              </div>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <h2 className="font-semibold mb-2">It can</h2>
                <ul className="space-y-1.5">
                  {CAN.map((c) => (
                    <li key={c} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />{c}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="font-semibold mb-2">It cannot</h2>
                <ul className="space-y-1.5">
                  {CANNOT.map((c) => (
                    <li key={c} className="flex gap-2"><X className="h-4 w-4 shrink-0 text-destructive mt-0.5" />{c}</li>
                  ))}
                </ul>
              </div>
            </div>

            <form action={decideConsent} className="mt-8 flex gap-3">
              <input type="hidden" name="id" value={request.id} />
              <Button type="submit" name="decision" value="approve">Approve</Button>
              <Button type="submit" name="decision" value="deny" variant="outline">Deny</Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
