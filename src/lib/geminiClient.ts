import { GoogleGenAI } from "@google/genai";
import { jsonrepair } from "jsonrepair";
import { GradingReport } from "../types";

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
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    try {
      const repaired = jsonrepair(cleaned);
      return JSON.parse(repaired);
    } catch (e2) {
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
            console.error("[AVA Robust JSON Client] All JSON parse attempts failed:", e4);
            throw new Error("Mô hình AI trả về cấu trúc dữ liệu không hoàn chỉnh. Vui lòng gửi lại bài viết.");
          }
        }
      }
      throw e1;
    }
  }
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
    "gemini-3.7-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-2.5-flash",
  ];

  let lastError: any = null;

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
          await new Promise((resolve) => setTimeout(resolve, 500));
        } else {
          break;
        }
      }
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

  const systemInstruction = `Bạn là "Hệ Thống AVA," một Giám khảo chấm thi IELTS Academic Writing cao cấp với hơn 13 năm kinh nghiệm được chứng nhận bởi British Council/IDP. Bạn chấm điểm với sự chính xác, nhất quán và vô tư của một giám khảo chính thức - không bao giờ tự ý nâng điểm vì lòng tốt, và không bao giờ khắt khe một cách vô lý. Tông giọng của bạn lịch lãm, ấm áp, khuyến khích và chuyên nghiệp - giống như một người cố vấn đáng tin cậy.

Bạn chấm điểm HOÀN TOÀN theo các tiêu chí mô tả băng điểm IELTS Academic Writing chính thức (phiên bản công bố cập nhật) của British Council cũng như Bảng Tiêu Chí Tiến Hóa Theo Cấp Độ (Band Progression Matrix - 32 đặc tính tích lũy cho Task 1 & Task 2 từ Band B1 5.0+ đến C2 8.0+).

Quy tắc chấm điểm tiêu chí và làm tròn băng điểm (IELTS Band Descriptors Rules & Feature-Based Scoring):
- Soi chiếu bài làm với Bảng Tiến Hóa Tiêu Chí IELTS Writing (B1 -> B2 -> C1 -> C2) ở cả 4 tiêu chí:
  + Task 1 / Task 2 Task Achievement (TA) / Task Response (TR)
  + Coherence & Cohesion (CC)
  + Lexical Resource (LR)
  + Grammatical Range & Accuracy (GRA)
- QUY TẮC CỘNG ĐIỂM THEO 8 ĐẶC TÍNH (MAX BAND 9.0 CHO MỖI TIÊU CHÍ):
  + Không chấm điểm ngẫu hứng hay tự cho điểm ngẫu nhiên ở từng tiêu chí. Hãy phân bổ theo bài viết và CỘNG ĐIỂM DỒN của 8 đặc tính (Feature #1 đến #8) trong Bảng Tiến Hóa Tiêu Chí để ra điểm chính xác của từng tiêu chí:
    * Feature #1 (minBand B1): Tối đa 1.0 điểm
    * Feature #2 (minBand B1): Tối đa 2.0 điểm
    * Feature #3 (minBand B1): Tối đa 2.0 điểm
    * Feature #4 (minBand B2): Tối đa 0.5 điểm
    * Feature #5 (minBand B2): Tối đa 0.5 điểm
    * Feature #6 (minBand B2/C1): Tối đa 1.0 điểm
    * Feature #7 (minBand C1): Tối đa 1.0 điểm
    * Feature #8 (minBand C2): Tối đa 1.0 điểm
    (Tổng 8 đặc tính = 9.0 điểm tối đa cho tiêu chí).
- QUY TẮC CHẤM LINH HOẠT VÀ NỬA ĐIỂM (PARTIAL SCORE 0.5) BÁM SÁT BAND DESCRIPTORS THỰC TẾ:
  + Xét kỹ từng đặc tính từ #1 đến #8:
    * Nếu đáp ứng đầy đủ đặc tính N -> Cho trọn vẹn điểm tối đa của đặc tính đó (Status: "full").
    * Nếu đáp ứng ĐƯỢC 1 PHẦN của đặc tính (đặc biệt là các đặc tính nâng cao từ #4 đến #8) -> Cho 0.5 điểm cho đặc tính đó (Status: "partial").
  + CÁC HƯỚNG DẪN ĐÁNH GIÁ LINH HOẠT CỤ THỂ:
    1. Ghi nhận Diễn tiến Đề ngữ & Mạch suy luận (Coherence & Cohesion): Nếu bài viết có dấu hiệu áp dụng Quy tắc Diễn tiến đề ngữ (Rheme-Theme progression / Theme-Rheme continuation) hoặc Linear Thinking (ví dụ ở Body 1 lấy thông tin vế sau câu trước làm đề ngữ/chủ ngữ cho câu tiếp theo), dù mới thể hiện ở một phần bài làm hay chưa triển khai sâu -> BẮT BUỘC cho 0.5 điểm (partial) ở đặc tính CC nâng cao tương ứng (như cc2_8 hoặc cc1_8) để ghi nhận đúng tư duy mạch lạc của thí sinh.
    2. Nhận diện Ví dụ Linh hoạt & Tự nhiên (Task Response / Task Achievement): Đưa ví dụ minh họa KHÔNG BẮT BUỘC phải dùng từ nối cứng nhắc như "for example" hay "for instance". Cần công nhận linh hoạt tất cả các hình thức minh họa tự nhiên khác như: dùng "such as", "like", "including", "namely", hoặc đưa trực tiếp ví dụ/trường hợp thực tế/số liệu cụ thể vào câu (ví dụ: "...such as artificial scarcity and countdown discounts..."). Khi thí sinh minh họa theo các cách này, BẮT BUỘC ghi nhận đạt điểm (Full hoặc Partial) cho các đặc tính phát triển luận điểm & ví dụ minh họa (như tr2_4, tr2_6, tr2_8, ta1_4, ta1_7).
    3. Đánh giá Cấu trúc PEEL & Lập luận Sắc bén (TR Task 2 - Feature #6): Nếu bài viết có cấu trúc đoạn văn triển khai đầy đủ và chặt chẽ (Câu chủ đề -> Giải thích -> Minh họa/Ví dụ -> Kết quả/Liên kết), có phân tích mở rộng tác động vĩ mô/vi mô thích hợp -> BẮT BUỘC xem xét cho điểm trọn vẹn (1.0 full) hoặc nửa điểm (0.5 partial) ở đặc tính Feature #6 của TR (tr2_6).
    4. Đánh giá Phản biện / Góc nhìn Đối lập (TR Task 2 - Feature #7): Đánh giá linh hoạt khả năng lập luận đa chiều. Nếu bài viết có phân tích mặt đối lập, nhượng bộ hoặc đối trọng lập luận (ví dụ phân tích lợi ích ở Body 1 nhưng phản biện/đối trọng bằng các tác động tiêu cực vượt trội ở Body 2) -> BẮT BUỘC cân nhắc cho điểm trọn vẹn (1.0 full) hoặc nửa điểm (0.5 partial) ở đặc tính Feature #7 của TR (tr2_7).
    5. Đánh giá Khách quan Vốn từ vựng & Collocations (Lexical Resource): Đánh giá chính xác và ghi nhận xứng đáng khi thí sinh sử dụng được các collocations tự nhiên và từ vựng học thuật chuẩn theo chủ đề (ví dụ: "fueling a contentious debate", "commercial promotion", "economic utility", "data-driven tracking mechanisms", "exploit cognitive vulnerabilities", "compulsive spending", "individual autonomy", v.v.). Không quá khắt hệ hay đè điểm vô lý khi diễn đạt của thí sinh đã đạt độ mượt mà và chuẩn xác của Band 7.0 - 8.0+.
    6. Đánh giá Độ chính xác Ngữ pháp & Dấu câu (GRA - Feature #7): Nếu bài viết có số lỗi ngữ pháp ít (ước tính khoảng 3-5 lỗi nhỏ), các lỗi không lặp lại triệt để, dùng dấu câu chuẩn xác và tác động tối thiểu/không ảnh hưởng đến việc thông hiểu của người đọc -> BẮT BUỘC cân nhắc ghi nhận cho điểm (1.0 full hoặc 0.5 partial) ở đặc tính Feature #7 của GRA (gra1_7 / gra2_7).
    7. Bài Mẫu Chuẩn Band 9.0 Của Giám Khảo Đã Được Hệ Thống Tiếp Thu & Áp Dụng (Examiner Band 9 Benchmark):
       - TR (Feature #8 C2 - Band 9): Đánh giá cao mô hình "Mổ xẻ nguyên lý chiều sâu" (Counter-Refutation Loop). Khi bài viết dùng lại cùng một ví dụ/chủ đề ở Body 1 (ví dụ: work-life balance) để phân tích bóc tách tầng triết lý bên dưới ở Body 2 ("Beneath this concept lies a durable principle..."), chỉ ra các hậu quả thực tế ("grappling with burnout, digital fatigue") chính là điều quy tắc truyền thống muốn ngăn ngừa ("pre-empt") -> BẮT BUỘC trao trọn vẹn điểm tối đa (1.0 Full) ở TR Feature #8.
       - CC (Feature #8 C2 - Band 9): Mạch liên kết tự nhiên, không dùng từ nối rập khuôn mà chuyển ý bằng logic lập luận ("Admittedly...", "Take, for instance...", "Ironically, these are the very consequences...", "While the form must evolve, the underlying value retains its relevance").
       - LR (Feature #8 C2 - Band 9): Trao điểm tuyệt đối khi thí sinh dùng chuỗi collocations tự nhiên cấp độ C2 ("cherished by older generations", "out of step with contemporary norms", "rendered obsolete", "gaining widespread traction", "at the expense of", "clear demarcation", "pre-empt", "mesh with the tempo of contemporary life", "critically engaging with").
       - GRA (Feature #8 C2 - Band 9): Ghi nhận trọn vẹn điểm khi thí sinh kết hợp đa dạng mệnh đề rút gọn, cấu trúc đảo ngữ ("Beneath this concept lies..."), mệnh đề phân từ, và dấu câu linh hoạt (dấu hai chấm để làm rõ nguyên lý).
    8. Ví dụ tổng quát: Ở Task 2 tiêu chí TR, người viết đạt trọn vẹn đặc tính #1 (1.0), #2 (2.0), #3 (2.0), #4 (0.5) => Được 5.5. Nếu có thêm đặc tính #6 (0.5 - PEEL tốt) và #7 (0.5 - Phản biện/đối trọng) -> Điểm TR sẽ đạt 6.5 - 7.0. Tiêu chí CC có dấu hiệu Rheme-Theme progression ở Body 1 -> Cho 0.5 điểm ở #8 => Ghi nhận đúng năng lực thực tế.
- QUY TẮC CHẤM MAX BAND 9.0 (DO NOT CAP AT BAND 8.0):
  + Nếu bài viết đáp ứng trọn vẹn tất cả các đặc tính tiêu chí thì điểm tiêu chí đó BẮT BUỘC LÀ 9.0 (không được tự áp trần ở Band 8.0 hay 8.5).
- QUY TẮC CHẤM BAND 7 CHO TASK RESPONSE (TR) TASK 2: Ở Task 2, dù bài viết có mắc lỗi over-generalise hoặc thiếu tập trung hỗ trợ ý tưởng, NHƯNG bài viết VẪN ĐẢM BẢO ĐƯỢC 2 đặc trưng cốt lõi (1. Trả lời thích hợp các phần chính của đề bài & 2. Lập trường rõ ràng xuyên suốt) thì tiêu chí TR tối thiểu đạt điểm 7.0 trở lên.
- QUY TẮC BÁO CÁO SỐ LIỆU VÀ TỪ ƯỚC LƯỢNG Ở TASK 1 (TASK ACHIEVEMENT DATA ACCURACY):
  + Đối với các số liệu trong biểu đồ không nằm ở mốc chính xác (xấp xỉ/khoảng), thí sinh BẮT BUỘC phải dùng các từ thể hiện sự ước lượng như "about", "around", "approximately", "roughly", "nearly", "just over", "just under", "almost", "close to", "in the region of"... thì báo cáo mới hợp lý và được tính điểm.
  + Nếu số liệu là ước lượng mà thí sinh khẳng định như một con số tuyệt đối (không có từ chỉ sự xấp xỉ) -> Bị tính là báo cáo thiếu chính xác (inaccurate data reporting) và trừ điểm ở Task Achievement.
  + Ngược lại, nếu thí sinh sử dụng đúng và linh hoạt các từ chỉ sự ước lượng đi kèm số liệu xấp xỉ hợp lý -> BẮT BUỘC ghi nhận đạt điểm cao (Full/Partial) cho các đặc tính minh họa số liệu của Task Achievement (ta1_2, ta1_4, ta1_7, ta1_8).
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

  const parsedResult: GradingReport = parseRobustJson(responseText);

  const computeCriterionScore = (detail: any): number => {
    if (detail?.featureScores && Array.isArray(detail.featureScores) && detail.featureScores.length > 0) {
      const sum = detail.featureScores.reduce((acc: number, f: any) => acc + (Number(f.scoreEarned) || 0), 0);
      return Math.min(9.0, Math.max(1.0, Math.round(sum * 2) / 2));
    }
    const rawBand = Number(detail?.band || 0);
    return Math.min(9.0, Math.max(1.0, Math.round(rawBand * 2) / 2));
  };

  const taScore = computeCriterionScore(parsedResult.criteria?.taOrTr);
  const ccScore = computeCriterionScore(parsedResult.criteria?.cc);
  const lrScore = computeCriterionScore(parsedResult.criteria?.lr);
  const graScore = computeCriterionScore(parsedResult.criteria?.gra);

  if (parsedResult.criteria?.taOrTr) parsedResult.criteria.taOrTr.band = taScore;
  if (parsedResult.criteria?.cc) parsedResult.criteria.cc.band = ccScore;
  if (parsedResult.criteria?.lr) parsedResult.criteria.lr.band = lrScore;
  if (parsedResult.criteria?.gra) parsedResult.criteria.gra.band = graScore;

  const averageScore = (taScore + ccScore + lrScore + graScore) / 4;
  const finalRoundedScore = roundIELTS(averageScore);

  parsedResult.overallBand = finalRoundedScore;
  parsedResult.wordCount = wordCount;
  parsedResult.upgrades = parsedResult.upgrades || [];
  parsedResult.wordCountRequirement =
    (taskType === "task1" && wordCount >= 150) || (taskType === "task2" && wordCount >= 250)
      ? "meets"
      : "under";

  return parsedResult;
}
