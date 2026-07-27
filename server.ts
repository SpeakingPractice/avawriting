import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { jsonrepair } from "jsonrepair";

dotenv.config();

// Helper to safely parse JSON from AI response, automatically repairing syntax errors like unescaped quotes or missing commas
function parseRobustJson(textResponse: string): any {
  if (!textResponse || typeof textResponse !== "string") {
    throw new Error("Không có phản hồi từ mô hình AI.");
  }

  let cleaned = textResponse.trim();
  // Remove markdown code fence if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  // 1. Attempt standard JSON.parse
  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    // 2. Attempt jsonrepair on cleaned text
    try {
      const repaired = jsonrepair(cleaned);
      return JSON.parse(repaired);
    } catch (e2) {
      // 3. Attempt to isolate valid JSON block between first '{' and last '}'
      const startIdx = cleaned.indexOf("{");
      const endIdx = cleaned.lastIndexOf("}");
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const sliced = cleaned.slice(startIdx, endIdx + 1);
        try {
          return JSON.parse(sliced);
        } catch (e3) {
          try {
            const repairedSliced = jsonrepair(sliced);
            return JSON.parse(repairedSliced);
          } catch (e4) {
            console.error("[AVA Robust JSON] All JSON parse attempts failed:", e4);
            throw e1;
          }
        }
      }
      throw e1;
    }
  }
}

dotenv.config();

// Ensure GEMINI_API_KEY is present
const apiKey = process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

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

// Helper function to call Gemini with automatic fallback models and retry logic on 503/UNAVAILABLE errors
async function generateContentWithFallback(
  ai: GoogleGenAI,
  options: {
    contents: any;
    config?: any;
  }
) {
  const models = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
  ];

  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`[AVA Gemini] Requesting model: ${model} (attempt ${attempt + 1})`);
        const response = await ai.models.generateContent({
          model,
          contents: options.contents,
          config: options.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);
        const isTransient =
          errMsg.includes("503") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("high demand") ||
          errMsg.includes("overloaded") ||
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED");

        if (isTransient) {
          console.warn(
            `[AVA Gemini] Model ${model} (attempt ${attempt + 1}) encountered high demand / transient error: ${errMsg}. Retrying or switching model...`
          );
          await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
        } else {
          // If non-transient error (e.g., INVALID_ARGUMENT, API_KEY_INVALID), throw immediately
          throw err;
        }
      }
    }
  }

  throw lastError;
}

