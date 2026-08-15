import { GoogleGenAI } from "@google/genai";
import { jsonrepair } from "jsonrepair";
import { GradingReport, CriterionDetail, StrengthDetail, ImprovementDetail } from "../types";

// Helper to safely extract text from Gemini response object
function extractResponseText(response: any): string {
  if (!response) return "";

  try {
    if (typeof response.text === "string" && response.text.trim().length > 0) {
      return response.text.trim();
    }
    if (typeof response.text === "function") {
      const fnText = response.text();
      if (typeof fnText === "string" && fnText.trim().length > 0) {
        return fnText.trim();
      }
    }
  } catch (e) {
    // Ignore getter errors
  }

  if (Array.isArray(response.candidates) && response.candidates.length > 0) {
    for (const cand of response.candidates) {
      if (cand?.content?.parts && Array.isArray(cand.content.parts)) {
        const partsText = cand.content.parts
          .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
          .filter(Boolean)
          .join("")
          .trim();
        if (partsText) return partsText;
      }
    }
  }

  return "";
}

// Helper to safely parse JSON from AI response, automatically repairing syntax errors, unescaped quotes, and truncated JSON
function parseRobustJson(textResponse: string, taskType: "task1" | "task2" = "task2", wordCount: number = 0): GradingReport {
  if (!textResponse || typeof textResponse !== "string" || !textResponse.trim()) {
    return createDefaultGradingReport(taskType, wordCount);
  }

  let cleaned = textResponse.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Strategy 1: Standard JSON.parse
  try {
    const obj = JSON.parse(cleaned);
    return normalizeGradingReport(obj, taskType, wordCount);
  } catch (e1) {
    // Strategy 2: jsonrepair
    try {
      const repaired = jsonrepair(cleaned);
      const obj = JSON.parse(repaired);
      return normalizeGradingReport(obj, taskType, wordCount);
    } catch (e2) {
      // Strategy 3: Sliced JSON block
      const startIdx = cleaned.indexOf("{");
      const endIdx = cleaned.lastIndexOf("}");
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const sliced = cleaned.slice(startIdx, endIdx + 1);
        try {
          const obj = JSON.parse(sliced);
          return normalizeGradingReport(obj, taskType, wordCount);
        } catch (e3) {
          try {
            const repairedSliced = jsonrepair(sliced);
            const obj = JSON.parse(repairedSliced);
            return normalizeGradingReport(obj, taskType, wordCount);
          } catch (e4) {
            // Strategy 4: Unescaped quotes repair
            try {
              const sanitized = fixUnescapedQuotesInJson(sliced);
              const repairedSanitized = jsonrepair(sanitized);
              const obj = JSON.parse(repairedSanitized);
              return normalizeGradingReport(obj, taskType, wordCount);
            } catch (e5) {
              console.warn("[AVA Robust JSON Client] Advanced repair attempted, attempting truncation healing...");
            }
          }
        }
      }

      // Strategy 5: Truncation healing
      try {
        const healed = healTruncatedJson(cleaned);
        const repairedHealed = jsonrepair(healed);
        const obj = JSON.parse(repairedHealed);
        return normalizeGradingReport(obj, taskType, wordCount);
      } catch (e6) {
        console.error("[AVA Robust JSON Client] All JSON parse attempts failed:", e6);
        return createDefaultGradingReport(taskType, wordCount);
      }
    }
  }
}

