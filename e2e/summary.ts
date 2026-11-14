import fs from "node:fs";
import path from "node:path";

const summaryDir = path.join(process.cwd(), "e2e", "summaries");

export async function verify(
  fileName: string,
  title: string,
  run: (check: (label: string) => void) => Promise<void>
) {
  const checks: string[] = [];
  let error: string | undefined;

  try {
    await run((label) => {
      checks.push(label);
    });
  } catch (caught) {
    const raw = caught instanceof Error ? caught.message : String(caught);
    error = raw.replace(/\u001b\[[0-9;]*m/g, "");
    throw caught;
  } finally {
    const status = error ? "failed" : "passed";
    const body = [
      `# ${title}`,
      "",
      `- Status: ${status}`,
      `- Ran: ${new Date().toISOString()}`,
      `- Base URL: ${process.env.PLAYWRIGHT_BASE_URL ?? "http://customer.bizloandev.local"}`,
      "",
      "## Checks",
      ...(checks.length > 0 ? checks.map((check) => `- ${check}`) : ["- No checks were recorded."]),
      "",
      error ? `## Failure\n\n\`\`\`\n${error}\n\`\`\`\n` : "## Result\n\nAll checks passed.\n",
    ].join("\n");

    fs.mkdirSync(summaryDir, { recursive: true });
    fs.writeFileSync(path.join(summaryDir, `${fileName}.md`), body);
  }
}
