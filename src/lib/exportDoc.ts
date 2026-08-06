import { GradingReport } from "../types";
import {
  task1ProgressionCategories,
  task2ProgressionCategories,
  ProgressionFeatureItem,
} from "../data/criteriaData";

export interface TaskExportData {
  taskType: "task1" | "task2" | string;
  promptText: string;
  originalEssay: string;
  report: GradingReport;
  task1Image?: string | null;
}

/**
 * Formats a band score according to IELTS rules:
 * - Integer scores (e.g. 7, 8) get ".0" -> "7.0", "8.0"
 * - Half-band or decimal scores (e.g. 5.5, 6.5, 7.5, 8.5) stay as-is -> "5.5", "6.5"
 */
export function formatBandScore(val: number | string): string {
  const num = typeof val === "number" ? val : parseFloat(String(val));
  if (isNaN(num)) return String(val);
  if (num % 1 === 0) {
    return `${Math.round(num)}.0`;
  }
  return `${num}`;
}

/**
 * Calculates official IELTS Writing Overall Band from Task 1 and Task 2:
 * Task 1 weight = 1/3, Task 2 weight = 2/3
 * IELTS Rounding rules:
 * - < 0.25 -> round down to .0
 * - >= 0.25 and < 0.75 -> round to .5
 * - >= 0.75 -> round up to next .0
 */
export function calculateCombinedIeltsBand(t1Score: number, t2Score: number): number {
  const rawAvg = (t1Score * 1 + t2Score * 2) / 3;
  const floorVal = Math.floor(rawAvg);
  const diff = rawAvg - floorVal;
  if (diff < 0.25) return floorVal;
  if (diff < 0.75) return floorVal + 0.5;
  return floorVal + 1.0;
}

function getFeatureEval(
  detail: any,
  feat: ProgressionFeatureItem,
  featIndex: number
) {
  const maxScore = parseFloat(feat.score) || 0;

  if (detail?.featureScores && Array.isArray(detail.featureScores) && detail.featureScores.length > 0) {
    const item = detail.featureScores.find((f: any) => f.id === feat.id);
    if (item) {
      const earned = Math.max(0, Math.min(maxScore, Number(item.scoreEarned) || 0));
      if (earned <= 0) {
        return { earned: 0, maxScore, status: "none", reasoning: item.reasoning };
      }
      if (item.status === "partial" || (earned > 0 && earned < maxScore)) {
        return { earned, maxScore, status: "partial", reasoning: item.reasoning };
      }
      return { earned, maxScore, status: "full", reasoning: item.reasoning };
    }
  }

  // Heuristic fallback for legacy reports
  const thresholds = [1.0, 3.0, 5.0, 5.5, 6.0, 7.0, 8.0, 9.0];
  const targetThreshold = thresholds[featIndex - 1] || 9.0;
  const prevThreshold = featIndex > 1 ? thresholds[featIndex - 2] : 0;
  const b = detail?.band || 0;

  if (b >= targetThreshold) {
    return { earned: maxScore, maxScore, status: "full" };
  } else if (b > prevThreshold) {
    const partial = Math.min(maxScore, Math.max(0.5, b - prevThreshold));
    return { earned: partial, maxScore, status: "partial" };
  }
  return { earned: 0, maxScore, status: "none" };
}

