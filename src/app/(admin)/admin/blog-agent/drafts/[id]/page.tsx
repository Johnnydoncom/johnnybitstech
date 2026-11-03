import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ExternalLink, ShieldAlert } from "lucide-react";
import { getDb } from "@/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireAdmin } from "@/lib/blog-agent/admin/auth";
import { getArticle, listInternalLinks, prePublishCheck } from "@/lib/blog-agent/admin/drafts";
import { renderArticleHtml } from "@/lib/blog/render";
import { deleteArticleAction, editLinkAction, publishAction, rejectAction, restoreAction, saveDraftAction, unpublishAction, uploadImageAction } from "../../actions";
import { ConfirmButton } from "../../_components/ConfirmButton";
import { AgentHeader, Card, Notice, StatusBadge, fmt } from "../../_components/ui";

export const dynamic = "force-dynamic";

type QaReport = {
  qa?: { verdict: string; summary: string; issues: { severity: string; location: string; problem: string; exact_revision: string }[] };
  validation?: { warnings: { message: string }[] };
  seo_warnings?: { message: string }[];
};

export default async function DraftReviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const db = getDb();
  const a = await getArticle(db, id);
  if (!a) notFound();
  if (a.content_format !== "markdown") notFound();

  const [check, links] = await Promise.all([prePublishCheck(db, id), Promise.resolve(listInternalLinks(a.content))]);
  const qa = (a.qa_report ?? {}) as QaReport;
  const citations = (a.citations ?? []) as { id: string; publisher?: string; url: string; date?: string }[];
  const editable = a.status === "pending_review" || a.status === "rejected" || a.status === "published";
  const metrics = check.metrics as { word_count?: number; reading_minutes?: number; flesch_reading_ease?: number; internal_links?: number; citations?: number };

  return (
    <div>
      <AgentHeader title={a.title} description={`/blog/${a.slug}`} active="/admin/blog-agent/drafts" />
      <Notice ok={sp.ok} error={sp.error} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),380px]">
        <div className="space-y-6 min-w-0">
          {/* Edit */}
          {editable && (
            <Card>
              <h2 className="font-semibold mb-4">Edit</h2>
              <form action={saveDraftAction} className="space-y-4">
                <input type="hidden" name="id" value={a.id} />
                <div><Label htmlFor="title">Title</Label><Input id="title" name="title" defaultValue={a.title} required className="mt-1.5" /></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="slug">Slug {(a.status === "published" || a.published_at) && <span className="text-muted-foreground">(locked once published)</span>}</Label>
                    <Input id="slug" name="slug" defaultValue={a.slug} readOnly={a.status === "published" || Boolean(a.published_at)} required className="mt-1.5 font-mono" />
                  </div>
                  <div><Label htmlFor="category">Category</Label><Input id="category" name="category" defaultValue={a.category ?? ""} required className="mt-1.5" /></div>
                </div>
                <div><Label htmlFor="meta_title">Meta title (20–60)</Label><Input id="meta_title" name="meta_title" defaultValue={a.meta_title ?? ""} maxLength={60} required className="mt-1.5" /></div>
                <div><Label htmlFor="meta_description">Meta description (120–160)</Label><Textarea id="meta_description" name="meta_description" defaultValue={a.meta_description ?? ""} rows={2} maxLength={160} required className="mt-1.5" /></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div><Label htmlFor="og_title">Social title (optional)</Label><Input id="og_title" name="og_title" defaultValue={a.og_title ?? ""} maxLength={90} className="mt-1.5" /></div>
                  <div><Label htmlFor="tags">Tags (comma-separated, max 8)</Label><Input id="tags" name="tags" defaultValue={(a.tags ?? []).join(", ")} className="mt-1.5" /></div>
                </div>
                <div><Label htmlFor="og_description">Social description (optional)</Label><Textarea id="og_description" name="og_description" defaultValue={a.og_description ?? ""} rows={2} maxLength={200} className="mt-1.5" /></div>
                <div><Label htmlFor="featured_image_alt">Featured image alt text (max 125)</Label><Input id="featured_image_alt" name="featured_image_alt" defaultValue={a.featured_image_alt ?? ""} maxLength={125} className="mt-1.5" /></div>
                <div>
                  <Label htmlFor="content">Article (Markdown)</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Citations are footnotes like [^r1]. The FAQ structured data is rebuilt from the “Frequently asked questions” section when you save.</p>
                  <Textarea id="content" name="content" defaultValue={a.content} rows={28} required className="mt-1.5 font-mono text-xs leading-relaxed" />
                </div>
                <Button type="submit">Save changes</Button>
              </form>
            </Card>
          )}

          {/* Links */}
          <Card>
            <h2 className="font-semibold mb-1">Internal links ({links.length})</h2>
            <p className="text-sm text-muted-foreground mb-4">Change a link to another published page (for example /portfolio or /blog/some-post), or remove it.</p>
            <ul className="space-y-3">
              {links.map((l, i) => (
                <li key={`${l.url}-${i}`} className="rounded-lg border border-border p-3">
                  <div className="text-sm"><span className="font-medium">“{l.anchor}”</span> → <span className="font-mono text-xs">{l.url}</span></div>
                  {editable && (
                    <form action={editLinkAction} className="mt-2 flex flex-wrap gap-2">
                      <input type="hidden" name="id" value={a.id} /><input type="hidden" name="anchor" value={l.anchor} /><input type="hidden" name="url" value={l.url} />
                      <Input name="new_url" defaultValue={l.url} className="h-8 max-w-xs font-mono text-xs" aria-label="New URL" />
                      <Button type="submit" name="intent" value="change" size="sm" variant="outline">Change</Button>
                      <Button type="submit" name="intent" value="remove" size="sm" variant="ghost">Remove</Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          {/* Preview */}
          <Card>
            <h2 className="font-semibold mb-4">Preview</h2>
            {a.featured_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.featured_image} alt={a.featured_image_alt ?? ""} className="mb-6 w-full max-h-80 object-cover rounded-xl" />
            )}
            <h1 className="font-display text-3xl font-bold tracking-tight leading-tight mb-6">{a.title}</h1>
            <div className="blog-content" dangerouslySetInnerHTML={{ __html: renderArticleHtml(a.content, "markdown") }} />
          </Card>
        </div>

        <aside className="space-y-6">
          {/* Publish */}
          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">Status</h2>
              <StatusBadge status={a.status} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Created {fmt(a.created_at as string)}{a.published_at ? ` · published ${fmt(a.published_at)}` : ""}
            </p>
            {a.status === "published" && (
              <Link href={`/blog/${a.slug}`} target="_blank" className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">View live <ExternalLink className="h-3.5 w-3.5" /></Link>
            )}
            {a.rejection_reason && <p className="mt-3 rounded-lg bg-destructive/10 p-2 text-sm text-destructive">Rejected: {a.rejection_reason}</p>}

            {check.blockers.length > 0 && (
              <div className="mt-4">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-destructive"><ShieldAlert className="h-4 w-4" /> Must fix before publishing</h3>
                <ul className="mt-2 space-y-1.5 text-sm">{check.blockers.map((b, i) => <li key={i} className="text-destructive">{b.message}</li>)}</ul>
              </div>
            )}
            {check.warnings.length > 0 && (
              <div className="mt-4">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-amber-700"><AlertTriangle className="h-4 w-4" /> Worth checking</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">{check.warnings.map((w, i) => <li key={i}>{w.message}</li>)}</ul>
              </div>
            )}

            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div><dt className="text-muted-foreground text-xs">Words</dt><dd className="font-medium">{metrics.word_count ?? a.word_count as number}</dd></div>
              <div><dt className="text-muted-foreground text-xs">Read time</dt><dd className="font-medium">{metrics.reading_minutes ?? "—"} min</dd></div>
              <div><dt className="text-muted-foreground text-xs">Readability</dt><dd className="font-medium">{metrics.flesch_reading_ease ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground text-xs">Internal links</dt><dd className="font-medium">{metrics.internal_links ?? links.length}</dd></div>
            </dl>

            {a.status === "pending_review" && (
              <div className="mt-6 space-y-4">
                <form action={publishAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <ConfirmButton className="w-full" disabled={check.blockers.length > 0} message="Publish this article to johnnybits.com now?">
                    Approve &amp; publish
                  </ConfirmButton>
                </form>
                <form action={rejectAction} className="space-y-2 border-t border-border pt-4">
                  <input type="hidden" name="id" value={a.id} />
                  <Label htmlFor="reason">Reject with a reason</Label>
                  <Textarea id="reason" name="reason" rows={2} minLength={5} required placeholder="What should change next time?" />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requeue" /> Put the keyword back in the queue</label>
                  <Button type="submit" variant="outline" className="w-full">Reject</Button>
                </form>
              </div>
            )}
            {a.status === "published" && (
              <form action={unpublishAction} className="mt-6 border-t border-border pt-4">
                <input type="hidden" name="id" value={a.id} />
                <ConfirmButton variant="outline" className="w-full" message="Take this article off johnnybits.com? It goes back to review and can be published again.">
                  Unpublish
                </ConfirmButton>
                <p className="mt-2 text-xs text-muted-foreground">Removes the page and its search entries; keeps the URL and publish date for re-publishing.</p>
              </form>
            )}
            {a.status === "rejected" && (
              <div className="mt-6 flex gap-2">
                <form action={restoreAction}><input type="hidden" name="id" value={a.id} /><Button type="submit" variant="outline" size="sm">Back to review</Button></form>
                <form action={deleteArticleAction}><input type="hidden" name="id" value={a.id} /><ConfirmButton variant="destructive" size="sm" message="Delete this rejected article permanently?">Delete</ConfirmButton></form>
              </div>
            )}
          </Card>

          {/* Image */}
          <Card>
            <h2 className="font-semibold mb-2">Featured image</h2>
            {a.featured_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.featured_image} alt={a.featured_image_alt ?? ""} className="w-full aspect-[16/10] object-cover rounded-lg border border-border" />
            ) : (
              <p className="text-sm text-muted-foreground">No image yet.</p>
            )}
            {editable && (
              <form action={uploadImageAction} className="mt-3 space-y-2">
                <input type="hidden" name="id" value={a.id} />
                <Input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/avif" required aria-label="Featured image" />
                <p className="text-xs text-muted-foreground">JPEG, PNG, WebP or AVIF up to 4 MB, at least 600 × 315 (1200 × 630 is ideal). Saved as WebP under 400 KB.</p>
                <Button type="submit" size="sm" variant="outline">Upload</Button>
              </form>
            )}
            {a.image_prompt && (
              <details className="mt-3 text-sm"><summary className="cursor-pointer text-muted-foreground">Image prompt from the agent</summary><p className="mt-2">{a.image_prompt}</p></details>
            )}
          </Card>

          {/* QA */}
          {qa.qa && (
            <Card>
              <div className="flex items-center justify-between"><h2 className="font-semibold">Editorial QA</h2><StatusBadge status={qa.qa.verdict === "PASS" ? "done" : "failed"} /></div>
              <p className="mt-2 text-sm text-muted-foreground">{qa.qa.summary}</p>
              {qa.qa.issues.length > 0 && (
                <ul className="mt-3 space-y-2 text-sm">
                  {qa.qa.issues.map((iss, i) => <li key={i}><span className="font-medium capitalize">{iss.severity}</span> · {iss.location}: {iss.problem}</li>)}
                </ul>
              )}
            </Card>
          )}

          {/* Sources */}
          {citations.length > 0 && (
            <Card>
              <h2 className="font-semibold mb-2">Sources ({citations.length})</h2>
              <ul className="space-y-1.5 text-sm">
                {citations.map((c) => (
                  <li key={c.id}><span className="font-mono text-xs text-muted-foreground">{c.id}</span> <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{c.publisher ?? c.url}</a>{c.date ? ` · ${c.date}` : ""}</li>
                ))}
              </ul>
            </Card>
          )}
          {a.run_id && <Link href={`/admin/blog-agent/runs/${a.run_id}`} className="block text-sm text-primary hover:underline">View the run that wrote this →</Link>}
        </aside>
      </div>
    </div>
  );
}
