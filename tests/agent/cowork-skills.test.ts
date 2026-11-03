import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getBrandContext } from "@/lib/blog-agent/brand/johnnybits";
import { stageSchemas, type AgentStage } from "@/lib/blog-agent/schemas/stages";

/**
 * The Cowork skills in docs/cowork/skills teach Claude the stage contracts. Their worked examples must pass the
 * same schemas save_stage_output applies, or the agent learns outputs the server rejects.
 */
const SKILLS_DIR = join(process.cwd(), "docs", "cowork", "skills");
const skills = readdirSync(SKILLS_DIR).map((name) => ({ name, text: readFileSync(join(SKILLS_DIR, name, "SKILL.md"), "utf8").replace(/\r\n/g, "\n") }));

/** Splits a skill into sections by H1/H2 heading and returns each stage's first JSON example. */
function stageExamples(text: string): { stage: AgentStage; json: string }[] {
  const out: { stage: AgentStage; json: string }[] = [];
  const sections = text.split(/^(?=#{1,2} )/m);
  for (const section of sections) {
    const stage = /^#{1,2} .*`(s\d_[a-z]+)`/.exec(section)?.[1] as AgentStage | undefined;
    if (!stage || !(stage in stageSchemas)) continue;
    const after = section.slice(section.indexOf("**EXAMPLE**"));
    if (!section.includes("**EXAMPLE**")) continue;
    const block = /```json\n([\s\S]*?)\n```/.exec(after)?.[1] ?? /`(\{[^`]+\})`/.exec(after)?.[1];
    if (block) out.push({ stage, json: block });
  }
  return out;
}

describe("Cowork skills", () => {
  it("has the three skills with valid frontmatter", () => {
    expect(skills.map((s) => s.name).sort()).toEqual(["johnnybits-blog-qa", "johnnybits-blog-research", "johnnybits-blog-writing"]);
    for (const s of skills) {
      const fm = /^---\nname: ([a-z0-9-]+)\ndescription: (.+)\n---\n/.exec(s.text);
      expect(fm?.[1]).toBe(s.name);
      expect(fm![2].length).toBeLessThan(1024);
      expect(s.name).not.toMatch(/claude|anthropic/);
    }
  });

  it("every stage example passes the stage schema save_stage_output uses", () => {
    const examples = skills.flatMap((s) => stageExamples(s.text).map((e) => ({ ...e, skill: s.name })));
    expect(examples.map((e) => e.stage).sort()).toEqual(["s1_keyword", "s3_brief", "s4_research", "s5_outline", "s7_seo", "s8_links", "s9_qa"]);
    for (const e of examples) {
      const result = stageSchemas[e.stage].safeParse(JSON.parse(e.json));
      expect(result.success, `${e.skill} ${e.stage}: ${result.success ? "" : JSON.stringify(result.error.issues)}`).toBe(true);
    }
  });

  it("matches the brand context the server returns (author, CTA, banned-claim policy)", () => {
    const brand = getBrandContext();
    const research = skills.find((s) => s.name === "johnnybits-blog-research")!.text;
    expect(research).toContain(`\`${brand.defaultAuthorSlug}\``);
    const cta = brand.ctas.find((c) => c.url === "/contact-us")!;
    expect(research).toContain(cta.label);
    expect(brand.approvedClaims).toEqual([]); // the writing skill says "currently none"; update it if this changes
  });
});
