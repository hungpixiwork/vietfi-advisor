import { test, expect, type Page } from "@playwright/test";

/**
 * Vẹt Vàng companion — real browser journeys at the target viewports.
 *  Journey 1/2: user with a budget logs spending by chat → confirm → saved → budget page reflects it.
 *  Journey 7:   AI tier unavailable → deterministic features still work.
 */

const VIEWPORTS = [
  { name: "phone-320", width: 320, height: 640 },
  { name: "phone-375", width: 375, height: 812 },
  { name: "phone-430", width: 430, height: 932 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "laptop-14", width: 1366, height: 768 },
  { name: "laptop-15-6-125pct", width: 1536, height: 864 },
];

async function seed(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.clear();
    localStorage.setItem(
      "vietfi_onboarding",
      JSON.stringify({ completed: true, income: 10_000_000, netWorth: 0, hasDebt: false, riskProfile: "", setupAt: new Date().toISOString() }),
    );
    localStorage.setItem("vietfi_income", "10000000");
    localStorage.setItem(
      "vietfi_pots",
      JSON.stringify([
        { id: "food", name: "Ăn uống", iconKey: "Coffee", allocated: 3_000_000, color: "#FF6B35" },
        { id: "move", name: "Đi lại", iconKey: "Car", allocated: 800_000, color: "#00E5FF" },
      ]),
    );
  });
}

async function noHorizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const panel = document.querySelector('[data-testid="companion-panel"]') as HTMLElement | null;
    const offenders = panel
      ? Array.from(panel.querySelectorAll<HTMLElement>("*")).filter((el) => {
          // Children of an intentional horizontal scroller (quick-prompt chips) may extend past the edge.
          for (let a = el.parentElement; a && a !== panel; a = a.parentElement) {
            if (["auto", "scroll"].includes(getComputedStyle(a).overflowX)) return false;
          }
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1);
        }).map((el) => el.getAttribute("data-testid") || el.tagName)
      : [];
    return { doc: document.documentElement.scrollWidth <= window.innerWidth + 1, offenders };
  });
}

for (const vp of VIEWPORTS) {
  test(`companion journey @ ${vp.name}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await seed(page);
    await page.goto("/dashboard/cashflow?tab=budget");

    await page.getByTestId("companion-launcher").click();
    const panel = page.getByTestId("companion-panel");
    await expect(panel).toBeVisible();

    // Panel fits the screen
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height + 1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1);

    await page.getByTestId("companion-input").fill("Sáng nay ăn phở 35k, chiều uống cà phê 25k");
    await page.keyboard.press("Enter");
    const card = page.getByTestId("proposal-card").last();
    await expect(card.getByTestId("draft-row")).toHaveCount(2);

    const overflow = await noHorizontalOverflow(page);
    expect(overflow.offenders).toEqual([]);
    expect(overflow.doc).toBe(true);

    // Buttons are reachable and big enough to tap
    const save = card.getByRole("button", { name: /Lưu/ });
    await save.scrollIntoViewIfNeeded();
    const saveBox = await save.boundingBox();
    expect(saveBox!.height).toBeGreaterThanOrEqual(40);
    await save.click();

    await expect(card.getByRole("status")).toContainText("Đã lưu 2 giao dịch (chi 60.000đ)");
    await expect(card.getByRole("status")).toContainText("Ngân sách tháng còn 3.740.000đ");

    // Storage holds exactly what the card claimed
    const stored = await page.evaluate(() => ({
      ledger: JSON.parse(localStorage.getItem("vietfi_ledger") || "[]"),
      expenses: JSON.parse(localStorage.getItem("vietfi_expenses") || "[]"),
    }));
    expect(stored.ledger.map((e: { amount: number }) => e.amount)).toEqual([35_000, 25_000]);
    expect(stored.expenses.map((e: { potId: string }) => e.potId)).toEqual(["food", "food"]);

    // Budget question answered from the same data, no AI needed
    await page.getByTestId("companion-input").fill("Ngân sách còn bao nhiêu?");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("companion-messages")).toContainText("Ngân sách tháng còn 3.740.000đ / 3.800.000đ");

    // Close the panel: the budget page already shows the new spending (live refresh, no reload)
    await page.getByRole("button", { name: "Đóng" }).click();
    const main = page.locator("body");
    await expect(main).toContainText("Thực chi60K");
    await expect(main).toContainText("Ăn phở-35K");
    await expect(main).toContainText("Ăn uống60K/3.0tr");

    if (vp.name === "phone-375") {
      await page.getByTestId("companion-launcher").click();
      await page.screenshot({ path: "test-results/companion-phone-375.png", animations: "disabled", timeout: 45_000 });
    }
  });
}

test("AI tier unavailable: unknown questions degrade honestly, logging still works", async ({ page }) => {
  await seed(page);
  await page.route("**/api/companion/interpret", (route) => route.fulfill({ status: 503, body: "down" }));
  await page.goto("/dashboard");
  await page.getByTestId("companion-launcher").click();
  await page.getByTestId("companion-input").fill("có nên mua iphone 15 triệu không");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("companion-messages")).toContainText("AI tạm thời không phản hồi");
  await page.getByTestId("companion-input").fill("grab 40k");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("proposal-card").last().getByTestId("draft-row")).toHaveCount(1);
});
