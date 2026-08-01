import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { jsonrepair } from "jsonrepair";

dotenv.config();

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

// Helper to safely parse JSON from AI response, automatically repairing syntax errors like unescaped quotes or missing commas
function parseRobustJson(textResponse: string): any {
  if (!textResponse || typeof textResponse !== "string" || !textResponse.trim()) {
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
            throw new Error("Mô hình AI trả về cấu trúc dữ liệu không hoàn chỉnh. Vui lòng gửi lại bài viết.");
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
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
  ];

  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`[AVA Gemini] Requesting model: ${model} (attempt ${attempt + 1})`);
        
        // Try with thinkingBudget: 0 for maximum speed; fallback if unsupported
        let response;
        try {
          response = await ai.models.generateContent({
            model,
            contents: options.contents,
            config: {
              ...options.config,
              thinkingConfig: { thinkingBudget: 0 },
              safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" },
              ],
            },
          });
        } catch (thinkingErr: any) {
          // If model doesn't support thinkingConfig, fallback without it
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
        }

        const text = extractResponseText(response);
        if (text && text.length > 0) {
          return { response, text };
        } else {
          const finishReason = response?.candidates?.[0]?.finishReason || "UNKNOWN";
          console.warn(`[AVA Gemini] Model ${model} returned empty response text (finishReason: ${finishReason}). Trying fallback...`);
          lastError = new Error(`Mô hình ${model} không trả về phản hồi (finishReason: ${finishReason}).`);
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);
        console.warn(`[AVA Gemini] Model ${model} (attempt ${attempt + 1}) error: ${errMsg}`);
        const isTransient =
          errMsg.includes("503") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("high demand") ||
          errMsg.includes("overloaded") ||
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED");

        if (isTransient) {
          await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
        } else {
          break;
        }
      }
    }
  }

  if (lastError) throw lastError;
  throw new Error("Không có phản hồi từ bất kỳ mô hình AI nào.");
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
- QUY TẮC BẮT BUỘC VỀ ĐÁNH GIÁ SỐ LIỆU XẤP XỈ Ở TASK 1 (TASK 1 APPROXIMATE DATA EVALUATION):
  + Đối với các biểu đồ/đồ thị Task 1 không ghi sẵn con số chính xác trực tiếp trên từng đầu cột/đường mà phải gióng sang trục tọa độ, thí sinh bắt buộc phải ước lượng số liệu.
  + TUYỆT ĐỐI KHÔNG KHẮT KHE HOẶC BẮT LỖI SAI SỐ LIỆU đối với các giá trị ước lượng hợp lý trong khoảng trực quan của biểu đồ (ví dụ: nếu cột vượt quá mức 15% một chút, thì các con số ước lượng như 16%, 17%, hay 18% ĐỀU ĐƯỢC COI LÀ CHÍNH XÁC VÀ HỢP LỆ).
  + MIỄN LÀ bài viết có kèm theo từ/cụm từ thể hiện sự xấp xỉ/ước lượng (như "about", "around", "roughly", "approximately", "nearly", "just over", "just under", "a little over", "almost", "close to"...), giám khảo BẮT BUỘC PHẢI CHẤP NHẬN đây là số liệu chuẩn xác và đánh giá cao kỹ năng báo cáo số liệu của thí sinh. Tuyệt đối không coi là lỗi sai số liệu hay trừ điểm Task Achievement ở các trường hợp ước lượng hợp lý này.