// API endpoint to validate a custom Gemini API key
app.post("/api/validate-key", async (req, res) => {
  try {
    const { customApiKey } = req.body;
    if (!customApiKey || typeof customApiKey !== "string" || !customApiKey.trim()) {
      return res.status(400).json({ valid: false, error: "Mã API Key không được để trống." });
    }

    const testAi = new GoogleGenAI({
      apiKey: customApiKey.trim(),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Make a lightweight call to test key validity with fallbacks
    await generateContentWithFallback(testAi, {
      contents: "Test connection.",
      config: {
        maxOutputTokens: 5,
      },
    });

    return res.json({ valid: true });
  } catch (err: any) {
    console.error("Custom API Key validation failed:", err);
    const errMsg = err.message || "";
    let cleanMsg = "Khóa API không hợp lệ hoặc không có quyền truy cập mô hình gemini-3.5-flash.";
    if (errMsg.includes("quota") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) {
      cleanMsg = "Khóa API hợp lệ nhưng đã hết hạn ngạch sử dụng (Quota Exceeded / Rate Limit).";
    } else if (errMsg.includes("API_KEY_INVALID") || errMsg.includes("invalid")) {
      cleanMsg = "Khóa API không chính xác hoặc không tồn tại (Invalid API Key).";
    }
    return res.json({ valid: false, error: cleanMsg });
  }
});

// API endpoint to grade the essay
app.post("/api/grade", async (req, res) => {
  try {
    const { essay, taskType, prompt, customApiKey, image } = req.body;

    if (!essay || typeof essay !== "string") {
      return res.status(400).json({ error: "Nội dung bài viết không được để trống." });
    }

    let activeAi: GoogleGenAI | null = null;
    if (customApiKey && typeof customApiKey === "string" && customApiKey.trim().length > 0) {
      activeAi = new GoogleGenAI({
        apiKey: customApiKey.trim(),
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    } else {
      activeAi = ai;
    }

    if (!activeAi) {
      return res.status(500).json({
        error: "Hệ thống chưa cấu hình GEMINI_API_KEY mặc định và bạn chưa cung cấp API Key cá nhân. Vui lòng nhập API Key của riêng bạn ở khung nhập phía đầu trang.",
      });
    }

    const trimmedEssay = essay.trim();
    const wordCount = trimmedEssay.split(/\s+/).filter(Boolean).length;

    // Process image if provided for Task 1
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

    // Build the prompt for Gemini
    const systemInstruction = `Bạn là "Hệ Thống AVA," một Giám khảo chấm thi IELTS Academic Writing cao cấp với hơn 13 năm kinh nghiệm được chứng nhận bởi British Council/IDP. Bạn chấm điểm với sự chính xác, nhất quán và vô tư của một giám khảo chính thức - không bao giờ tự ý nâng điểm vì lòng tốt, và không bao giờ khắt khe một cách vô lý. Tông giọng của bạn lịch lãm, ấm áp, khuyến khích và chuyên nghiệp - giống như một người cố vấn đáng tin cậy.

Bạn chấm điểm HOÀN TOÀN theo các tiêu chí mô tả băng điểm IELTS Academic Writing chính thức (phiên bản công bố cập nhật tháng 5/2023) của British Council.

Quy tắc chấm điểm tiêu chí và làm tròn băng điểm (IELTS Band Descriptors Rules):
- Điểm của từng tiêu chí trong 4 tiêu chí (Task Achievement/Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy) BẮT BUỘC LÀ SỐ NGUYÊN (Ví dụ: 1, 2, 3, 4, 5, 6, 7, 8, 9). TUYỆT ĐỐI KHÔNG ĐƯỢC CHO ĐIỂM NỬA BAND (.5) HOẶC SỐ LẺ DÀNH CHO BẤT KỲ TIÊU CHÍ THÀNH PHẦN NÀO.
- Bám sát nguyên tắc IELTS Band Descriptors chính thức: Một bài viết CHỈ ĐƯỢC CHO ĐIỂM BAND N khi ĐÁP ỨNG ĐẦY ĐỦ VÀ TRỌN VẸN TẤT CẢ các đặc trưng tích cực (positive features) của Band N ở tiêu chí tương ứng. Chỉ cần DÙ CHỈ 1 đặc trưng của Band N KHÔNG ĐƯỢC ĐÁP ỨNG (ví dụ: vẫn còn mắc lỗi ngữ pháp nhỏ, dùng từ chưa hoàn toàn chính xác, thiếu tổng quan overview, hoặc còn dính lỗi chấm câu...), điểm tiêu chí đó BẮT BUỘC PHẢI TỤT XUỐNG MỘT CẤP BAND THẤP HƠN (Band N-1).
- QUY TẮC BẮT BUỘC VỀ CHẤM BAND 7 CHO TIÊU CHÍ TASK RESPONSE (TR) TASK 2: Ở Task 2, dù bài viết có mắc lỗi over-generalise (khái quát hóa quá đà) hoặc thiếu sự tập trung/chính xác trong việc hỗ trợ các ý tưởng (supporting ideas may lack focus), NHƯNG bài viết VẪN ĐẢM BẢO ĐƯỢC 2 đặc trưng tích cực (positive features) cốt lõi là: (1) "The main parts of the prompt are appropriately addressed" (Đã trả lời thích hợp các phần chính của đề bài) và (2) "A clear and developed position is presented" (Thể hiện lập trường rõ ràng và xuyên suốt), thì tiêu chí Task Response (TR) BẮT BUỘC VẪN ĐƯỢC CHẤM BAND 7 (Tuyệt đối không hạ xuống Band 6 nếu đã đáp ứng 2 đặc trưng tích cực này).
- LƯU Ý BẮT BUỘC VỀ KHÁI QUÁT HÓA VÀ LẬP LUẬN (Overgeneralization & Unconvincing Logic trong TR / TA): Nếu bài viết mắc lỗi overgeneralization (khái quát hóa quá đà), lập luận mang tính định kiến / phiến diện, thiếu tính thuyết phục / logic cao, hoặc chưa nêu đầy đủ thông tin quan trọng khiến bài KHÔNG ĐẠT ĐƯỢC BAND 8 ở tiêu chí TR hay TA, bạn BẮT BUỘC phải trích dẫn CỤ THỂ vị trí câu văn / đoạn văn vi phạm trong bài làm của thí sinh (ngay trong phần feedback/example của TA/TR hoặc phần Cải Thiện), chỉ rõ chính xác lỗi đó nằm ở câu nào / đoạn nào và giải thích rõ nguyên nhân.
- Điểm Tổng (Overall Band) sẽ do hệ thống tự động tính dựa trên trung bình cộng của 4 tiêu chí số nguyên này và làm tròn theo quy tắc IELTS chính thức (Ví dụ: trung bình 6.75 -> Overall 7.0; 6.25 -> Overall 6.5; 6.125 -> Overall 6.0; 7.0 -> Overall 7.0).

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
      "feedback": "Phản hồi chi tiết bằng tiếng Việt (2-4 câu, bám sát ngôn ngữ mô tả chính thức của thang điểm tương ứng. Thêm lưu ý cảnh báo rõ ràng nếu thiếu đề bài gốc làm hạn chế độ chính xác khi chấm tiêu chí này)",
      "example": "1 ví dụ cụ thể trích dẫn trực tiếp từ bài viết của thí sinh để minh họa cho nhận xét trên"
    },
    "cc": {
      "band": number,
      "name": "Coherence & Cohesion",
      "feedback": "Phản hồi chi tiết bằng tiếng Việt (2-4 câu, bám sát tiêu chí về mạch lạc, liên kết câu/đoạn và phân chia đoạn văn)",
      "example": "1 ví dụ cụ thể trích dẫn trực tiếp từ bài viết của thí sinh để minh họa"
    },
    "lr": {
      "band": number,
      "name": "Lexical Resource",
      "feedback": "Phản hồi chi tiết bằng tiếng Việt (2-4 câu, bám sát tiêu chí về vốn từ vựng, độ chính xác, chính tả và cách kết hợp từ collocations)",
      "example": "1 ví dụ cụ thể trích dẫn trực tiếp từ bài viết của thí sinh để minh họa"
    },
    "gra": {
      "band": number,
      "name": "Grammatical Range & Accuracy",
      "feedback": "Phản hồi chi tiết bằng tiếng Việt (2-4 câu, bám sát tiêu chí về sự đa dạng cấu trúc ngữ pháp, độ chính xác và dấu câu)",
      "example": "1 ví dụ cụ thể trích dẫn trực tiếp từ bài viết của thí sinh để minh họa"
    }
  },
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
  "upgrades": [
    {
      "before": "Trích dẫn một câu văn gốc còn yếu hoặc có lỗi của thí sinh",
      "after": "Phiên bản nâng cấp hoàn hảo hơn (Band 8.0/9.0) của câu văn đó",
      "explanation": "Giải thích lý do nâng cấp (về ngữ pháp, sự chính xác, tính mạch lạc hoặc từ vựng cao cấp)"
    },
    {
      "before": "Một câu văn gốc khác còn hạn chế",
      "after": "Phiên bản nâng cấp hoàn hảo hơn",
      "explanation": "Giải thích lý do nâng cấp"
    }
  ],
  "nextBandSteps": [
    "Các bước hành động cụ thể, chi tiết 1 để tăng băng điểm (thiết kế riêng cho bài viết này)",
    "Các bước hành động cụ thể, chi tiết 2",
    "Các bước hành động cụ thể, chi tiết 3"
  ],
  "fullUpgradeEssay": "Bài viết mẫu hoàn chỉnh đạt chuẩn Band 8.0+. QUY TẮC BẮT BUỘC: Nâng cấp trực tiếp từ bài làm gốc của thí sinh. Những phần/câu/đoạn nào trong bài gốc đã viết tốt, không bị lỗi nặng thì BẮT BUỘC GIỮ NGUYÊN. Những chỗ nào bị lỗi hoặc ảnh hưởng tiêu cực đến điểm số thì sửa lại/nâng cấp. TẤT CẢ các câu/cụm từ/đoạn văn ĐÃ ĐƯỢC CHỈNH SỬA HOẶC BỔ SUNG NÂNG CẤP BẮT BUỘC BỌC TRONG THẺ <mark>câu/từ đã sửa/nâng cấp</mark> (Ví dụ: <mark>While urban connectivity surged, rural access fell sharply.</mark>) để thí sinh nhận biết chính xác những vị trí đã được thay đổi. Đồng thời bài viết mẫu này BẮT BUỘC phải tiếp thu, trực tiếp sử dụng và áp dụng triệt để tất cả các ý tưởng mới và các bước hành động đã đề xuất trong phần Cẩm Nang Lên Band (nextBandSteps)."
}`;

    const promptText = `
Hãy chấm điểm bài viết sau đây.

THÔNG TIN BÀI VIẾT:
- Loại bài viết: ${taskType === "task1" ? "Task 1 (Academic)" : "Task 2 (Essay)"}
- Đề bài gốc (nếu có): ${prompt || "Không có đề bài gốc được cung cấp. Hãy lưu ý cảnh báo thí sinh về điều này dưới tiêu chí chấm điểm."}
- Số từ thực tế: ${wordCount} từ.

NỘI DUNG BÀI VIẾT CỦA THÍ SINH:
"""
${trimmedEssay}
"""
`;

    // Call Gemini API using fallback sequence with multimodal support
    const contentsPayload = imagePart ? [imagePart, promptText] : promptText;

    const response = await generateContentWithFallback(activeAi, {
      contents: contentsPayload,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.2, // Keep grading precise and consistent
        maxOutputTokens: 8192,
      },
    });

    const textResponse = response.text;
    if (!textResponse) {
      throw new Error("Không có phản hồi từ mô hình AI.");
    }

    // Parse output JSON with robust cleaning and repair
    let parsedResult;
    try {
      parsedResult = parseRobustJson(textResponse);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", textResponse);
      return res.status(500).json({
        error: "Mô hình AI phản hồi cấu trúc dữ liệu không hoàn chỉnh. Vui lòng thử lại.",
        rawText: textResponse,
      });
    }

    // Individual criteria scores MUST be integers according to strict Band Descriptors (no half bands)
    const taScore = Math.floor(Number(parsedResult.criteria?.taOrTr?.band || 0));
    const ccScore = Math.floor(Number(parsedResult.criteria?.cc?.band || 0));
    const lrScore = Math.floor(Number(parsedResult.criteria?.lr?.band || 0));
    const graScore = Math.floor(Number(parsedResult.criteria?.gra?.band || 0));

    if (parsedResult.criteria?.taOrTr) parsedResult.criteria.taOrTr.band = taScore;
    if (parsedResult.criteria?.cc) parsedResult.criteria.cc.band = ccScore;
    if (parsedResult.criteria?.lr) parsedResult.criteria.lr.band = lrScore;
    if (parsedResult.criteria?.gra) parsedResult.criteria.gra.band = graScore;

    // Recalculate Overall Band from integer criteria scores using official IELTS average rounding
    const averageScore = (taScore + ccScore + lrScore + graScore) / 4;
    const finalRoundedScore = roundIELTS(averageScore);

    // Apply strict override for overall band and word count requirement
    parsedResult.overallBand = finalRoundedScore;
    parsedResult.wordCount = wordCount;
    parsedResult.wordCountRequirement =
      taskType === "task1"
        ? wordCount >= 150
          ? "meets"
          : "under"
        : wordCount >= 250
        ? "meets"
        : "under";

    return res.json(parsedResult);
  } catch (err: any) {
    console.error("Error grading essay:", err);
    const errMsg = err.message || "";
    
    // Graceful error handling for 503 / High Demand / Unavailable / 429 Quota Exceeded
    if (
      errMsg.includes("503") ||
      errMsg.includes("UNAVAILABLE") ||
      errMsg.includes("high demand") ||
      errMsg.includes("overloaded")
    ) {
      return res.status(503).json({
        error: "Máy chủ Google AI hiện đang quá tải lượt truy cập cao (503 High Demand). Hệ thống AVA đã tự động chuyển đổi mô hình dự phòng nhưng vẫn bận. Vui lòng thử lại sau 15-30 giây!",
      });
    }

    if (
      errMsg.includes("429") ||
      errMsg.includes("quota") ||
      errMsg.includes("RESOURCE_EXHAUSTED") ||
      errMsg.includes("limit")
    ) {
      return res.status(429).json({
        error: "Hệ thống đang tạm thời quá tải hoặc đã vượt quá lượt yêu cầu miễn phí của hôm nay (Resource Exhausted / 429). Vui lòng đợi 15-30 giây rồi gửi lại bài viết của bạn.",
      });
    }

    return res.status(500).json({ error: errMsg || "Đã xảy ra lỗi trong quá trình chấm điểm." });
  }
});

// Configure Vite middleware or static assets serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only start standalone server if not running as a Vercel Serverless Function
if (!process.env.VERCEL && !process.env.NOW_BUILDER) {
  startServer();
}

export default app;
