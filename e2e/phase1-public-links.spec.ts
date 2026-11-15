import { expect, test } from "@playwright/test";

/**
 * Phase 1: every link on the public customer pages.
 *
 *   PLAYWRIGHT_BASE_URL=http://myprofile.loantris-dev-linux.com:3001 \
 *     npx playwright test e2e/phase1-public-links.spec.ts
 *
 * Internal links (same origin) must answer with a status below 400 and any
 * #fragment must match an element id on the page. External links are checked
 * for a reachable response and reported; they must point at an expected host.
 */

const PUBLIC_PAGES = ["/", "/auth/login/", "/auth/register/", "/auth/forgot-password/", "/privacy/", "/terms/"];

const EXPECTED_EXTERNAL_HOSTS = new Set([
  "myprofile.loantris.com",
  "partners.loantris.com",
  "myprofile.loantris-dev-linux.com",
  "partners.loantris-dev-linux.com",
  "support@loantris.com",
]);

type LinkRecord = { page: string; text: string; href: string; status: string };

test("every link on public customer pages resolves", async ({ page, request, baseURL }) => {
  test.setTimeout(300_000);
  const origin = new URL(baseURL!).origin;
  // The landing host for this environment: the customer host without its "myprofile." prefix.
  const landingHost = new URL(baseURL!).hostname.replace(/^myprofile\./, "");
  const records: LinkRecord[] = [];
  const failures: string[] = [];

  for (const path of PUBLIC_PAGES) {
    const resp = await page.goto(path, { waitUntil: "networkidle" });
    expect(resp?.status(), `page ${path} loads`).toBeLessThan(400);

    const links = await page.$$eval("a[href]", (as) =>
      as.map((a) => ({ text: (a.textContent ?? "").trim().slice(0, 40), href: a.getAttribute("href") ?? "" })),
    );

    for (const link of links) {
      const { text, href } = link;
      if (href.startsWith("mailto:")) {
        const addr = href.slice("mailto:".length);
        if (!EXPECTED_EXTERNAL_HOSTS.has(addr)) failures.push(`${path}: unexpected mailto ${addr}`);
        records.push({ page: path, text, href, status: "mailto" });
        continue;
      }

      const url = new URL(href, page.url());

      if (url.origin === origin) {
        if (url.hash) {
          // The anchor target must exist on the destination page.
          const probe = await page.context().newPage();
          try {
            const res = await probe.goto(url.pathname + url.search, { waitUntil: "networkidle" });
            const found = await probe.locator(`[id="${url.hash.slice(1)}"]`).count();
            const ok = (res?.status() ?? 500) < 400 && found > 0;
            if (!ok) failures.push(`${path}: anchor ${href} missing (status ${res?.status()}, id found: ${found > 0})`);
            records.push({ page: path, text, href, status: ok ? "anchor ok" : "anchor missing" });
          } finally {
            await probe.close();
          }
          continue;
        }
        const res = await request.get(url.pathname + url.search, { maxRedirects: 5 });
        records.push({ page: path, text, href, status: String(res.status()) });
        if (res.status() >= 400) failures.push(`${path}: ${text} -> ${href} returned ${res.status()}`);
        continue;
      }

      // Landing host (customer host without the "myprofile." prefix): section anchors must exist there.
      if (url.hash && url.hostname === landingHost) {
        const probe = await page.context().newPage();
        try {
          const res = await probe.goto(url.toString(), { waitUntil: "networkidle" });
          const found = await probe.locator(`[id="${url.hash.slice(1)}"]`).count();
          const ok = (res?.status() ?? 500) < 400 && found > 0;
          if (!ok) failures.push(`${path}: anchor ${url.toString()} missing (status ${res?.status()}, id found: ${found > 0})`);
          records.push({ page: path, text, href: url.toString(), status: ok ? "anchor ok" : "anchor missing" });
        } finally {
          await probe.close();
        }
        continue;
      }

      // External link: must be an expected host; reachability is recorded only.
      if (!EXPECTED_EXTERNAL_HOSTS.has(url.hostname)) {
        failures.push(`${path}: ${text} -> ${href} points to unexpected host ${url.hostname}`);
      }
      let status = "unreachable from test runner";
      try {
        const res = await request.get(url.toString(), { timeout: 15_000, maxRedirects: 5 });
        status = String(res.status());
      } catch {
        // recorded above as unreachable
      }
      records.push({ page: path, text, href, status });
    }
  }

  console.log("\nPhase 1 link report:");
  for (const r of records) console.log(`  [${r.status}] ${r.page}  "${r.text}" -> ${r.href}`);
  console.log(`  total links: ${records.length}, failures: ${failures.length}`);

  expect(failures, failures.join("\n")).toEqual([]);
});
