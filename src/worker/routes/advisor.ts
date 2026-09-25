import { Hono } from "hono";
import { Env } from "../types";
import { formatApiResponse } from "../schemas";
import { DecisionSimulationResult } from "../../lib/finance/engine";

export const advisorRoute = new Hono<{ Bindings: Env }>();

advisorRoute.post("/explain", async (c) => {
  try {
    const body = await c.req.json<{ simulation: DecisionSimulationResult }>();
    const sim = body.simulation;

    if (!sim || !sim.verdict || !sim.impactSummary) {
      return c.json({ error: "Dữ liệu simulation không hợp lệ." }, 400);
    }

    // 1. Build compact context (< 120 tokens)
    const compactContext = {
      decision: sim.scenarioTitle,
      cost: sim.costAmount,
      method: sim.paymentMethod,
      monthlyAddon: sim.monthlyPaymentAddon,
      emergencyBefore: sim.before.emergencyFundMonths,
      emergencyAfter: sim.after.emergencyFundMonths,
      dtiBefore: sim.before.dtiRatio,
      dtiAfter: sim.after.dtiRatio,
      surplusAfter: sim.after.monthlySurplus,
      riskFlags: sim.riskFlags,
      verdictLevel: sim.verdict.level,
    };

    let aiAdvice = "";

    // 2. Try calling Gemini if GEMINI_API_KEY is available in Worker Env
    const geminiKey = c.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (geminiKey) {
      try {
        const prompt = `Bạn là Vẹt Vàng - Cố vấn tài chính đường phố, thẳng thắn, thực tế, hơi mỉa mai nhưng rất sâu sắc và bảo vệ người dùng khỏi bẫy nợ.
Phân tích quyết định tài chính sau (được tính bằng Engine toán định lượng):
Ngữ cảnh: ${JSON.stringify(compactContext)}

Yêu cầu:
1. Đưa ra 1 nhận xét 2-3 câu bằng giọng Vẹt Vàng: bóc trần đúng điểm nghẽn rủi ro (quỹ khẩn cấp, dòng tiền hoặc DTI).
2. Đánh giá tính khả thi và giải thích tại sao kịch bản thay thế (${sim.smartAlternative.title}) lại thông minh hơn.
3. Tuyệt đối không bịa thêm con số mới, chỉ dùng các con số đã có trong ngữ cảnh.`;

        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 350,
              },
            }),
          }
        );

        if (resp.ok) {
          const json: any = await resp.json();
          const candidate = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidate) {
            aiAdvice = candidate.trim();
          }
        }
      } catch (e) {
        console.warn("Gemini API call failed, falling back to rule-based advisor:", e);
      }
    }

    // 3. Fallback to deterministic Vẹt Vàng persona advice if AI not available or failed
    if (!aiAdvice) {
      if (sim.verdict.level === "DANGEROUS" || sim.verdict.level === "NOT_RECOMMENDED") {
        aiAdvice = `🦜 Vẹt Vàng phán: Này bạn ơi, quỹ khẩn cấp từ ${sim.before.emergencyFundMonths} tháng tụt dốc không phanh xuống còn ${sim.after.emergencyFundMonths} tháng, dòng tiền tự do mỗi tháng teo tóp chỉ còn ${sim.after.monthlySurplus.toLocaleString("vi-VN")} đ. Mua sướng được 3 hôm mà ôm nợ cả năm thì không đáng một chút nào! Thay vì trả góp hay rút sạch két, hãy nghe tôi: kích hoạt kế hoạch 60 ngày hoặc chọn bản Like-New tiết kiệm ngay một khoản tiền mặt bảo vệ tương lai.`;
      } else {
        aiAdvice = `🦜 Vẹt Vàng phán: Tài chính của bạn đang ở trạng thái khá vững vàng. DTI sau quyết định chỉ ở mức ${sim.after.dtiRatio}%, quỹ khẩn cấp vẫn giữ được ${sim.after.emergencyFundMonths} tháng. Tuy nhiên nhớ trích riêng khoản tiền này và không vung tay quá trán ở các hũ chi tiêu khác trong 3 tháng tới nhé!`;
      }
    }

    const responseData = {
      decision: sim.scenarioTitle,
      verdictTitle: sim.verdict.title,
      verdictLevel: sim.verdict.level,
      vetVangAdvice: aiAdvice,
      smartAlternative: sim.smartAlternative,
      actionChecklist: sim.actionChecklist,
    };

    return c.json(formatApiResponse(responseData, "vietfi-ai-advisor"));
  } catch (error: any) {
    return c.json({ error: error?.message || "Lỗi xử lý tư vấn tài chính." }, 500);
  }
});