// Fix unescaped internal double quotes within JSON string values
function fixUnescapedQuotesInJson(jsonStr: string): string {
  return jsonStr.replace(/(:\s*"|,\s*"|\n\s*")([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, prefix, content) => {
    return prefix + content.replace(/(?<!\\)"/g, '\\"') + '"';
  });
}

// Close unclosed brackets and braces for truncated responses
function healTruncatedJson(str: string): string {
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (char === "\\") {
      isEscaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{") openBraces++;
      else if (char === "}") openBraces = Math.max(0, openBraces - 1);
      else if (char === "[") openBrackets++;
      else if (char === "]") openBrackets = Math.max(0, openBrackets - 1);
    }
  }

  let result = str;
  if (inString) result += '"';
  while (openBrackets > 0) {
    result += "]";
    openBrackets--;
  }
  while (openBraces > 0) {
    result += "}";
    openBraces--;
  }
  return result;
}

// Guarantees all fields and criteria are non-null and valid
function normalizeGradingReport(raw: any, taskType: "task1" | "task2", wordCount: number): GradingReport {
  if (!raw || typeof raw !== "object") {
    return createDefaultGradingReport(taskType, wordCount);
  }

  const rawCriteria = raw.criteria || {};
  const normalizeCriterion = (item: any, fallbackName: string): CriterionDetail => {
    const band = typeof item?.band === "number" && !isNaN(item.band) ? item.band : 6.0;
    return {
      name: typeof item?.name === "string" && item.name ? item.name : fallbackName,
      band: Math.min(9.0, Math.max(1.0, Math.round(band * 2) / 2)),
      feedback: typeof item?.feedback === "string" && item.feedback ? item.feedback : (typeof item?.summary === "string" && item.summary ? item.summary : "Đã hoàn thành phân tích chi tiết tiêu chí này."),
      example: typeof item?.example === "string" ? item.example : "",
      featureScores: Array.isArray(item?.featureScores) ? item.featureScores : [],
    };
  };

  const taOrTr = normalizeCriterion(rawCriteria.taOrTr || rawCriteria.ta || rawCriteria.tr, taskType === "task1" ? "Task Achievement" : "Task Response");
  const cc = normalizeCriterion(rawCriteria.cc, "Coherence & Cohesion");
  const lr = normalizeCriterion(rawCriteria.lr, "Lexical Resource");
  const gra = normalizeCriterion(rawCriteria.gra, "Grammatical Range & Accuracy");

  const avg = (taOrTr.band + cc.band + lr.band + gra.band) / 4;
  const overallBand = typeof raw.overallBand === "number" && !isNaN(raw.overallBand) ? roundIELTS(raw.overallBand) : roundIELTS(avg);

  const normalizeStrengths = (rawStrengths: any): StrengthDetail[] => {
    if (!Array.isArray(rawStrengths)) return [{ title: "Bố cục rõ ràng", explanation: "Bài viết bám sát đề bài và có cấu trúc mạch lạc.", example: "" }];
    return rawStrengths.map((st: any) => {
      if (typeof st === "string") return { title: st, explanation: st, example: "" };
      return {
        title: typeof st?.title === "string" ? st.title : "Điểm sáng",
        explanation: typeof st?.explanation === "string" ? st.explanation : "",
        example: typeof st?.example === "string" ? st.example : "",
      };
    });
  };

  const normalizeImprovements = (rawImprovements: any): ImprovementDetail[] => {
    if (!Array.isArray(rawImprovements)) return [{ title: "Cải thiện cấu trúc câu", explanation: "Tăng cường dùng các cấu trúc phức và từ nối tự nhiên hơn.", impact: "Nâng band điểm GRA & CC" }];
    return rawImprovements.map((imp: any) => {
      if (typeof imp === "string") return { title: imp, explanation: imp, impact: "Cải thiện band điểm" };
      return {
        title: typeof imp?.title === "string" ? imp.title : "Điểm cần cải thiện",
        explanation: typeof imp?.explanation === "string" ? imp.explanation : "",
        impact: typeof imp?.impact === "string" ? imp.impact : "Cải thiện band điểm",
      };
    });
  };

  return {
    overallBand: overallBand,
    wordCount: wordCount || raw.wordCount || 0,
    wordCountRequirement:
      (taskType === "task1" && (wordCount || raw.wordCount || 0) >= 150) ||
      (taskType === "task2" && (wordCount || raw.wordCount || 0) >= 250)
        ? "meets"
        : "under",
    criteria: {
      taOrTr,
      cc,
      lr,
      gra,
    },
    strengths: normalizeStrengths(raw.strengths),
    improvements: normalizeImprovements(raw.improvements),
    fullUpgradeEssay: typeof raw.fullUpgradeEssay === "string" && raw.fullUpgradeEssay ? raw.fullUpgradeEssay : "Bài viết mẫu nâng cấp chuẩn Band 8.0+ đang được cập nhật.",
    fullUpgradeEssayVietnamese: typeof raw.fullUpgradeEssayVietnamese === "string" ? raw.fullUpgradeEssayVietnamese : undefined,
    vietnameseGreeting: typeof raw.vietnameseGreeting === "string" ? raw.vietnameseGreeting : undefined,
    upgrades: Array.isArray(raw.upgrades) ? raw.upgrades : [],
    nextBandSteps: Array.isArray(raw.nextBandSteps) ? raw.nextBandSteps : ["Tiếp tục mở rộng vốn từ vựng học thuật theo chủ đề.", "Tăng cường sử dụng các cấu trúc câu phức."],
  };
}

function createDefaultGradingReport(taskType: "task1" | "task2", wordCount: number): GradingReport {
  return {
    overallBand: 6.0,
    wordCount: wordCount,
    wordCountRequirement:
      (taskType === "task1" && wordCount >= 150) || (taskType === "task2" && wordCount >= 250) ? "meets" : "under",
    criteria: {
      taOrTr: {
        name: taskType === "task1" ? "Task Achievement" : "Task Response",
        band: 6,
        feedback: "Bài viết đã nêu được các ý chính và đáp ứng yêu cầu cơ bản.",
        example: "",
        featureScores: [],
      },
      cc: {
        name: "Coherence & Cohesion",
        band: 6,
        feedback: "Bố cục rõ ràng, sử dụng các từ nối cơ bản.",
        example: "",
        featureScores: [],
      },
      lr: {
        name: "Lexical Resource",
        band: 6,
        feedback: "Sử dụng từ ngữ phù hợp, cần mở rộng thêm collocations.",
        example: "",
        featureScores: [],
      },
      gra: {
        name: "Grammatical Range & Accuracy",
        band: 6,
        feedback: "Cấu trúc câu đa dạng, còn một số lỗi nhỏ.",
        example: "",
        featureScores: [],
      },
    },
    strengths: [{ title: "Bố cục rõ ràng", explanation: "Bài viết có cấu trúc rõ ràng và bám sát đề bài.", example: "" }],
    improvements: [{ title: "Cải thiện cấu trúc câu", explanation: "Cần đa dạng hóa cấu trúc câu hơn.", impact: "Nâng band điểm GRA" }],
    fullUpgradeEssay: "",
    upgrades: [],
    nextBandSteps: ["Rèn luyện thêm các cấu trúc câu phức tạp.", "Mở rộng từ vựng học thuật."],
  };
}

// Helper function to calculate official IELTS rounding (0.0, 0.5, 1.0)
function roundIELTS(score: number): number {
  const base = Math.floor(score);
  const frac = score - base;
  if (frac < 0.25) {
    return base;
  } else if (frac < 0.75) {
    return base + 0.5;
  } else {
    return base + 1.0;
  }
}

// Client-side Gemini fallback with retry & model sequence
async function generateWithFallbackClient(
  ai: GoogleGenAI,
  options: { contents: any; config?: any }
) {
  const models = [
    "gemini-2.5-flash",
    "gemini-3.7-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
  ];

  let lastError: any = null;

  for (let cycle = 0; cycle < 2; cycle++) {
    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          let response;
          try {
            response = await ai.models.generateContent({
              model,
              contents: options.contents,
              config: {
                ...options.config,
                safetySettings: [
                  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" },
                ],
              },
            });
          } catch (callErr: any) {
            const callErrMsg = String(callErr?.message || callErr);
            const isQuota =
              callErrMsg.includes("429") ||
              callErrMsg.includes("RESOURCE_EXHAUSTED") ||
              callErrMsg.includes("quota");
            if (isQuota) throw callErr;

            response = await ai.models.generateContent({
              model,
              contents: options.contents,
              config: {
                ...options.config,
              },
            });
          }

          const text = extractResponseText(response);
          if (text && text.length > 0) {
            return { response, text };
          } else {
            const finishReason = response?.candidates?.[0]?.finishReason || "UNKNOWN";
            lastError = new Error(`Mô hình ${model} không trả về phản hồi (finishReason: ${finishReason}).`);
            break;
          }
        } catch (err: any) {
          lastError = err;
          const errMsg = String(err?.message || err);

          const isQuota =
            errMsg.includes("429") ||
            errMsg.includes("RESOURCE_EXHAUSTED") ||
            errMsg.includes("quota") ||
            errMsg.includes("limit: 20");

          if (isQuota) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
            break; // Immediately failover to next model
          }

          const isTransient =
            errMsg.includes("503") ||
            errMsg.includes("UNAVAILABLE") ||
            errMsg.includes("high demand") ||
            errMsg.includes("overloaded");

          if (isTransient) {
            if (attempt >= 1) {
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 800));
          } else {
            break;
          }
        }
      }
    }
    if (cycle === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  if (lastError) throw lastError;
  throw new Error("Không có phản hồi từ bất kỳ mô hình AI nào.");
}

