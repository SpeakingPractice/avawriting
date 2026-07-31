import { GoogleGenAI } from "@google/genai";
import { jsonrepair } from "jsonrepair";
import { GradingReport } from "../types";

// Helper to safely parse JSON from AI response, automatically repairing syntax errors like unescaped quotes or missing commas
function parseRobustJson(textResponse: string): any {
  if (!textResponse || typeof textResponse !== "string") {
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
            throw e1;
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
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
  ];

  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
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
          await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
        } else {
          throw err;
        }
      }
    }
  }

  throw lastError;
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

Bạn chấm điểm HOÀN TOÀN theo các tiêu chí mô tả băng điểm IELTS Academic Writing chính thức (phiên bản công bố cập nhật) của British Council cũng như Bảng Tiêu Chí Tiến Hóa Theo Cấp Độ (Band Progression Matrix - 32 đặc tính tích lũy cho Task 1 & Task 2 từ Band B1 5.0+ đến C2 7.5+).

Quy tắc chấm điểm tiêu chí và làm tròn băng điểm (IELTS Band Descriptors Rules):
- Soi chiếu bài làm với Bảng Tiến Hóa Tiêu Chí IELTS Writing (B1 -> B2 -> C1 -> C2) ở cả 4 tiêu chí:
  + Task 1 / Task 2 Task Achievement (TA) / Task Response (TR)
  + Coherence & Cohesion (CC)
  + Lexical Resource (LR)
  + Grammatical Range & Accuracy (GRA)
- Điểm của từng tiêu chí trong 4 tiêu chí BẮT BUỘC LÀ SỐ NGUYÊN (Ví dụ: 1, 2, 3, 4, 5, 6, 7, 8, 9). TUYỆT ĐỐI KHÔNG ĐƯỢC CHO ĐIỂM NỬA BAND (.5) HOẶC SỐ LẺ DÀNH CHO BẤT KỲ TIÊU CHÍ THÀNH PHẦN NÀO.
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

  const response = await generateWithFallbackClient(ai, {
    contents: contentsPayload,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  });

  const responseText = response.text || "";
  const parsedResult: GradingReport = parseRobustJson(responseText);

  const taScore = Math.floor(Number(parsedResult.criteria?.taOrTr?.band || 0));
  const ccScore = Math.floor(Number(parsedResult.criteria?.cc?.band || 0));
  const lrScore = Math.floor(Number(parsedResult.criteria?.lr?.band || 0));
  const graScore = Math.floor(Number(parsedResult.criteria?.gra?.band || 0));

  if (parsedResult.criteria?.taOrTr) parsedResult.criteria.taOrTr.band = taScore;
  if (parsedResult.criteria?.cc) parsedResult.criteria.cc.band = ccScore;
  if (parsedResult.criteria?.lr) parsedResult.criteria.lr.band = lrScore;
  if (parsedResult.criteria?.gra) parsedResult.criteria.gra.band = graScore;

  const averageScore = (taScore + ccScore + lrScore + graScore) / 4;
  const finalRoundedScore = roundIELTS(averageScore);

  parsedResult.overallBand = finalRoundedScore;
  parsedResult.wordCount = wordCount;
  parsedResult.wordCountRequirement =
    (taskType === "task1" && wordCount >= 150) || (taskType === "task2" && wordCount >= 250)
      ? "meets"
      : "under";

  return parsedResult;
}