- QUY TẮC CHẤM BAND 8.5 & 9.0 VÀ BỘ BÀI MẪU BENCHMARK BAND 9.0 TỪ CỰU GIÁM KHẢO (DO NOT CAP AT BAND 8.0):
  + Giám khảo AVA BẮT BUỘC không được tự áp trần điểm ở Band 8.0 hay 8.5. Nếu bài làm của thí sinh đạt đến trình độ đỉnh cao (mạch logic sâu sắc, phân tích bản chất vấn đề, từ vựng ngữ cảnh tự nhiên đỉnh cao như người bản xứ, liên kết Theme-Rheme trôi chảy, ngữ pháp chuẩn xác tuyệt đối), bạn BẮT BUỘC phải sẵn sàng chấm Band 8.5 hoặc Band 9.0 ở tiêu chí đó và Overall.
  + HỆ THỐNG LƯU TRỮ BỘ BÀI MẪU TRUẨN BAND 9.0 CỦA CỰU GIÁM KHẢO IELTS (GARY MCCLOUD - MC IELTS) ĐỂ SOI CHIẾU CHẤM ĐIỂM:
    1. Task 2 - Crime & Incarceration (Phân tích có phạm vi rõ ràng & Đào sâu bản chất):
       "Opinions regarding the efficacy of modern crime prevention approaches are divided... To clarify, incarceration is the primary form of punishment for most felons while fines, community service, and probation usually befit most convicted of misdemeanors... lengthy exposure to prison often produces convicts who become psychologically traumatized... Rehabilitation is given as a primary justification... In conclusion, crime prevention strategies are debatable, arguably non-unifiable, and inherently problematic... At present, incarceration is necessary, but not sufficient."
    2. Task 2 - Tourism & Destination Countries (Phản biện sắc bén & Từ vựng hàn lâm tự nhiên):
       "Traveling abroad fulfills dreams, satisfies and inspires curiosity, offers individuals opportunity to affirm or invalidate their stereotypes, creates international friendships, and promotes economic vitality... Negative impacts exist, but are manageable, mitigable, and should not inhibit tourism... Misguided environmentalists often spew nonsensical, pseudo-facts claiming pending doomsday scenarios... Residual hegemony exists but is incongruent with the positives of modern globalization..."
    3. Task 2 - Purpose of Education (Bóc tách triết học & Phản biện triệt hạ False Dichotomy):
       "False dichotomies couching functions of societal institutions, namely education, as mutually exclusive are inane... Utilitarian principles are arguably necessary for a cohesive society... Within the boundaries of tacit social contract obligation, the autonomy of the individual must be balanced with the rights of the group... Neither radical egalitarianism nor radical individualism is desirable..."
    4. Task 2 - Food Importation (Phân loại nguyên nhân Blameworthy vs Non-blameworthy):
       "Blameworthy causalities for a nation's food shortage include political malfeasance, governmental ineptitude, and war. Non-blameworthy causalities include a sometimes-whimsical global economy and natural changing climate patterns... Agribusiness is a worldwide enterprise providing millions of jobs... Barring such a catastrophe, the importation of food among nations is a positive trend."
    5. Task 2 - Celebrity Culture & Meritocracy (Lập luận xã hội học sâu sắc):
       "Nowadays, such meritocracy as a means to attain fame has devolved into arguably meritless factors such as exaggerated glamour and intentionally conspicuous wealth... Misguided emphasis is further exacerbated by political agendas attacking meritocracy... prioritizing equality of outcome rather than equality of opportunity results in an increase in the devaluation of merit..."
    6. Task 2 - Global Philanthropy vs Domestic Duty (Lập luận mang tính bản chất triết học):
       "Human suffering is embedded in antiquity but is not anachronistic; rather, in modern times it remains not only prevalent, but also ubiquitous... Confinement of philanthropy, if not altruism, may seem counterintuitive... nonetheless, it is reality because human disparity is categorically immutable... Ultimately, it is the duty of any government to primarily focus on the needs of its own citizens."
  + CÁC ĐẶC TRƯNG CỐT LÕI CỦA ĐẲNG CẤP BAND 9.0 TỪ CỰU GIÁM KHẢO CẦN SOI CHIẾU:
    1. TR: Phân tích đúng bản chất sâu xa của vấn đề (durable principles, social contracts, structural vs surface factors), khoanh vùng rõ ràng (scoping explicitly: felons vs misdemeanors, blameworthy vs non-blameworthy), lập trường đanh thép, phản biện và nhượng bộ mượt mà (Admittedly ... Yet ... While ... Nonetheless ...), không bao giờ vướng overgeneralization.
    2. CC: Mạch diễn tiến Đề Ngữ - Thuyết Ngữ (Theme-Rheme progression) nối tiếp tự nhiên như người bản xứ; tổ chức đoạn văn hoàn hảo (4 hoặc 5 đoạn tùy thuộc logic phát triển bài); từ nối học thuật đặt đúng nhịp thở câu văn (To clarify, Nonetheless, Hence, Regarding, Consequently).
    3. LR: Collocations & Vocabulary tự nhiên đỉnh cao (efficacious, inherently problematic, anachronistic, hegemonic marginalization, mitigable, durable principle, holistic well-being, digital fatigue, clear demarcation, maintaining equilibrium, categorically immutable, ubiquitous, meritocracy, conspicuous wealth, political malfeasance, tacit social contract, mutually exclusive).
    4. GRA: Biến hóa cấu trúc câu ngắn-dài uyển chuyển, chính xác tuyệt đối 100% ngữ pháp, sử dụng linh hoạt các cấu trúc phức nâng cao (dấu gạch ngang giải thích --, mệnh đề phụ thuộc phức hợp, đảo ngữ, đòn bẩy ngữ pháp) và dấu câu chuẩn xác.
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

    const { text: textResponse } = await generateContentWithFallback(activeAi, {
      contents: contentsPayload,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.2, // Keep grading precise and consistent
        maxOutputTokens: 8192,
      },
    });

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
    parsedResult.upgrades = parsedResult.upgrades || [];
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