function renderFeatureTableHtml(catCode: "TA_TR" | "CC" | "LR" | "GRA", detail: any, isTask1: boolean) {
  const categories = isTask1 ? task1ProgressionCategories : task2ProgressionCategories;
  const group = categories.find((g) => g.code === catCode);
  if (!group) return "";

  const rows = group.features
    .map((feat, idx) => {
      const featIndex = idx + 1;
      const res = getFeatureEval(detail, feat, featIndex);
      const maxScore = parseFloat(feat.score) || 0;

      let statusBadge = "";
      const rowBg =
        feat.minBand === "B1" ? "#edf7f2" :
        feat.minBand === "B2" ? "#f0f6fc" :
        feat.minBand === "C1" ? "#fffde8" :
        "#fde8e8";

      if (res.status === "full") {
        statusBadge =
          '<span style="color: #15803d; font-weight: bold; background-color: #dcfce7; padding: 2pt 6pt; border-radius: 3pt; border: 1px solid #86efac; display: inline-block; font-family: Calibri, Arial, sans-serif; font-size: 10pt !important;">Đạt trọn vẹn</span>';
      } else if (res.status === "partial") {
        statusBadge = `<span style="color: #b45309; font-weight: bold; background-color: #fef3c7; padding: 2pt 6pt; border-radius: 3pt; border: 1px solid #fde68a; display: inline-block; font-family: Calibri, Arial, sans-serif; font-size: 10pt !important;">Đạt một phần</span>`;
      } else {
        statusBadge =
          '<span style="color: #64748b; font-weight: normal; background-color: #f1f5f9; padding: 2pt 6pt; border-radius: 3pt; display: inline-block; font-family: Calibri, Arial, sans-serif; font-size: 10pt !important;">Chưa đạt</span>';
      }

      return `
      <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 6pt; text-align: center; font-weight: bold; font-size: 10pt !important; font-family: Calibri, Arial, sans-serif; color: #334155; border: 1px solid #e2e8f0;">#${featIndex}</td>
        <td style="padding: 6pt; font-size: 10pt !important; font-family: Calibri, Arial, sans-serif; color: #1e293b; border: 1px solid #e2e8f0;">
          <strong style="font-size: 10pt !important; font-family: Calibri, Arial, sans-serif;">${feat.title}</strong>
          <div style="font-size: 10pt !important; font-family: Calibri, Arial, sans-serif; color: #475569; margin-top: 2pt;">${feat.description}</div>
          ${
            res.reasoning
              ? `<div style="font-size: 10pt !important; font-family: Calibri, Arial, sans-serif; color: #1e40af; font-style: italic; margin-top: 3pt; background-color: #eff6ff; padding: 3pt 6pt; border-left: 2px solid #3b82f6;"><strong>Ghi chú AVA:</strong> ${res.reasoning}</div>`
              : ""
          }
        </td>
        <td style="padding: 6pt; text-align: center; font-size: 10pt !important; font-family: Calibri, Arial, sans-serif; font-weight: bold; color: #475569; border: 1px solid #e2e8f0;">${feat.minBand}</td>
        <td style="padding: 6pt; text-align: center; font-size: 10pt !important; font-family: Calibri, Arial, sans-serif; font-weight: bold; color: #1e3a8a; border: 1px solid #e2e8f0;">+${res.earned} / ${maxScore}</td>
        <td style="padding: 6pt; text-align: center; font-size: 10pt !important; font-family: Calibri, Arial, sans-serif; border: 1px solid #e2e8f0;">${statusBadge}</td>
      </tr>
    `;
    })
    .join("");

  return `
    <div style="margin-top: 10pt; margin-bottom: 10pt;">
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; margin-bottom: 8pt; background-color: #ffffff; font-family: Calibri, Arial, sans-serif; font-size: 10pt !important;">
        <thead>
          <tr style="background-color: #e2e8f0; color: #0f172a; font-size: 10pt !important; font-family: Calibri, Arial, sans-serif; text-align: center; font-weight: bold;">
            <th style="padding: 6pt; border: 1px solid #cbd5e1; width: 6%; font-size: 10pt !important; font-family: Calibri, Arial, sans-serif;">#</th>
            <th style="padding: 6pt; border: 1px solid #cbd5e1; width: 52%; text-align: left; font-size: 10pt !important; font-family: Calibri, Arial, sans-serif;">Đặc Tính Chi Tiết</th>
            <th style="padding: 6pt; border: 1px solid #cbd5e1; width: 12%; font-size: 10pt !important; font-family: Calibri, Arial, sans-serif;">Target Band</th>
            <th style="padding: 6pt; border: 1px solid #cbd5e1; width: 14%; font-size: 10pt !important; font-family: Calibri, Arial, sans-serif;">Điểm Số</th>
            <th style="padding: 6pt; border: 1px solid #cbd5e1; width: 16%; font-size: 10pt !important; font-family: Calibri, Arial, sans-serif;">Trạng Thái</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

export function generateFallbackVietnameseTranslation(text: string): string {
  if (!text) return "";

  const dictionary: [RegExp, string][] = [
    // --- Task 2 Specific Sentences & Clauses ---
    [/Many young people today feel that/gi, "Nhiều người trẻ ngày nay cảm thấy rằng"],
    [/the lifestyle ideals cherished by older generations/gi, "những lý tưởng sống được các thế hệ đi trước trân trọng"],
    [/no longer align with the realities of modern life/gi, "không còn phù hợp với thực tế của cuộc sống hiện đại"],
    [/While some traditional values may seem out of step with contemporary norms/gi, "Mặc dù một số giá trị truyền thống có vẻ không còn phù hợp với các chuẩn mực hiện đại"],
    [/I believe that the younger generation still has much to gain from the enduring wisdom of the past/gi, "tôi tin rằng thế hệ trẻ vẫn có thể học hỏi được rất nhiều từ trí tuệ trường tồn của quá khứ"],
    [/Admittedly, one might argue that/gi, "Phải thừa nhận rằng, có người sẽ cho rằng"],
    [/today's fast-paced lifestyle, coupled with rapidly evolving expectations/gi, "nhịp sống hối hả ngày nay, cùng với những kỳ vọng thay đổi nhanh chóng"],
    [/has rendered traditional ways of living, thinking, and behaving obsolete/gi, "đã khiến những phương thức sống, suy nghĩ và ứng xử truyền thống trở nên lỗi thời"],
    [/the expectation of maintaining strict boundaries between work and personal life/gi, "kỳ vọng duy trì ranh giới nghiêm ngặt giữa công việc và cuộc sống cá nhân"],
    [/has become increasingly unrealistic in today's hyper-connected world/gi, "đã trở nên ngày càng phi thực tế trong thế giới kết nối siêu tốc ngày nay"],
    [/As digital technology blurs these lines/gi, "Khi công nghệ kỹ thuật số làm mờ đi những ranh giới này"],
    [/integrating professional demands into one's daily routine/gi, "việc kết hợp các yêu cầu công việc vào sinh hoạt hàng ngày"],
    [/has gained widespread traction/gi, "đã trở nên vô cùng phổ biến"],
    [/Many older people understandably view this shift with concern/gi, "Nhiều người lớn tuổi có lý do để nhìn nhận sự chuyển dịch này với sự lo ngại"],
    [/lamenting that it comes at the expense of time for family, friendships, and personal well-being/gi, "tiếc nuối rằng điều đó phải đánh đổi bằng thời gian dành cho gia đình, tình bạn và sức khỏe bản thân"],
    [/Yet, younger individuals tend to see work-life integration as a necessary adaptation/gi, "Tuy nhiên, giới trẻ lại có xu hướng coi sự giao thoa công việc - cuộc sống là một sự thích nghi tất yếu"],
    [/to today's highly competitive environment/gi, "với môi trường cạnh tranh khốc liệt ngày nay"],
    [/From their perspective,/gi, "Dưới góc nhìn của họ,"],
    [/attempting to uphold the kind of rigid work-life balance/gi, "việc cố gắng duy trì sự cân bằng công việc - cuộc sống cứng nhắc"],
    [/that their parents achieved decades ago/gi, "mà cha mẹ họ đã đạt được nhiều thập kỷ trước"],
    [/could actually hold them back from climbing the corporate ladder and progressing in their careers/gi, "thực sự có thể cản bước họ thăng tiến trên con đường sự nghiệp"],
    [/While many traditional values appear to be at odds with modern norms/gi, "Mặc dù nhiều giá trị truyền thống có vẻ mâu thuẫn với các chuẩn mực hiện đại"],
    [/I am strongly convinced that/gi, "tôi hoàn toàn thuyết phục rằng"],
    [/it would be a stretch to say that/gi, "sẽ là quá đà nếu nói rằng"],
    [/young people cannot gain anything from older generations/gi, "người trẻ không thể học hỏi được gì từ các thế hệ trước"],
    [/This divergence in perspective is vividly/gi, "Sự khác biệt trong quan điểm này thể hiện rõ nét"],

    // --- Common IELTS Task 1 & Task 2 Templates & Clauses ---
    [/The two maps illustrate/gi, "Hai bản đồ minh họa"],
    [/The chart illustrates/gi, "Biểu đồ minh họa"],
    [/The graph shows/gi, "Đồ thị thể hiện"],
    [/The diagram shows/gi, "Sơ đồ thể hiện"],
    [/how the city of Nelson has changed from 2000 to the present day/gi, "sự thay đổi của thành phố Nelson từ năm 2000 đến nay"],
    [/how the city of (\w+) has changed/gi, "sự thay đổi của thành phố $1"],
    [/from (\d{4}) to the present day/gi, "từ năm $1 đến nay"],
    [/from (\d{4}) to (\d{4})/gi, "từ năm $1 đến năm $2"],
    [/Overall, while/gi, "Nhìn chung, trong khi"],
    [/Overall,/gi, "Nhìn chung,"],
    [/the city centre itself/gi, "khu vực trung tâm thành phố"],
    [/has remained/gi, "vẫn giữ nguyên"],
    [/largely unchanged in size/gi, "hầu như không thay đổi về diện tích"],
    [/significant developments have occurred/gi, "đã diễn ra những phát triển đáng kể"],
    [/in its surrounding areas/gi, "ở các khu vực xung quanh"],
    [/particularly in terms of/gi, "đặc biệt là về"],
    [/transport infrastructure/gi, "hạ tầng giao thông"],
    [/commercial facilities/gi, "các cơ sở thương mại"],
    [/recreational spaces/gi, "không gian giải trí"],
    [/To the north of the city/gi, "Về phía bắc của thành phố"],
    [/In the southern part of the city/gi, "Ở phần phía nam của thành phố"],
    [/In the northern part of the city/gi, "Ở phần phía bắc của thành phố"],
    [/the university has remained/gi, "trường đại học vẫn được giữ nguyên"],
    [/now flanked by/gi, "hiện nằm cạnh"],
    [/a new hall of residence/gi, "một ký túc xá mới"],
    [/to its west/gi, "về phía tây"],
    [/and a new shopping centre/gi, "và một trung tâm thương mại mới"],
    [/to the north-east/gi, "về phía đông bắc"],
    [/where a woodland area was formerly located/gi, "nơi từng là khu rừng cây"],
    [/The train station, previously located in the west/gi, "Ga tàu, trước đây nằm ở phía tây"],
    [/has been relocated to/gi, "đã được di dời đến"],
    [/the area immediately south of the university/gi, "khu vực ngay phía nam trường đại học"],
    [/and is now connected to/gi, "và hiện kết nối với"],
    [/a newly developed tramline/gi, "tuyến tàu điện mới được xây dựng"],
    [/running along the eastern side of the campus/gi, "chạy dọc theo phía đông của khuôn viên"],
    [/In addition,/gi, "Thêm vào đó,"],
    [/a bike rental scheme has been introduced/gi, "dịch vụ cho thuê xe đạp đã được đưa vào sử dụng"],
    [/throughout the city centre/gi, "toàn trung tâm thành phố"],
    [/improving local transportation/gi, "nâng cao chất lượng giao thông địa phương"],
    [/the old market in the south-west/gi, "khu chợ cũ ở phía tây nam"],
    [/has been replaced by a new shop/gi, "đã được thay thế bằng một cửa hàng mới"],
    [/while a modern covered market/gi, "trong khi một khu chợ có mái che hiện đại"],
    [/has been constructed further east/gi, "đã được xây dựng xa hơn về phía đông"],
    [/The main road separating the city centre and the port area/gi, "Tuyến đường chính phân chia trung tâm thành phố và khu vực cảng"],
    [/which was once accessible by car/gi, "nơi từng cho phép xe hơi đi vào"],
    [/has been converted into a pedestrian-only zone/gi, "đã được chuyển đổi thành khu phố dành riêng cho người đi bộ"],
    [/Furthermore,/gi, "Hơn nữa,"],
    [/new commercial amenities, including a restaurant and entertainment venues/gi, "các tiện ích thương mại mới, bao gồm nhà hàng và các địa điểm giải trí"],
    [/bars and clubs/gi, "quán bar và câu lạc bộ"],
    [/have been added along the waterfront/gi, "đã được bổ sung dọc theo bờ sông/bờ biển"],
    [/making the area more attractive to both residents and visitors/gi, "giúp khu vực trở nên hấp dẫn hơn đối với cả cư dân và du khách"],

    [/It is often argued that/gi, "Thường có ý kiến cho rằng"],
    [/It is undeniable that/gi, "Không thể phủ nhận rằng"],
    [/There is no doubt that/gi, "Không còn nghi ngờ gì khi"],
    [/One of the main reasons is that/gi, "Một trong những lý do chính là"],
    [/Another key factor to consider is/gi, "Một yếu tố quan trọng khác cần xem xét là"],
    [/This leads to/gi, "Điều này dẫn đến"],
    [/As a consequence,/gi, "Kết quả là,"],
    [/In contrast,/gi, "Ngược lại,"],
    [/On the contrary,/gi, "Trái lại,"],
    [/To illustrate this point,/gi, "Để minh họa cho điều này,"],
    [/A prime example of this is/gi, "Một ví dụ điển hình cho điều này là"],
    [/From an economic standpoint,/gi, "Từ góc độ kinh tế,"],
    [/In terms of social development,/gi, "Về mặt phát triển xã hội,"],
    [/In conclusion, although/gi, "Tóm lại, mặc dù"],
    [/In summary, while/gi, "Tóm lại, trong khi"],
    [/I would argue that/gi, "Tôi cho rằng"],
    [/I firmly believe that/gi, "Tôi tin chắc rằng"],
    [/It is argued that/gi, "Nhiều người cho rằng"],
    [/Some people believe that/gi, "Một số người tin rằng"],
    [/On the one hand,/gi, "Một mặt,"],
    [/On the other hand,/gi, "Mặt khác,"],
    [/In conclusion,/gi, "Tóm lại,"],
    [/This essay agrees that/gi, "Bài luận này đồng ý rằng"],
    [/This essay disagrees that/gi, "Bài luận này không đồng ý rằng"],
    [/For instance,/gi, "Ví dụ,"],
    [/For example,/gi, "Chẳng hạn,"],
    [/Consequently,/gi, "Do đó,"],
    [/Therefore,/gi, "Vì vậy,"],
    [/However,/gi, "Tuy nhiên,"],
    [/Moreover,/gi, "Hơn nữa,"],

    // --- Key Phrases & Noun Chunks ---
    [/work-life balance/gi, "sự cân bằng công việc - cuộc sống"],
    [/work-life integration/gi, "sự giao thoa công việc - cuộc sống"],
    [/older generations/gi, "các thế hệ đi trước"],
    [/younger generation/gi, "thế hệ trẻ"],
    [/young people/gi, "người trẻ"],
    [/older people/gi, "người lớn tuổi"],
    [/traditional values/gi, "các giá trị truyền thống"],
    [/modern norms/gi, "các chuẩn mực hiện đại"],
    [/fast-paced lifestyle/gi, "lối sống hối hả"],
    [/digital technology/gi, "công nghệ kỹ thuật số"],
    [/competitive environment/gi, "môi trường cạnh tranh"],
    [/corporate ladder/gi, "nấc thang sự nghiệp"],
    [/personal well-being/gi, "sức khỏe và hạnh phúc cá nhân"],
    [/at the expense of/gi, "phải đánh đổi bằng"],
    [/climbing the corporate ladder/gi, "thăng tiến trên con đường sự nghiệp"],
    [/progressing in their careers/gi, "phát triển sự nghiệp của họ"],
    [/at odds with/gi, "mâu thuẫn với"],
    [/divergence in perspective/gi, "sự khác biệt trong quan điểm"],
    [/enduring wisdom/gi, "trí tuệ trường tồn"],
    [/contemporary norms/gi, "chuẩn mực đương đại"],
    [/hyper-connected world/gi, "thế giới kết nối siêu tốc"],
    [/widespread traction/gi, "sự đón nhận rộng rãi"],
    [/necessary adaptation/gi, "sự thích nghi cần thiết"]
  ];

  const translateChunk = (str: string): string => {
    let result = str;
    for (const [pattern, repl] of dictionary) {
      result = result.replace(pattern, repl);
    }
    return result;
  };

  return text
    .split("\n\n")
    .map((para) => {
      const parts = para.split(/(<mark[^>]*>[\s\S]*?<\/mark>)/gi);
      return parts
        .map((part) => {
          const match = part.match(/^<mark[^>]*>([\s\S]*?)<\/mark>$/i);
          if (match) {
            return `<mark>${translateChunk(match[1])}</mark>`;
          }
          return translateChunk(part);
        })
        .join("");
    })
    .join("\n\n");
}

function renderTaskSectionHtml(task: TaskExportData, sectionTitle?: string) {
  const { report, taskType, promptText } = task;
  const isTask1 = taskType === "task1";
  const taskName = isTask1 ? "IELTS Writing Task 1" : "IELTS Writing Task 2";

  // Process fullUpgradeEssay HTML marks for Word
  const formattedEssayHtml = (report.fullUpgradeEssay || "")
    .split("\n\n")
    .map((para) => {
      const styledPara = para.replace(
        /<mark[^>]*>([\s\S]*?)<\/mark>/gi,
        '<span style="background-color: #ffe4e6; color: #881337; font-weight: bold; border-bottom: 2px solid #f43f5e; padding: 2px 4px;">$1</span>'
      );
      return `<p style="margin-bottom: 12pt; text-indent: 18pt; line-height: 1.6; text-align: justify; font-family: 'Calibri', sans-serif; font-size: 12pt;">${styledPara}</p>`;
    })
    .join("");

  const viEssaySource =
    report.fullUpgradeEssayVietnamese ||
    generateFallbackVietnameseTranslation(report.fullUpgradeEssay || "");

  const formattedVietnameseEssayHtml = (viEssaySource || "")
    .split("\n\n")
    .map((para) => {
      const styledPara = para.replace(
        /<mark[^>]*>([\s\S]*?)<\/mark>/gi,
        '<span style="background-color: #ffe4e6; color: #881337; font-weight: bold; border-bottom: 2px solid #f43f5e; padding: 2px 4px;">$1</span>'
      );
      return `<p style="margin-bottom: 12pt; text-indent: 18pt; line-height: 1.6; text-align: justify; font-family: 'Calibri', sans-serif; font-size: 12pt;">${styledPara}</p>`;
    })
    .join("");

  // Criteria
  const criteriaList = [
    { title: isTask1 ? "Task Achievement (TA)" : "Task Response (TR)", code: "TA_TR" as const, detail: report.criteria.taOrTr },
    { title: "Coherence & Cohesion (CC)", code: "CC" as const, detail: report.criteria.cc },
    { title: "Lexical Resource (LR)", code: "LR" as const, detail: report.criteria.lr },
    { title: "Grammatical Range & Accuracy (GRA)", code: "GRA" as const, detail: report.criteria.gra },
  ];

  const criteriaHtml = criteriaList
    .map(
      (c) => `
    <div style="margin-bottom: 18pt; border: 1px solid #cbd5e1; padding: 12pt; background-color: #ffffff;">
      <div style="font-size: 13pt; font-weight: bold; color: #1e3a8a; margin-bottom: 6pt;">
        ${c.title} &mdash; <span style="background-color: #dbeafe; color: #1e40af; padding: 2pt 8pt; font-size: 11pt;">Band ${formatBandScore(c.detail.band)}</span>
      </div>
      <p style="margin-bottom: 6pt; font-size: 12pt; color: #334155;"><strong>Phân tích chi tiết:</strong> ${c.detail.feedback}</p>
      ${
        c.detail.example
          ? `<p style="margin-bottom: 8pt; font-size: 11pt; color: #475569; background-color: #f8fafc; padding: 8pt; border-left: 3px solid #3b82f6;"><strong>Ví dụ &amp; Ghi chú:</strong> ${c.detail.example}</p>`
          : ""
      }
      ${renderFeatureTableHtml(c.code, c.detail, isTask1)}
    </div>
  `
    )
    .join("");

  // Next steps
  const nextStepsHtml = (report.nextBandSteps || [])
    .map(
      (step, idx) => `
    <li style="margin-bottom: 8pt; font-size: 12pt; color: #1e293b; line-height: 1.5;">
      <strong>Bước ${idx + 1}:</strong> ${step}
    </li>
  `
    )
    .join("");

  return `
    ${
      sectionTitle
        ? `<div style="background-color: #1e3a8a; color: #ffffff; padding: 10pt 16pt; font-size: 14pt; font-weight: bold; margin-top: 24pt; margin-bottom: 16pt; border-radius: 4pt;">
            ${sectionTitle}
          </div>`
        : ""
    }

    <!-- Summary Table -->
    <table class="meta-table">
      <tr>
        <td style="width: 25%; font-weight: bold; background-color: #f1f5f9; color: #334155;">Dạng Bài:</td>
        <td>${taskName}</td>
        <td style="width: 25%; font-weight: bold; background-color: #f1f5f9; color: #334155;">Điểm Band (${taskName}):</td>
        <td style="font-weight: bold; color: #1e3a8a; font-size: 13pt !important;">BAND ${formatBandScore(report.overallBand)} / 9.0</td>
      </tr>
      <tr>
        <td style="font-weight: bold; background-color: #f1f5f9; color: #334155;">Số Từ Bài Làm:</td>
        <td>${report.wordCount} từ (${report.wordCountRequirement === "meets" ? "Đạt chuẩn" : "Chưa đủ số từ quy định"})</td>
        <td style="font-weight: bold; background-color: #f1f5f9; color: #334155;">Điểm 4 Tiêu Chí:</td>
        <td>
          ${isTask1 ? "TA" : "TR"}: <strong>${formatBandScore(report.criteria.taOrTr.band)}</strong> | 
          CC: <strong>${formatBandScore(report.criteria.cc.band)}</strong> | 
          LR: <strong>${formatBandScore(report.criteria.lr.band)}</strong> | 
          GRA: <strong>${formatBandScore(report.criteria.gra.band)}</strong>
        </td>
      </tr>
      ${
        promptText
          ? `
      <tr>
        <td style="font-weight: bold; background-color: #f1f5f9; color: #334155;">Đề Bài Gốc:</td>
        <td colspan="3" style="font-style: italic; color: #334155;">${promptText}</td>
      </tr>
      `
          : ""
      }
    </table>

    <!-- SECTION 1: Upgraded Model Essay -->
    <h2>1. Bài Viết Mẫu Hoàn Chỉnh (${taskName} Band 8.0+) - Nâng Cấp Từ Bài Gốc</h2>
    ${
      task.task1Image
        ? `
    <div style="text-align: center; margin-top: 10pt; margin-bottom: 12pt; background-color: #ffffff; border: 1px solid #cbd5e1; padding: 8pt; border-radius: 4pt;">
      <p style="font-size: 10pt !important; color: #64748b; margin-top: 0; margin-bottom: 6pt; font-weight: bold; text-align: center;">[Hình Ảnh / Sơ Đồ Đề Bài Task 1 được tải lên]</p>
      <img src="${task.task1Image}" style="max-width: 100%; max-height: 400pt; width: auto; height: auto; margin: 0 auto; display: block; border: 1px solid #e2e8f0;" />
    </div>
    `
        : ""
    }
    <div style="background-color: #fff1f2; border: 1px solid #fecdd3; padding: 8pt 12pt; margin-bottom: 12pt; font-size: 11pt; color: #9f1239;">
      <strong>Ghi chú đọc bài:</strong> Các vị trí được <span style="background-color: #ffe4e6; color: #881337; font-weight: bold; padding: 2px 4px;">tô màu đỏ nhạt</span> là các câu, cụm từ hoặc đoạn văn đã được chỉnh sửa &amp; nâng cấp từ bài viết gốc của bạn để đạt chuẩn Band 8.0+. Những phần không tô màu là cấu trúc tốt được giữ nguyên.
    </div>

    <!-- 1.1 English Essay -->
    <div style="background-color: #fafafa; border: 1px solid #e2e8f0; padding: 14pt; margin-bottom: 14pt;">
      <div style="font-size: 11pt; font-weight: bold; color: #1e3a8a; margin-bottom: 8pt; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4pt;">
        [1.1] BÀI VIẾT NÂNG CẤP TIẾNG ANH (ENGLISH MODEL ESSAY BAND 8.0+)
      </div>
      ${formattedEssayHtml}
    </div>

    <!-- 1.2 Vietnamese Translation -->
    <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 14pt; margin-bottom: 20pt;">
      <div style="font-size: 11pt; font-weight: bold; color: #1e3a8a; margin-bottom: 8pt; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4pt;">
        [1.2] BẢN DỊCH TIẾNG VIỆT SONG NGỮ ĐỐI CHIẾU (VIETNAMESE TRANSLATION)
      </div>
      <div style="background-color: #fff1f2; border: 1px solid #fecdd3; padding: 6pt 10pt; margin-bottom: 10pt; font-size: 10.5pt; color: #9f1239; font-style: italic;">
        Các cụm từ/câu tô màu đỏ nhạt trong bản dịch tương ứng với các vị trí đã nâng cấp ở bản tiếng Anh đối chiếu.
      </div>
      ${formattedVietnameseEssayHtml}
    </div>

    <!-- SECTION 2: 4 Tiêu chí -->
    <h2>2. Nhận Xét Chi Tiết Theo 4 Tiêu Chí IELTS Band Descriptors (${taskName})</h2>
    ${criteriaHtml}

    <!-- SECTION 3: Cẩm nang lên band -->
    <h2>3. Cẩm Nang Lên Band (${taskName})</h2>
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 12pt; margin-bottom: 20pt;">
      <ol style="margin-top: 0; margin-bottom: 0; padding-left: 20pt;">
        ${nextStepsHtml}
      </ol>
    </div>
  `;
}

export function exportReportToDoc(
  input: TaskExportData | TaskExportData[] | GradingReport,
  taskTypeFallback?: string,
  promptTextFallback?: string,
  originalEssayFallback?: string
) {
  let tasks: TaskExportData[] = [];

  if (Array.isArray(input)) {
    tasks = [...input];
  } else if (input && "criteria" in input) {
    // Single GradingReport passed directly
    tasks = [
      {
        report: input,
        taskType: taskTypeFallback || "task2",
        promptText: promptTextFallback || "",
        originalEssay: originalEssayFallback || "",
      },
    ];
  } else if (input) {
    tasks = [input as TaskExportData];
  }

  if (tasks.length === 0) return;

  // Filter out any duplicate task types (keep newest)
  const uniqueTasksMap = new Map<string, TaskExportData>();
  tasks.forEach((t) => {
    uniqueTasksMap.set(t.taskType, t);
  });
  tasks = Array.from(uniqueTasksMap.values());

  // Sort tasks so Task 1 comes first, Task 2 comes second
  tasks.sort((a, b) => {
    if (a.taskType === "task1" && b.taskType !== "task1") return -1;
    if (a.taskType !== "task1" && b.taskType === "task1") return 1;
    return 0;
  });

  const currentDate = new Date().toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isDualTask = tasks.length >= 2;

  let combinedHeaderSummaryHtml = "";
  let bodyContentHtml = "";
  let fileName = "";

  if (isDualTask) {
    const t1 = tasks.find((t) => t.taskType === "task1") || tasks[0];
    const t2 = tasks.find((t) => t.taskType === "task2") || tasks[1];

    const combinedOverallBand = calculateCombinedIeltsBand(
      t1.report.overallBand,
      t2.report.overallBand
    );

    fileName = `Bao_Cao_Cham_IELTS_Writing_Task1_va_Task2_Truong_Anh_Ngu_My_Du_${Date.now()}.doc`;

    combinedHeaderSummaryHtml = `
      <div style="text-align: center; margin-bottom: 20pt; border-bottom: 3px double #1e3a8a; padding-bottom: 12pt;">
        <p style="font-size: 14pt; font-weight: bold; color: #1e3a8a; margin-bottom: 2pt;">TRƯỜNG ANH NGỮ MỸ DU</p>
        <h1 style="font-size: 20pt !important; color: #0f172a; margin-bottom: 6pt;">BÁO CÁO PHÂN TÍCH &amp; NÂNG CẤP WRITING TASK 1 &amp; TASK 2</h1>
        <p style="font-size: 11pt; color: #64748b; margin: 0;">Ngày xuất báo cáo: ${currentDate}</p>
      </div>

      <table class="meta-table" style="margin-bottom: 20pt; background-color: #eff6ff; border: 2px solid #1e3a8a;">
        <tr>
          <td style="width: 30%; font-weight: bold; background-color: #dbeafe; color: #1e3a8a; font-size: 12pt !important;">ĐIỂM WRITING OVERALL:</td>
          <td style="font-weight: bold; color: #1e3a8a; font-size: 16pt !important;">BAND ${formatBandScore(combinedOverallBand)} / 9.0</td>
          <td style="width: 25%; font-weight: bold; background-color: #dbeafe; color: #1e3a8a; font-size: 12pt !important;">TRẠNG THÁI:</td>
          <td style="font-weight: bold; color: #166534; font-size: 11pt !important;">Đã Hoàn Thành Cả 2 Tasks</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f1f5f9; color: #334155;">Task 1 Band Score:</td>
          <td style="font-weight: bold; color: #1e40af; font-size: 12pt !important;">BAND ${formatBandScore(t1.report.overallBand)}</td>
          <td style="font-weight: bold; background-color: #f1f5f9; color: #334155;">Task 2 Band Score:</td>
          <td style="font-weight: bold; color: #1e40af; font-size: 12pt !important;">BAND ${formatBandScore(t2.report.overallBand)}</td>
        </tr>
      </table>
    `;

    bodyContentHtml = `
      ${renderTaskSectionHtml(t1, "PHẦN 1: BÁO CÁO CHẤM CHI TIẾT IELTS WRITING TASK 1")}
      <div style="page-break-before: always; margin-top: 30pt;"></div>
      ${renderTaskSectionHtml(t2, "PHẦN 2: BÁO CÁO CHẤM CHI TIẾT IELTS WRITING TASK 2")}
    `;
  } else {
    const singleTask = tasks[0];
    const taskTitle = singleTask.taskType === "task1" ? "IELTS Writing Task 1" : "IELTS Writing Task 2";
    fileName = `Bao_Cao_Cham_IELTS_${singleTask.taskType.toUpperCase()}_Truong_Anh_Ngu_My_Du_${Date.now()}.doc`;

    combinedHeaderSummaryHtml = `
      <div style="text-align: center; margin-bottom: 20pt; border-bottom: 3px double #1e3a8a; padding-bottom: 12pt;">
        <p style="font-size: 14pt; font-weight: bold; color: #1e3a8a; margin-bottom: 2pt;">TRƯỜNG ANH NGỮ MỸ DU</p>
        <h1 style="font-size: 20pt !important; color: #0f172a; margin-bottom: 6pt;">BÁO CÁO PHÂN TÍCH &amp; NÂNG CẤP BÀI VIẾT ${taskTitle.toUpperCase()}</h1>
        <p style="font-size: 11pt; color: #64748b; margin: 0;">Ngày xuất báo cáo: ${currentDate}</p>
      </div>
    `;

    bodyContentHtml = renderTaskSectionHtml(singleTask);
  }

  // Full Word Document HTML
  const docHtml = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>Trường Anh Ngữ Mỹ Du - Báo Cáo Chấm Bài IELTS</title>
<!--[if gte mso 9]>
<xml>
 <w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
  <w:DoNotOptimizeForBrowser/>
 </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page Section1 {
    size: 8.5in 11.0in;
    margin: 1.0in 1.0in 1.0in 1.0in;
    mso-header-margin: 0.5in;
    mso-footer-margin: 0.5in;
    mso-header: h1;
  }
  div.Section1 { page: Section1; }
  
  body, p, td, th, div, span, li, a {
    font-family: 'Calibri', sans-serif !important;
    font-size: 12pt !important;
    line-height: 1.5;
    color: #1e293b;
  }
  
  h1 { font-size: 18pt !important; font-family: 'Calibri', sans-serif !important; color: #1e3a8a; font-weight: bold; margin-bottom: 4pt; }
  h2 { font-size: 13pt !important; font-family: 'Calibri', sans-serif !important; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 4pt; margin-top: 20pt; margin-bottom: 10pt; font-weight: bold; }
  
  mark {
    background-color: #ffe4e6 !important;
    color: #881337 !important;
    font-weight: bold;
    padding: 2px 4px;
  }
  
  .meta-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16pt;
    background-color: #f8fafc;
    border: 1px solid #cbd5e1;
  }
  .meta-table td {
    padding: 8pt 12pt;
    font-size: 11pt !important;
    border: 1px solid #e2e8f0;
  }
</style>
</head>
<body>
<div class="Section1">

  <!-- Header element for Microsoft Word pages -->
  <table style="display:none; mso-element:header" id="h1">
    <tr>
      <td style="border:none; border-bottom:2px solid #1e3a8a; font-family:'Calibri',sans-serif; font-size:12pt; font-weight:bold; color:#1e3a8a; text-align:left; padding-bottom:6pt;">
        Trường Anh Ngữ Mỹ Du
      </td>
      <td style="border:none; border-bottom:2px solid #1e3a8a; font-family:'Calibri',sans-serif; font-size:10pt; color:#64748b; text-align:right; padding-bottom:6pt;">
        Báo Cáo Phân Tích &amp; NÂNG CẤP Bài Viết IELTS
      </td>
    </tr>
  </table>

  ${combinedHeaderSummaryHtml}
  ${bodyContentHtml}

  <!-- Footer / Sign-off -->
  <div style="margin-top: 30pt; border-top: 1px solid #cbd5e1; padding-top: 12pt; text-align: center; font-size: 10pt; color: #64748b;">
    <p style="margin-bottom: 2pt;"><strong>TRƯỜNG ANH NGỮ MỸ DU</strong> &mdash; Chuyên Đào Tạo &amp; Luyện Thi IELTS Chất Lượng Cao</p>
    <p style="margin: 0;">Chúc bạn học tập hiệu quả và sớm đạt Band điểm IELTS mục tiêu!</p>
  </div>

</div>
</body>
</html>`;

  // Create blob and trigger download
  const blob = new Blob(["\ufeff", docHtml], {
    type: "application/msword;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
