import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CompanionLauncher from "./CompanionLauncher";
import { EXPENSES_KEY, LEDGER_KEY } from "@/lib/stores/transaction-store";

vi.mock("@/lib/supabase/transaction-sync", () => ({ installTransactionSync: vi.fn(async () => false) }));

const ledger = () => JSON.parse(localStorage.getItem(LEDGER_KEY) ?? "[]") as Array<{ amount: number; category: string; note: string; type: string }>;

async function openAndSend(text: string) {
  const user = userEvent.setup();
  if (screen.queryByTestId("companion-launcher")) await user.click(screen.getByTestId("companion-launcher"));
  await user.type(screen.getByTestId("companion-input"), `${text}{Enter}`);
  return user;
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("vietfi_income", "10000000");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Vẹt Vàng companion — Journey 2: chat → confirm → saved → budget updated", () => {
  it("prepares two drafts, saves nothing until confirmed, then saves exactly two and updates the budget", async () => {
    render(<CompanionLauncher />);
    const user = await openAndSend("Sáng nay ăn phở 35k, chiều uống cà phê 25k");

    expect(await screen.findByText(/Bạn vừa chi 60\.000đ/)).toBeInTheDocument();
    const card = screen.getByTestId("proposal-card");
    expect(within(card).getAllByTestId("draft-row")).toHaveLength(2);
    expect(ledger()).toEqual([]); // nothing written before confirmation

    await user.click(within(card).getByRole("button", { name: /Lưu/ }));

    expect(await within(card).findByRole("status")).toHaveTextContent("Đã lưu 2 giao dịch (chi 60.000đ)");
    expect(within(card).getByRole("status")).toHaveTextContent("Ngân sách tháng còn 9.940.000đ");
    expect(within(card).getByRole("status")).toHaveTextContent("chưa đăng nhập");
    expect(ledger().map((e) => [e.amount, e.category])).toEqual([[35_000, "Ăn uống"], [25_000, "Ăn uống"]]);
    expect(JSON.parse(localStorage.getItem(EXPENSES_KEY) ?? "[]")).toHaveLength(2);
    expect(screen.getByTestId("companion-status")).toHaveTextContent("Hôm nay chi 60k · Ngân sách còn 9,94tr");

    // Card is closed: clicking again is impossible, no duplicate writes
    expect(within(card).queryByRole("button", { name: /Lưu/ })).toBeNull();
    expect(ledger()).toHaveLength(2);
  });

  it("lets the user fix the amount and category before saving", async () => {
    render(<CompanionLauncher />);
    const user = await openAndSend("phở 35");
    const card = await screen.findByTestId("proposal-card");
    expect(card).toHaveTextContent('Hiểu "35" là 35.000đ');

    const amount = within(card).getByLabelText("Số tiền");
    await user.clear(amount);
    await user.type(amount, "40k");
    await user.selectOptions(within(card).getByLabelText("Danh mục"), "Khác");
    await user.click(within(card).getByRole("button", { name: /Lưu/ }));

    await within(card).findByRole("status");
    expect(ledger()).toEqual([expect.objectContaining({ amount: 40_000, category: "Khác" })]);
  });

  it("cancel writes nothing", async () => {
    render(<CompanionLauncher />);
    const user = await openAndSend("grab 45k");
    const card = await screen.findByTestId("proposal-card");
    await user.click(within(card).getByRole("button", { name: /Hủy/ }));
    expect(card).toHaveAttribute("data-state", "cancelled");
    expect(ledger()).toEqual([]);
  });

  it("asks for a missing amount, then completes the transaction from a bare reply", async () => {
    render(<CompanionLauncher />);
    await openAndSend("ăn phở");
    expect(await screen.findByText(/hết bao nhiêu tiền/)).toBeInTheDocument();
    await openAndSend("35k");
    const card = await screen.findByTestId("proposal-card");
    expect(within(card).getByLabelText("Mô tả")).toHaveValue("Ăn phở");
  });

  it("answers budget and today questions from stored data, with 0 network calls", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    localStorage.setItem(
      LEDGER_KEY,
      JSON.stringify([{ id: "1", amount: 100_000, type: "expense", category: "Ăn uống", note: "Lẩu", date: new Date().toLocaleDateString("sv-SE"), createdAt: new Date().toISOString() }]),
    );
    render(<CompanionLauncher />);
    await openAndSend("Hôm nay tiêu bao nhiêu?");
    expect(await screen.findByText(/Hôm nay bạn đã chi 100\.000đ/)).toBeInTheDocument();
    await openAndSend("Ngân sách còn bao nhiêu?");
    expect(await screen.findByText(/Ngân sách tháng còn 9\.900\.000đ/)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("undo proposes deleting the last transaction and removes it after confirmation", async () => {
    render(<CompanionLauncher />);
    const user = await openAndSend("trà sữa 50k");
    await user.click(within(await screen.findByTestId("proposal-card")).getByRole("button", { name: /Lưu/ }));
    await openAndSend("xóa khoản vừa ghi");
    const cards = await screen.findAllByTestId("proposal-card");
    const undo = cards[cards.length - 1];
    expect(undo).toHaveTextContent("50.000đ");
    await user.click(within(undo).getByRole("button", { name: /Xóa/ }));
    expect(await within(undo).findByRole("status")).toHaveTextContent("Đã xóa");
    expect(ledger()).toEqual([]);
  });

  it("reports a storage failure honestly and does not claim the save", async () => {
    render(<CompanionLauncher />);
    const user = await openAndSend("cơm 40k");
    const card = await screen.findByTestId("proposal-card");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    await user.click(within(card).getByRole("button", { name: /Lưu/ }));
    const status = await within(card).findByRole("status");
    expect(status).toHaveTextContent("Chưa lưu được");
    expect(status).not.toHaveTextContent("Đã lưu");
    expect(card).toHaveAttribute("data-state", "error");
  });

  it("falls back honestly when the AI tier is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "unavailable", reason: "x" }), { status: 200 })));
    render(<CompanionLauncher />);
    await openAndSend("dạo này tiền bạc của tui ổn không");
    expect(await screen.findByText(/AI tạm thời không phản hồi/)).toBeInTheDocument();
    expect(screen.queryByTestId("proposal-card")).toBeNull();
  });

  it("uses the AI tier for unusual phrasing and still requires confirmation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            status: "ok",
            intent: "log",
            transactions: [{ type: "expense", amount: 45_000, category: "Ăn uống", note: "Bún chả", dayOffset: 0, amountVerified: false }],
          }),
        ),
      ),
    );
    render(<CompanionLauncher />);
    await openAndSend("trưa làm tô bún chả bốn lăm");
    const card = await screen.findByTestId("proposal-card");
    expect(card).toHaveTextContent("Số tiền do AI suy ra");
    expect(ledger()).toEqual([]);
  });

  it("works offline for deterministic messages and says so for others", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const onLine = vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    render(<CompanionLauncher />);
    await openAndSend("xăng 60k");
    expect(await screen.findByTestId("proposal-card")).toBeInTheDocument();
    await openAndSend("kể chuyện cười đi");
    expect(await screen.findByText(/Đang offline/)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    onLine.mockRestore();
  });

  it("persists chat history across remounts (returning the next day)", async () => {
    const { unmount } = render(<CompanionLauncher />);
    await openAndSend("bánh mì 20k");
    await screen.findByTestId("proposal-card");
    unmount();
    render(<CompanionLauncher />);
    await act(async () => {
      await userEvent.setup().click(screen.getByTestId("companion-launcher"));
    });
    await waitFor(() => expect(screen.getByText("bánh mì 20k")).toBeInTheDocument());
  });
});