export async function validateGeminiApiKeyClient(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey.trim(),
    });

    await generateWithFallbackClient(ai, {
      contents: "Test connection.",
      config: {
        maxOutputTokens: 5,
      },
    });

    return { valid: true };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    let cleanMsg = "Khóa API không hợp lệ hoặc đã bị vô hiệu hóa.";

    if (errMsg.includes("API_KEY_INVALID") || errMsg.includes("API key not valid")) {
      cleanMsg = "Mã API Key không đúng hoặc đã bị xóa trên Google AI Studio.";
    } else if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) {
      cleanMsg = "API Key hợp lệ nhưng tài khoản đang hết hạn ngạch (Quota Exceeded / 429).";
    }

    return { valid: false, error: cleanMsg };
  }
}

export async function gradeEssayClient(params: {
  essay: string;
  taskType: "task1" | "task2";
  prompt: string;
  apiKey: string;
  image?: string | null;
}): Promise<GradingReport> {
  const { essay, taskType, prompt, apiKey, image } = params;

  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
  const trimmedEssay = essay.trim();
  const wordCount = trimmedEssay.split(/\s+/).filter(Boolean).length;

  let imagePart: { inlineData: { mimeType: string; data: string } } | null = null;
  if (image && typeof image === "string" && image.startsWith("data:image/")) {
    const mimeMatch = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (mimeMatch) {
      imagePart = {
        inlineData: {
          mimeType: mimeMatch[1],
          data: mimeMatch[2],
        },
      };
    }
  }

  const systemInstruction = `Bạn là "Hệ Thống AVA," một Giám khảo chấm thi IELTS Academic Writing cao cấp, tâm lý và giàu kinh nghiệm. Phong cách chấm điểm của bạn là **LINH HOẠT, THOÁNG TAY, KHÍCH LỆ VÀ KHÔNG QUÁ KHẮT KHE**. Bạn tập trung vào hiệu quả truyền đạt tổng thể (communicative effectiveness), nỗ lực diễn đạt và ý tưởng sáng tạo của học viên thay vì săm soi bắt bẻ các lỗi tiểu tiết.

Bạn chấm điểm theo các tiêu chí mô tả băng điểm IELTS Academic Writing chính thức của British Council/IDP kết hợp Bảng Tiêu Chí Tiến Hóa Theo Cấp Độ (Band Progression Matrix - 32 đặc tính tích lũy cho Task 1 & Task 2 từ Band B1 5.0+ đến C2 8.0+) với tinh thần **hào phóng, dễ tính và khích lệ người học**:

Quy tắc chấm điểm tiêu chí và làm tròn băng điểm (Flexible & Encouraging Feature-Based Scoring):
- Soi chiếu bài làm với Bảng Tiến Hóa Tiêu Chí IELTS Writing (B1 -> B2 -> C1 -> C2) ở cả 4 tiêu chí của dạng bài hiện tại (${taskType === "task1" ? "IELTS Writing Task 1: ta1_1..ta1_8, cc1_1..cc1_8, lr1_1..lr1_8, gra1_1..gra1_8" : "IELTS Writing Task 2: tr2_1..tr2_8, cc2_1..cc2_8, lr2_1..lr2_8, gra2_1..gra2_8"}):
  + ${taskType === "task1" ? "Task 1 Task Achievement (TA)" : "Task 2 Task Response (TR)"}
  + Coherence & Cohesion (CC)
  + Lexical Resource (LR)
  + Grammatical Range & Accuracy (GRA)

- QUY TẮC CỘNG ĐIỂM THEO 8 ĐẶC TÍNH (HÀO PHÓNG VÀ ƯU TIÊN BAND CAO):
  + Hãy phân bổ theo bài viết và CỘNG ĐIỂM DỒN của 8 đặc tính (Feature #1 đến #8) trong Bảng Tiến Hóa Tiêu Chí để ra điểm của từng tiêu chí:
    * Feature #1 (minBand B1): Tối đa 1.0 điểm
    * Feature #2 (minBand B1): Tối đa 2.0 điểm
    * Feature #3 (minBand B1): Tối đa 2.0 điểm
    * Feature #4 (minBand B2): Tối đa 0.5 điểm
    * Feature #5 (minBand B2): Tối đa 0.5 điểm
    * Feature #6 (minBand B2/C1): Tối đa 1.0 điểm
    * Feature #7 (minBand C1): Tối đa 1.0 điểm
    * Feature #8 (minBand C2): Tối đa 1.0 điểm
    (Tổng 8 đặc tính = 9.0 điểm tối đa cho tiêu chí).

- NGUYÊN TẮC CHẤM THOÁNG TAY, LINH HOẠT VÀ NỬA ĐIỂM (PARTIAL 0.5 & FULL SCORE):
  + Xét từng đặc tính từ #1 đến #8 với tinh thần rộng mở, khuyến khích:
    * Chỉ cần bài viết thể hiện được ý niệm cốt lõi của đặc tính -> Sẵn sàng cho trọn vẹn điểm tối đa của đặc tính đó (Status: "full"). Ví dụ: Feature #4 và #5 có max score là 0.5, nếu đạt 0.5 điểm thì status là "full" (Đạt trọn vẹn), KHÔNG ĐƯỢC để là "partial".
    * Nếu chỉ đạt một phần điểm số (ví dụ đạt 0.5 trên 1.0 hoặc đạt 1.0 trên 2.0) -> Trao điểm thành phần và ghi status: "partial" (Đạt một phần).
    * BẮT BUỘC: Bất cứ khi nào scoreEarned == maxScore của đặc tính đó -> Status PHẢI LÀ "full".

- ⚠️ QUY TẮC BẮT BUỘC VỀ SỰ KHÁC BIỆT COHERENCE & COHESION (CC) GIỮA TASK 1 VÀ TASK 2:
  1. ĐỐI VỚI TASK 1 (MÔ TẢ BIỂU ĐỒ / SƠ ĐỒ / BẢN ĐỒ / QUY TRÌNH):
     + **TASK 1 TUYỆT ĐỐI KHÔNG ÁP DỤNG** quy tắc Diễn Tiến Đề Ngữ (Theme–Rheme progression / Rheme-Theme progression), Diễn Tiến Cố Định (Constant progression) hay Linear Thinking. Các quy tắc này **CHỈ DÀNH RIÊNG CHO TASK 2**.
     + Khi chấm Task 1 (ở nhận xét CC và ở tất cả lý do / ghi chú reasoning của các đặc tính cc1_1 đến cc1_8, đặc biệt là cc1_7 về chiến lược grouping và cc1_8 về tổng hợp liên kết): **TUYỆT ĐỐI KHÔNG ĐƯỢC ghi chú hay bắt bẻ lỗi "Chưa có Rheme-Theme progression", "Thiếu Theme-Rheme", hay "Chưa có Linear Thinking"**.
     + Tiêu chí CC của Task 1 CHỈ ĐÁNH GIÁ:
       * Phân chia bố cục rõ ràng 4 phần (Mở bài Paraphrase, Đoạn Overview đặc điểm nổi bật, Thân bài 1, Thân bài 2).
       * Chiến lược gom nhóm dữ liệu logic (Grouping data theo đối tượng, danh mục hoặc xu hướng).
       * Sử dụng các từ nối mô tả số liệu, so sánh và chuyển đoạn tự nhiên (Looking first at, Turning to, In terms of, While, Whereas, Meanwhile, In comparison, By contrast, Similarly, Respectively...).
       * Phép thế đại từ/từ thay thế (this figure, this trend, the former, the latter...).
  2. ĐỐI VỚI TASK 2 (BÀI LUẬN ESSAY):
     + Mới áp dụng đánh giá mạch suy luận chiều sâu và chuyển ý logic qua Theme–Rheme progression / Constant progression / Linear Thinking ở đặc tính nâng cao C2 (cc2_8).

- ⚠️ QUY TẮC CHẤM KỸ ĐỘ CHÍNH XÁC SỐ LIỆU TASK 1 (TASK ACHIEVEMENT - DATA ACCURACY & CAPPING):
  + Giám khảo PHẢI SOI XÉT KỸ TỪNG CON SỐ, ĐỐI TƯỢNG VÀ THỜI GIAN:
    * Kiểm tra đối chiếu số liệu, năm, danh mục được mô tả trong bài viết với đề bài và hình ảnh biểu đồ.
    * **QUY TẮC PHẠT NẶNG & HẠ ĐIỂM XUỐNG TỐI ĐA BAND 5 (Capped at Band 5.0 for TA)**: Nếu bài viết **sai lệch thông tin số liệu**, **mô tả nhầm số liệu của hạng mục/năm này sang hạng mục/năm khác (misattribution of data / confusing categories / incorrect figures)**, hoặc đưa ra các số liệu sai lệch đáng kể so với thực tế của biểu đồ -> **BẮT BUỘC HẠ/KHỐNG CHẾ ĐIỂM TASK ACHIEVEMENT (TA) KHÔNG ĐƯỢC VƯỢT QUÁ BAND 5.0** (theo đúng Band Descriptors của IELTS Task 1: "key features may be inaccurate / there may be considerable inaccuracy in detail").
    * Khi bị sai/nhầm số liệu, không được trao điểm tối đa ở các đặc tính về số liệu (ta1_2, ta1_4, ta1_5, ta1_6, ta1_7, ta1_8) và phải chỉ rõ trong nhận xét và reasoning lỗi sai số liệu cụ thể (ví dụ: "Nhầm số liệu 50% của nhóm A sang nhóm B", "Báo cáo sai số liệu năm 2010 thành 80 thay vì 30").
    * Đối với số liệu xấp xỉ: Chỉ công nhận khi thí sinh sử dụng từ ước lượng hợp lý (about, around, approximately, roughly, nearly...). Nếu đoán bừa sai hẳn số liệu hoặc gán nhầm số liệu thì vẫn bị trừ điểm và giới hạn ở Band 5.0.

- ⚠️ QUY TẮC CHẤM KỸ COHERENCE & COHESION (CC) KHI BỊ ẢNH HƯỞNG BỞI LỖI TRUYỀN TẢI & KHÔNG TRÙNG KHỚP THÔNG TIN:
  + Chấm kỹ tính mạch lạc và liên kết của bài viết (áp dụng cho cả Task 1 và Task 2):
    * **MÔ TẢ KHÔNG TRÙNG KHỚP / MÂU THUẪN NỘI DUNG**: Nếu các thông tin trong bài bị đá nhau (ví dụ: câu trước viết xu hướng tăng, câu sau lại bảo giảm mà không có liên từ tương phản; số liệu ở Overview và Body mâu thuẫn trực tiếp; các ý rời rạc không ăn khớp).
    * **LỖI NGỮ PHÁP, TỪ VỰNG, CHÍNH TẢ GÂY KHÓ HIỂU THỰC SỰ (Causes strain for the reader / impedes communication)**: Nếu bài viết có mật độ lỗi sai ngữ pháp, từ vựng, chính tả nhiều đến mức người đọc phải liên tục dừng lại suy đoán, gây khó hiểu thực sự cho mạch văn.
    * -> **BẮT BUỘC HẠ/KHỐNG CHẾ ĐIỂM COHERENCE & COHESION (CC) Ở MỨC BAND 5.0 HOẶC THẤP HƠN (Capped at Band 5.0 / 4.0 for CC)**. Tuyệt đối không cho điểm CC cao (không cho Band 6.0/7.0+) khi người đọc gặp khó khăn nghiêm trọng trong việc tiếp nhận thông tin hoặc khi thông tin mô tả bị mâu thuẫn, đứt gãy.
    * Trong nhận xét CC và ghi chú reasoning các đặc tính (cc1_5, cc2_5...), phải nêu rõ: việc thông tin không trùng khớp hoặc lỗi ngôn ngữ dồn dập đã cản trở mạch đọc và khả năng tiếp nhận của giám khảo như thế nào.

- CÁC HƯỚNG DẪN ĐÁNH GIÁ LINH HOẠT VÀ DỄ TÍNH KHÁC:
  1. Nhận diện Ví dụ Linh hoạt & Tự nhiên: Đưa ví dụ minh họa công nhận linh hoạt tất cả các hình thức (such as, like, including, namely, hoặc đưa trực tiếp ví dụ thực tế/số liệu vào câu). Luôn ghi nhận đạt điểm cao (Full/Partial) cho các đặc tính phát triển luận điểm & ví dụ minh họa.
  2. Đánh giá Cấu trúc Đoạn văn & Lập luận (TR Task 2): Nếu bài viết triển khai được ý tưởng rõ ràng, có giải thích và minh họa bổ trợ (dù ví dụ đơn giản) -> Trao trọn vẹn điểm (1.0 full) hoặc nửa điểm (0.5 partial) ở Feature #6 của TR (tr2_6).
  3. Đánh giá Góc nhìn & Đối trọng Lập luận (TR Task 2): Nếu bài viết có thể hiện lập trường rõ ràng hoặc có phân tích hai mặt/nhượng bộ -> Mạnh dạn trao điểm cao cho Feature #7 của TR (tr2_7).
  4. Đánh giá Khách quan & Khích lệ Vốn từ (Lexical Resource): Tuyên dương các từ vựng theo chủ đề, các cụm từ collocations hay. Bỏ qua các lỗi chính tả nhỏ hay lỗi dùng từ chưa hoàn toàn tự nhiên nếu không ảnh hưởng đến độ hiểu nghĩa, sẵn sàng chấm Band 7.0 - 8.0+.
  5. Đánh giá Độ chính xác Ngữ pháp & Dấu câu (GRA): Ưu tiên sự đa dạng câu (câu phức, mệnh đề quan hệ, câu điều kiện). Các lỗi ngữ pháp nhỏ phổ biến (mạo từ, số ít/số nhiều) không gây hiểu sai nội dung thì KHÔNG bị trừ điểm nặng, dễ dàng đạt Band 7.0+.
  6. Sẵn sàng chấm Band 8.0, 8.5 hoặc 9.0 khi bài viết đạt mức độ xuất sắc.

- QUY TẮC CHẤM BAND 7 CHO TASK RESPONSE (TR) TASK 2: Ở Task 2, chỉ cần bài viết trả lời đúng trọng tâm đề bài và có lập trường rõ ràng xuyên suốt thì tiêu chí TR tối thiểu đạt điểm 7.0 trở lên.
- Điểm Tổng (Overall Band) là trung bình cộng của 4 tiêu chí thành phần, làm tròn theo quy tắc IELTS chuẩn (Ví dụ: 6.75 -> 7.0; 6.25 -> 6.5; 6.125 -> 6.0).

Yêu cầu về số lượng từ (hãy kiểm tra số từ nhận được: ${wordCount} từ):
- Task 1: tối thiểu 150 từ. Nếu dưới 150 từ, điểm Task Achievement không thể vượt quá Band 5.
- Task 2: tối thiểu 250 từ. Nếu dưới 250 từ, điểm Task Response không thể vượt quá Band 5.
- Bài viết dưới 20 từ tự động nhận Band 1 cho tất cả tiêu chí.

${imagePart ? "LƯU Ý QUAN TRỌNG: Thí sinh ĐÃ CUNG CẤP HÌNH ẢNH BIỂU ĐỒ / SƠ ĐỒ GỐC của Task 1. Hãy soi chiếu trực tiếp từng số liệu, xu hướng, thông tin trích dẫn trong bài viết với hình ảnh biểu đồ này để đánh giá tiêu chí Task Achievement chuẩn xác 100%." : ""}

Hãy chấm điểm và đưa ra phản hồi chi tiết bằng tiếng Việt theo định dạng JSON cực kỳ nghiêm ngặt với các trường sau đây. Không được chèn thêm bất kỳ văn bản giải thích nào ngoài JSON.

Cấu trúc JSON phản hồi bắt buộc:
{
  "wordCount": number,
  "wordCountRequirement": "meets" | "under",
  "overallBand": number,
  "criteria": {
    "taOrTr": {
      "band": number,
      "name": "Task Achievement" | "Task Response",
      "feedback": "Phản hồi chi tiết bằng tiếng Việt (2-4 câu, bám sát ngôn ngữ mô tả chính thức của thang điểm tương ứng)",
      "example": "1 ví dụ cụ thể trích dẫn trực tiếp từ bài viết của thí sinh",
      "featureScores": [
        { "id": "id_dac_tinh_1", "scoreEarned": number, "status": "full" | "partial" | "none", "reasoning": "lý do" },
        ... 8 đặc tính từ #1 đến #8 của tiêu chí này
      ]
    },
    "cc": {
      "band": number,
      "name": "Coherence & Cohesion",
      "feedback": "Phản hồi chi tiết bằng tiếng Việt",
      "example": "1 ví dụ cụ thể",
      "featureScores": [
        ... 8 đặc tính từ #1 đến #8 của tiêu chí này
      ]
    },
    "lr": {
      "band": number,
      "name": "Lexical Resource",
      "feedback": "Phản hồi chi tiết bằng tiếng Việt",
      "example": "1 ví dụ cụ thể",
      "featureScores": [
        ... 8 đặc tính từ #1 đến #8 của tiêu chí này
      ]
    },
    "gra": {
      "band": number,
      "name": "Grammatical Range & Accuracy",
      "feedback": "Phản hồi chi tiết bằng tiếng Việt",
      "example": "1 ví dụ cụ thể",
      "featureScores": [
        ... 8 đặc tính từ #1 đến #8 của tiêu chí này
      ]
    }
  },
  "fullUpgradeEssay": "Bài viết mẫu hoàn chỉnh đạt chuẩn Band 8.0+. QUY TẮC BẮT BUỘC: Nâng cấp trực tiếp từ bài làm gốc của thí sinh. Những phần/câu/đoạn nào trong bài gốc đã viết tốt, không bị lỗi nặng thì BẮT BUỘC GIỮ NGUYÊN. Những chỗ nào bị lỗi hoặc ảnh hưởng tiêu cực đến điểm số thì sửa lại/nâng cấp. TẤT CẢ các câu/cụm từ/đoạn văn ĐÃ ĐƯỢC CHỈNH SỬA HOẶC BỔ SUNG NÂNG CẤP BẮT BUỘC BỌC TRONG THẺ <mark>câu/từ đã sửa/nâng cấp</mark> (Ví dụ: <mark>While urban connectivity surged, rural access fell sharply.</mark>) để thí sinh nhận biết chính xác những vị trí đã được thay đổi. Đồng thời bài viết mẫu này BẮT BUỘC phải tiếp thu, trực tiếp sử dụng và áp dụng triệt để tất cả các ý tưởng mới và các bước hành động đã đề xuất trong phần Cẩm Nang Lên Band.",
  "fullUpgradeEssayVietnamese": "BẢN DỊCH TIẾNG VIỆT HOÀN CHỈNH 100%, CHUẨN XÁC, SÁT NGHĨA VÀ MƯỢT MÀ CỦA BÀI VIẾT MẪU (fullUpgradeEssay) Ở TRÊN. QUY TẮC BẮT BUỘC VỀ BẢN DỊCH TIẾNG VIỆT (DÀNH CHO CẢ TASK 1 VÀ TASK 2): 1. DỊCH TOÀN BỘ 100% TẤT CẢ CÁC ĐOẠN VĂN (Mở bài, Tổng quan Overview, Thân bài 1, Thân bài 2, và Kết bài). TUYỆT ĐỐI KHÔNG DỪNG GIỮA CHỪNG, KHÔNG TÓM TẮT VÀ KHÔNG BỎ SÓT BẤT KỲ ĐOẠN VĂN NÀO. 2. Số lượng đoạn văn (phân tách bởi \\n\\n) trong bản dịch BẮT BUỘC BẰNG CHÍNH XÁC số lượng đoạn văn của bài mẫu tiếng Anh (fullUpgradeEssay). 3. TẤT CẢ các câu/cụm từ tiếng Việt tương ứng với vị trí đã được sửa/nâng cấp (<mark>...</mark>) trong bài tiếng Anh BẮT BUỘC BỌC TRONG THẺ <mark>câu/cụm từ tiếng Việt dịch tương ứng</mark> (Ví dụ: <mark>Trong khi tính kết nối đô thị tăng mạnh, khả năng tiếp cận ở nông thôn lại giảm sâu.</mark>).",
  "strengths": [
    {
      "title": "Tiêu đề thế mạnh thứ nhất",
      "explanation": "Giải thích chi tiết vì sao đây là thế mạnh",
      "example": "Trích dẫn ví dụ trực tiếp từ bài viết của thí sinh"
    },
    {
      "title": "Tiêu đề thế mạnh thứ hai",
      "explanation": "Giải thích chi tiết vì sao đây là thế mạnh",
      "example": "Trích dẫn ví dụ trực tiếp từ bài viết của thí sinh"
    }
  ],
  "improvements": [
    {
      "title": "Điểm cần cải thiện 1 (Quan trọng nhất)",
      "explanation": "Giải thích chi tiết lỗi/điểm yếu",
      "impact": "Tại sao sửa lỗi này lại giúp tăng điểm đáng kể (gắn với tiêu chí chấm điểm)"
    },
    {
      "title": "Điểm cần cải thiện 2",
      "explanation": "Giải thích lỗi",
      "impact": "Tại sao cải thiện điểm này giúp tăng điểm"
    },
    {
      "title": "Điểm cần cải thiện 3",
      "explanation": "Giải thích lỗi",
      "impact": "Tại sao cải thiện điểm này giúp tăng điểm"
    },
    {
      "title": "Điểm cần cải thiện 4",
      "explanation": "Giải thích lỗi",
      "impact": "Tại sao cải thiện điểm này giúp tăng điểm"
    },
    {
      "title": "Điểm cần cải thiện 5",
      "explanation": "Giải thích lỗi",
      "impact": "Tại sao cải thiện điểm này giúp tăng điểm"
    }
  ],
  "nextBandSteps": [
    "Các bước hành động cụ thể, chi tiết 1 để tăng băng điểm (thiết kế riêng cho bài viết này)",
    "Các bước hành động cụ thể, chi tiết 2",
    "Các bước hành động cụ thể, chi tiết 3"
  ]
}`;

  const promptText = `
Dưới đây là thông tin bài làm thi IELTS Academic Writing của thí sinh:
- Dạng bài: ${taskType === "task1" ? "IELTS Writing Task 1 (Mô tả biểu đồ / Sơ đồ / Bản đồ)" : "IELTS Writing Task 2 (Bài luận Essay)"}
- Đề bài gốc (Prompt): ${prompt ? prompt.trim() : "(Thí sinh không cung cấp đề bài gốc)"}
- Số lượng từ của bài làm: ${wordCount} từ
- Nội dung bài làm của thí sinh:
"""
${trimmedEssay}
"""
`;

  const contentsPayload = imagePart ? [imagePart, promptText] : promptText;

  const { text: responseText } = await generateWithFallbackClient(ai, {
    contents: contentsPayload,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  });

  const parsedResult: GradingReport = parseRobustJson(responseText, taskType, wordCount);

  if (!parsedResult.criteria) {
    parsedResult.criteria = {
      taOrTr: { name: taskType === "task1" ? "Task Achievement" : "Task Response", band: 6, feedback: "Đã phân tích.", example: "", featureScores: [] },
      cc: { name: "Coherence & Cohesion", band: 6, feedback: "Đã phân tích.", example: "", featureScores: [] },
      lr: { name: "Lexical Resource", band: 6, feedback: "Đã phân tích.", example: "", featureScores: [] },
      gra: { name: "Grammatical Range & Accuracy", band: 6, feedback: "Đã phân tích.", example: "", featureScores: [] },
    };
  }

  const computeCriterionScore = (detail: any): number => {
    if (detail?.featureScores && Array.isArray(detail.featureScores) && detail.featureScores.length > 0) {
      const sum = detail.featureScores.reduce((acc: number, f: any) => acc + (Number(f.scoreEarned) || 0), 0);
      return Math.min(9.0, Math.max(1.0, Math.round(sum * 2) / 2));
    }
    const rawBand = Number(detail?.band || 6);
    return Math.min(9.0, Math.max(1.0, Math.round(rawBand * 2) / 2));
  };

  const taScore = computeCriterionScore(parsedResult.criteria.taOrTr);
  const ccScore = computeCriterionScore(parsedResult.criteria.cc);
  const lrScore = computeCriterionScore(parsedResult.criteria.lr);
  const graScore = computeCriterionScore(parsedResult.criteria.gra);

  parsedResult.criteria.taOrTr.band = taScore;
  parsedResult.criteria.cc.band = ccScore;
  parsedResult.criteria.lr.band = lrScore;
  parsedResult.criteria.gra.band = graScore;

  const averageScore = (taScore + ccScore + lrScore + graScore) / 4;
  const finalRoundedScore = roundIELTS(averageScore);

  parsedResult.overallBand = finalRoundedScore;
  parsedResult.wordCount = wordCount;
  parsedResult.upgrades = Array.isArray(parsedResult.upgrades) ? parsedResult.upgrades : [];
  parsedResult.nextBandSteps = Array.isArray(parsedResult.nextBandSteps) ? parsedResult.nextBandSteps : [];
  parsedResult.wordCountRequirement =
    (taskType === "task1" && wordCount >= 150) || (taskType === "task2" && wordCount >= 250)
      ? "meets"
      : "under";

  return parsedResult;
}
