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

  // 1. Sentence-level map with tags built-in for exact high-frequency Band 9 essays
  const sentenceMap: [RegExp, string][] = [
    // Task 1 Sick Leave Essay Sentences
    [
      /^The line graph compares (?:<mark[^>]*>)?the proportion of employees who took at least a day of sick leave(?:<\/mark>)? in five European nations between 1991 and 2001\.?$/i,
      "Biểu đồ đường so sánh <mark>tỷ lệ nhân viên nghỉ ốm ít nhất một ngày</mark> ở năm quốc gia Châu Âu từ năm 1991 đến năm 2001."
    ],
    [
      /^Overall, (?:<mark[^>]*>)?a clear divergence in trends was observed(?:<\/mark>)?: levels of sickness absence in the Netherlands and Sweden showed a general upward trend, while France's rate declined significantly throughout the period\.?$/i,
      "Nhìn chung, <mark>đã ghi nhận sự phân hóa rõ rệt về xu hướng</mark>: mức độ nghỉ do ốm đau ở Hà Lan và Thụy Điển có xu hướng tăng tổng thể, trong khi tỷ lệ của Pháp giảm đáng kể trong suốt giai đoạn này."
    ],
    [
      /^Meanwhile, the UK and Germany recorded (?:<mark[^>]*>)?the lowest, but most stable, figures(?:<\/mark>)?\.?$/i,
      "Trong khi đó, Vương quốc Anh và Đức ghi nhận <mark>những con số thấp nhất nhưng ổn định nhất</mark>."
    ],
    [
      /^(?:<mark[^>]*>)?Focusing on the highest rates(?:<\/mark>)?[\s,]*the Netherlands consistently recorded the highest illness absence rates in all years, except 1991, when the rate was around 4\.9%, slightly below France's 5%\.?$/i,
      "<mark>Tập trung vào các tỷ lệ cao nhất</mark>, Hà Lan liên tục ghi nhận tỷ lệ nghỉ ốm cao nhất trong tất cả các năm, ngoại trừ năm 1991, khi tỷ lệ này ở mức khoảng 4.9%, thấp hơn một chút so với 5% của Pháp."
    ],
    [
      /^This rate then increased to a peak of roughly 5\.5% in 1992 before falling sharply to a low of about 4% in 1996\.?$/i,
      "Tỷ lệ này sau đó tăng lên mức đỉnh khoảng 5.5% vào năm 1992 trước khi giảm mạnh xuống mức thấp khoảng 4% vào năm 1996."
    ],
    [
      /^From there, (?:<mark[^>]*>)?the figure(?:<\/mark>)? quickly climbed back to its earlier peak by 2001, (?:<mark[^>]*>)?reaching approximately 5\.3%(?:<\/mark>)?\.?$/i,
      "Từ đó, <mark>con số này</mark> nhanh chóng tăng trở lại mức đỉnh trước đó vào năm 2001, <mark>đạt khoảng 5.3%</mark>."
    ],
    [
      /^France and Sweden (?:<mark[^>]*>)?experienced contrasting trends(?:<\/mark>)?\.?$/i,
      "Pháp và Thụy Điển <mark>trải qua những xu hướng trái ngược nhau</mark>."
    ],
    [
      /^In 1991, France recorded the highest absence rate at 5%, while Sweden's rate was lower, at only 3%\.?$/i,
      "Năm 1991, Pháp ghi nhận tỷ lệ nghỉ ốm cao nhất ở mức 5%, trong khi tỷ lệ của Thụy Điển thấp hơn, chỉ ở mức 3%."
    ],
    [
      /^France's figures then decreased significantly and (?:<mark[^>]*>)?were surpassed by Sweden's in 1996(?:<\/mark>)? before stabilizing at close to 3% for the rest of the period\.?$/i,
      "Số liệu của Pháp sau đó giảm đáng kể và <mark>bị Thụy Điển vượt qua vào năm 1996</mark> trước khi ổn định ở mức gần 3% trong phần còn lại của giai đoạn."
    ],
    [
      /^By contrast, after hovering at roughly 3% for the first six years, Sweden's figures increased dramatically, ending the period at nearly 4\.8%, (?:<mark[^>]*>)?a substantial rise of almost 60%(?:<\/mark>)? from its initial (?:point|level)\.?$/i,
      "Trái lại, sau khi dao động ở mức khoảng 3% trong 6 năm đầu, số liệu của Thụy Điển đã tăng vọt, kết thúc giai đoạn ở mức gần 4.8%, <mark>mức tăng đáng kể gần 60%</mark> so với mốc ban đầu."
    ],
    [
      /^Turning to the remaining nations, sickness absence levels in Germany were (?:<mark[^>]*>)?the lowest among the five(?:<\/mark>)?[\s,]*fluctuating around 1\.5% over the decade\.?$/i,
      "Chuyển sang các quốc gia còn lại, mức độ nghỉ do ốm đau ở Đức là <mark>thấp nhất trong số năm nước</mark>, dao động quanh mức 1.5% trong suốt thập kỷ."
    ],
    [
      /^The UK's figures also remained relatively stable, but were slightly higher, at roughly 2\.5%, (?:<mark[^>]*>)?maintaining a consistent gap of about 1% above Germany(?:<\/mark>)? throughout (?:this|the) period\.?$/i,
      "Các con số của Vương quốc Anh cũng giữ ở mức tương đối ổn định, nhưng cao hơn một chút, ở mức khoảng 2.5%, <mark>duy trì khoảng cách ổn định khoảng 1% phía trên Đức</mark> trong suốt giai đoạn này."
    ],

    // Task 2 Lifestyle / Traditional Values Essay Sentences
    [
      /^Many young people today feel that the lifestyle ideals cherished by older generations no longer align with the realities of modern life\.?$/i,
      "Nhiều người trẻ ngày nay cảm thấy rằng những lý tưởng sống được các thế hệ đi trước trân trọng không còn phù hợp với thực tế của cuộc sống hiện đại."
    ],
    [
      /^While some traditional values may seem out of step with contemporary norms, I believe that the younger generation still has much to gain from the enduring wisdom of the past\.?$/i,
      "Mặc dù một số giá trị truyền thống có vẻ không còn phù hợp với các chuẩn mực hiện đại, tôi tin rằng thế hệ trẻ vẫn có thể học hỏi được rất nhiều từ trí tuệ trường tồn của quá khứ."
    ],
    [
      /^Admittedly, (?:the rapid pace of modern life and evolving expectations|one might argue that today's fast-paced lifestyle, coupled with rapidly evolving expectations,) have led some to believe that traditional ways of living, thinking, and behaving are now obsolete\.?$/i,
      "Phải thừa nhận rằng, nhịp sống hối hả của cuộc sống hiện đại cùng với những kỳ vọng không ngừng thay đổi đã khiến nhiều người tin rằng các phương thức sống, suy nghĩ và ứng xử truyền thống giờ đây đã trở nên lỗi thời."
    ],
    [
      /^For example, the expectation of maintaining strict boundaries between work and personal life has become increasingly unrealistic in today's world, where the line separating the two has gradually evaporated, and the notion of integrating work into one's personal routine is gaining widespread traction\.?$/i,
      "Chẳng hạn, kỳ vọng duy trì ranh giới nghiêm ngặt giữa công việc và cuộc sống cá nhân đã trở nên ngày càng phi thực tế trong thế giới ngày nay, nơi ranh giới phân chia giữa cả hai đã dần biến mất, và quan điểm kết hợp công việc vào sinh hoạt cá nhân hàng ngày đang nhận được sự đón nhận rộng rãi."
    ],
    [
      /^Many older people understandably view this shift with concern, lamenting that it comes at the expense of time for family, friendships, and personal well-being\.?$/i,
      "Nhiều người lớn tuổi có lý do để nhìn nhận sự chuyển dịch này với sự lo ngại, tiếc nuối rằng điều đó phải đánh đổi bằng thời gian dành cho gia đình, tình bạn và sức khỏe bản thân."
    ],
    [
      /^Yet, younger individuals tend to see work-life integration as a necessary adaptation to today's highly competitive and demanding environment\.?$/i,
      "Tuy nhiên, giới trẻ lại có xu hướng coi sự giao thoa công việc - cuộc sống là một sự thích nghi tất yếu với môi trường đầy cạnh tranh và đòi hỏi cao ngày nay."
    ],
    [
      /^From their perspective, attempting to uphold the kind of work-life balance that their parents achieved decades ago could actually hold them back from climbing the corporate ladder and progressing in their careers\.?$/i,
      "Dưới góc nhìn của họ, việc cố gắng duy trì sự cân bằng công việc - cuộc sống mà cha mẹ họ đã đạt được nhiều thập kỷ trước thực sự có thể cản bước họ thăng tiến trên con đường sự nghiệp."
    ],
    [
      /^While many traditional values appear to be at odds with modern norms and expectations, I am strongly convinced that it would be a stretch to say that young people cannot gain anything from the way old people live, think, and behave\.?$/i,
      "Mặc dù nhiều giá trị truyền thống có vẻ mâu thuẫn với các chuẩn mực và kỳ vọng hiện đại, tôi hoàn toàn thuyết phục rằng sẽ là quá đà nếu nói rằng người trẻ không thể học hỏi được gì từ cách người lớn tuổi sống, suy nghĩ và ứng xử."
    ],
    [
      /^Take, for instance, the value of work-life balance\.?$/i,
      "Hãy lấy ví dụ về giá trị của sự cân bằng công việc - cuộc sống."
    ],
    [
      /^Beneath this concept lies a durable principle: holistic well-being demands deliberate time for family, rest, and self-reflection\.?$/i,
      "Ẩn đằng sau khái niệm này là một nguyên lý bền vững: sự phát triển toàn diện đòi hỏi thời gian dành riêng cho gia đình, nghỉ ngơi và tự ngẫm suy."
    ],
    [
      /^Young professionals who blur lines too freely, despite achieving significant career milestones, often find themselves grappling with burnout, digital fatigue, and strained relationships\.?$/i,
      "Những người đi làm trẻ tuổi làm mờ ranh giới quá thoải mái, dù đạt được những cột mốc sự nghiệp đáng kể, vẫn thường thấy mình phải đối mặt với tình trạng kiệt sức, mệt mỏi vì công nghệ và các mối quan hệ bị rạn nứt."
    ],
    [
      /^Ironically, these are the very consequences the older insistence on clear demarcation aimed to pre-empt\.?$/i,
      "Mỉa mai thay, đây chính là những hậu quả mà sự kiên trì của thế hệ đi trước về việc phân chia ranh giới rõ ràng nhằm mục đích ngăn chặn từ trước."
    ],
    [
      /^While the form of such values must evolve, the underlying value of maintaining equilibrium among multiple life domains retains its relevance\.?$/i,
      "Mặc dù hình thức của các giá trị đó phải tiến hóa, giá trị cốt lõi của việc duy trì sự cân bằng giữa nhiều khía cạnh cuộc sống vẫn giữ nguyên giá trị."
    ],
    [
      /^This is just one among countless examples showing how the younger generation can still draw valuable wisdom from those who came before them\.?$/i,
      "Đây chỉ là một trong vô số ví dụ cho thấy thế hệ trẻ vẫn có thể rút ra những trí tuệ vô giá từ những người đi trước."
    ],
    [
      /^In conclusion, while on the surface traditional ways of life appear not to mesh with the tempo of contemporary life, I believe that the core insights embedded in them remain invaluable\.?$/i,
      "Tóm lại, mặc dù về mặt bề ngoài các phương thức sống truyền thống có vẻ không ăn khớp với nhịp sống của cuộc sống đương đại, tôi tin rằng những tri thức cốt lõi ẩn chứa trong đó vẫn giữ nguyên giá trị vô giá."
    ],
    [
      /^Younger generations can derive significant benefits from critically engaging with the wisdom of their elders, adapting enduring principles to navigate the fluid and often challenging realities of the modern world\.?$/i,
      "Thế hệ trẻ có thể thu nhận những lợi ích to lớn từ việc tiếp thu có chọn lọc trí tuệ của người lớn tuổi, thích ứng các nguyên lý trường tồn để chèo lái qua những thực tế biến động và đầy thách thức của thế giới hiện đại."
    ],

    // Task 2 Advertising Essay Sentences
    [
      /^The prevalence of advertising in modern society has escalated significantly, fueling a contentious debate regarding its overall societal impact\.?$/i,
      "Sự phổ biến của quảng cáo trong xã hội hiện đại đã gia tăng đáng kể, kích hoạt một cuộc tranh luận sôi nổi về tác động tổng thể của nó đối với xã hội."
    ],
    [
      /^While commercial promotion offers clear economic utility and consumer guidance, I firmly believe that these benefits are outweighed by severe invasions of privacy and the promotion of unhealthy consumerism\.?$/i,
      "Mặc dù quảng cáo thương mại mang lại tiện ích kinh tế rõ ràng và sự hướng dẫn cho người tiêu dùng, tôi tin chắc rằng những lợi ích này bị lấn áp bởi sự xâm phạm nghiêm trọng đến quyền riêng tư và việc thúc đẩy chủ nghĩa tiêu dùng không lành mạnh."
    ],
    [
      /^On the one hand, advertising functions as a vital engine for commerce by bridging the gap between producers and buyers\.?$/i,
      "Một mặt, quảng cáo đóng vai trò như một động cơ thiết yếu cho thương mại bằng cách cầu nối khoảng cách giữa nhà sản xuất và người mua."
    ],
    [
      /^Commercial campaigns allow enterprises to broadcast product specifications, pricing models, and core innovations to a broad demographic\.?$/i,
      "Các chiến dịch thương mại cho phép doanh nghiệp truyền tải thông số sản phẩm, mô hình giá cả và các cải tiến cốt lõi đến đông đảo công chúng."
    ],
    [
      /^This systematic exposure not only drives corporate growth and market competition, but it also equips shoppers with practical data necessary to evaluate choices and secure favorable value\.?$/i,
      "Sự tiếp cận có hệ thống này không chỉ thúc đẩy sự tăng trưởng của doanh nghiệp và cạnh tranh thị trường, mà còn trang bị cho người mua dữ liệu thực tế cần thiết để đánh giá lựa chọn và đạt được giá trị tối ưu."
    ],
    [
      /^Consequently, the informational framework of marketing can optimize household budgeting and consumer awareness under optimal conditions\.?$/i,
      "Do đó, khung thông tin của tiếp thị có thể tối ưu hóa việc quản lý ngân sách gia đình và nhận thức của người tiêu dùng trong điều kiện tối ưu."
    ],
    [
      /^On the other hand, the pervasive nature of contemporary marketing introduces profound drawbacks concerning personal boundaries and psychological well-being\.?$/i,
      "Mặt khác, tính chất lan rộng của tiếp thị hiện đại mang lại những hạn chế sâu sắc liên quan đến ranh giới cá nhân và sức khỏe tâm lý."
    ],
    [
      /^The expansion of data-driven tracking mechanisms enables digital platforms to harvest confidential user metrics without explicit consent, intensifying anxieties over digital surveillance and data security\.?$/i,
      "Sự phát triển của các cơ chế theo dõi dựa trên dữ liệu cho phép các nền tảng kỹ thuật số thu thập chỉ số người dùng bảo mật mà không có sự đồng ý rõ ràng, làm gia tăng lo ngại về sự giám sát kỹ thuật số và an toàn dữ liệu."
    ],
    [
      /^Furthermore, aggressive psychological tactics—such as artificial scarcity and countdown discounts—exploit cognitive vulnerabilities\.?$/i,
      "Hơn nữa, các chiến thuật tâm lý dồn dập—như khan hiếm nhân tạo và giảm giá đếm ngược—khai thác các điểm yếu trong nhận thức."
    ],
    [
      /^These methods induce a sense of urgency that overrides rational reflection, compelling individuals toward compulsive spending and materialism rather than genuine utility\.?$/i,
      "Những phương pháp này tạo ra cảm giác cấp bách đè bẹp suy nghĩ thấu đáo, thúc ép cá nhân hướng tới việc chi tiêu bốc đồng và chủ nghĩa vật chất thay vì tiện ích thực sự."
    ],
    [
      /^In summary, although advertising contributes positively to market communication and business expansion, its intrusive data collection practices and psychological manipulation present serious social costs\.?$/i,
      "Tóm lại, mặc dù quảng cáo đóng góp tích cực vào giao tiếp thị trường và mở rộng kinh doanh, các hành vi thu thập dữ liệu xâm nhập và thao túng tâm lý của nó tạo ra những chi phí xã hội nghiêm trọng."
    ],
    [
      /^Ultimately, the detrimental consequences exerted on individual autonomy and privacy render this modern phenomenon a negative development\.?$/i,
      "Cuối cùng, những hậu quả bất lợi gây ra đối với quyền tự quyết cá nhân và quyền riêng tư khiến hiện tượng hiện đại này trở thành một sự phát triển tiêu cực."
    ]
  ];

  // Sub-dictionary for phrases, clauses, words, connectors
  const subDictionary: [RegExp, string][] = [
    // --- Specific Phrases with Mark Tags or Plain ---
    [/(?:<mark[^>]*>)?Focusing on the highest rates(?:<\/mark>)?/gi, "<mark>Tập trung vào các tỷ lệ cao nhất</mark>"],
    [/(?:<mark[^>]*>)?Focusing on the highest(?:<\/mark>)?/gi, "<mark>Tập trung vào các tỷ lệ cao nhất</mark>"],
    [/(?:<mark[^>]*>)?reaching approximately 5\.3%(?:<\/mark>)?/gi, "<mark>đạt khoảng 5.3%</mark>"],
    [/(?:<mark[^>]*>)?reaching approximately(?:<\/mark>)?/gi, "<mark>đạt khoảng</mark>"],
    [/(?:<mark[^>]*>)?reaching roughly(?:<\/mark>)?/gi, "<mark>đạt khoảng</mark>"],
    [/(?:<mark[^>]*>)?the figure(?:<\/mark>)?/gi, "<mark>con số này</mark>"],
    [/(?:<mark[^>]*>)?the figures(?:<\/mark>)?/gi, "<mark>các con số</mark>"],
    [/(?:<mark[^>]*>)?a clear divergence in trends was observed(?:<\/mark>)?/gi, "<mark>đã ghi nhận sự phân hóa rõ rệt về xu hướng</mark>"],
    [/(?:<mark[^>]*>)?experienced contrasting trends(?:<\/mark>)?/gi, "<mark>trải qua những xu hướng trái ngược nhau</mark>"],
    [/(?:<mark[^>]*>)?were surpassed by Sweden's in 1996(?:<\/mark>)?/gi, "<mark>bị Thụy Điển vượt qua vào năm 1996</mark>"],
    [/(?:<mark[^>]*>)?a substantial rise of almost 60%(?:<\/mark>)?/gi, "<mark>mức tăng đáng kể gần 60%</mark>"],
    [/(?:<mark[^>]*>)?the lowest among the five(?:<\/mark>)?/gi, "<mark>thấp nhất trong số năm nước</mark>"],
    [/(?:<mark[^>]*>)?maintaining a consistent gap of about 1% above Germany(?:<\/mark>)?/gi, "<mark>duy trì khoảng cách ổn định khoảng 1% phía trên Đức</mark>"],
    [/(?:<mark[^>]*>)?the proportion of employees who took at least a day of sick leave(?:<\/mark>)?/gi, "<mark>tỷ lệ nhân viên nghỉ ốm ít nhất một ngày</mark>"],
    [/(?:<mark[^>]*>)?the lowest, but most stable, figures(?:<\/mark>)?/gi, "<mark>những con số thấp nhất nhưng ổn định nhất</mark>"],

    // --- Sub-clauses and Phrases ---
    [/levels of sickness absence in the Netherlands and Sweden showed a general upward trend/gi, "mức độ nghỉ do ốm đau ở Hà Lan và Thụy Điển có xu hướng tăng tổng thể"],
    [/levels of sickness absence in/gi, "mức độ nghỉ do ốm đau ở"],
    [/levels of sickness absence/gi, "mức độ nghỉ do ốm đau"],
    [/sickness absence levels in/gi, "mức độ nghỉ do ốm đau ở"],
    [/sickness absence levels/gi, "mức độ nghỉ do ốm đau"],
    [/illness absence rates/gi, "tỷ lệ nghỉ ốm"],
    [/absence rates/gi, "tỷ lệ nghỉ ốm"],
    [/absence rate/gi, "tỷ lệ nghỉ ốm"],
    [/sickness absence/gi, "nghỉ do ốm đau"],
    [/sick leave/gi, "nghỉ ốm"],
    [/took at least a day of sick leave/gi, "nghỉ ốm ít nhất một ngày"],

    [/in all years,/gi, "trong tất cả các năm,"],
    [/in all years/gi, "trong tất cả các năm"],
    [/all years/gi, "tất cả các năm"],
    [/except 1991, when the rate was around/gi, "ngoại trừ năm 1991, khi tỷ lệ này ở mức khoảng"],
    [/except 1991,/gi, "ngoại trừ năm 1991,"],
    [/except 1991/gi, "ngoại trừ năm 1991"],
    [/except/gi, "ngoại trừ"],

    [/slightly below France's 5%/gi, "thấp hơn một chút so với 5% của Pháp"],
    [/slightly below/gi, "thấp hơn một chút so với"],
    [/slightly above/gi, "cao hơn một chút so với"],

    [/This rate then increased to a peak of roughly/gi, "Tỷ lệ này sau đó tăng lên mức đỉnh khoảng"],
    [/This rate then increased/gi, "Tỷ lệ này sau đó tăng"],
    [/This rate/gi, "Tỷ lệ này"],
    [/then increased/gi, "sau đó tăng"],
    [/to a peak of roughly/gi, "lên mức đỉnh khoảng"],
    [/to a peak of/gi, "lên mức đỉnh"],
    [/a peak of/gi, "mức đỉnh"],

    [/before falling sharply to a low of about/gi, "trước khi giảm mạnh xuống mức thấp khoảng"],
    [/falling sharply to a low of/gi, "giảm mạnh xuống mức thấp"],
    [/falling sharply/gi, "giảm mạnh"],
    [/to a low of/gi, "xuống mức thấp"],

    [/From there,/gi, "Từ đó,"],
    [/From there/gi, "Từ đó"],

    [/quickly climbed back to its earlier peak by/gi, "nhanh chóng tăng trở lại mức đỉnh trước đó vào"],
    [/climbed back to its earlier peak/gi, "tăng trở lại mức đỉnh trước đó"],
    [/earlier peak/gi, "mức đỉnh trước đó"],

    [/reaching approximately/gi, "đạt khoảng"],
    [/reaching roughly/gi, "đạt khoảng"],
    [/reaching/gi, "đạt"],

    [/In 1991, France recorded the highest absence rate at 5%, while Sweden's rate was lower, at only 3%/gi, "Năm 1991, Pháp ghi nhận tỷ lệ nghỉ ốm cao nhất ở mức 5%, trong khi tỷ lệ của Thụy Điển thấp hơn, chỉ ở mức 3%"],
    [/recorded the highest absence rate at/gi, "ghi nhận tỷ lệ nghỉ ốm cao nhất ở mức"],
    [/while Sweden's rate was lower, at only/gi, "trong khi tỷ lệ của Thụy Điển thấp hơn, chỉ ở mức"],
    [/was lower, at only/gi, "thấp hơn, chỉ ở mức"],

    [/France's figures then decreased significantly and were surpassed by Sweden's in 1996/gi, "Số liệu của Pháp sau đó giảm đáng kể và bị Thụy Điển vượt qua vào năm 1996"],
    [/decreased significantly and were surpassed by/gi, "giảm đáng kể và bị vượt qua bởi"],
    [/were surpassed by Sweden's in 1996/gi, "bị Thụy Điển vượt qua vào năm 1996"],
    [/were surpassed by/gi, "bị vượt qua bởi"],
    [/before stabilizing at close to/gi, "trước khi ổn định ở mức gần"],
    [/stabilizing at close to/gi, "ổn định ở mức gần"],
    [/for the rest of the period/gi, "trong phần còn lại của giai đoạn"],

    [/By contrast, after hovering at roughly 3% for the first six years,/gi, "Trái lại, sau khi dao động ở mức khoảng 3% trong 6 năm đầu,"],
    [/after hovering at roughly/gi, "sau khi dao động ở mức khoảng"],
    [/after hovering at/gi, "sau khi duy trì xoay quanh mức"],
    [/hovering at roughly/gi, "dao động ở mức khoảng"],
    [/hovering at/gi, "dao động ở mức"],
    [/for the first six years/gi, "trong 6 năm đầu"],
    [/Sweden's figures increased dramatically,/gi, "số liệu của Thụy Điển đã tăng vọt,"],
    [/increased dramatically,/gi, "đã tăng vọt,"],
    [/increased dramatically/gi, "đã tăng vọt"],
    [/ending the period at nearly/gi, "kết thúc giai đoạn ở mức gần"],
    [/ending the period at/gi, "kết thúc giai đoạn ở mức"],
    [/a substantial rise of almost 60% from its initial point/gi, "mức tăng đáng kể gần 60% so với mốc ban đầu"],
    [/a substantial rise of almost 60% from its initial level/gi, "mức tăng đáng kể gần 60% so với mức ban đầu"],
    [/a substantial rise of almost/gi, "mức tăng đáng kể gần"],
    [/substantial rise/gi, "mức tăng đáng kể"],
    [/from its initial point/gi, "so với mốc ban đầu"],
    [/from its initial level/gi, "so với mức ban đầu"],
    [/from its initial/gi, "so với ban đầu"],
    [/initial point/gi, "mốc ban đầu"],
    [/initial level/gi, "mức ban đầu"],

    [/Turning to the remaining nations,/gi, "Chuyển sang các quốc gia còn lại,"],
    [/Turning to the remaining countries,/gi, "Chuyển sang các quốc gia còn lại,"],
    [/Turning to the remaining figures,/gi, "Chuyển sang các số liệu còn lại,"],
    [/Turning to the remaining/gi, "Chuyển sang phần còn lại của"],
    [/Turning to/gi, "Chuyển sang"],

    [/sickness absence levels in Germany were the lowest among the five,/gi, "mức độ nghỉ do ốm đau ở Đức là thấp nhất trong số năm nước,"],
    [/were the lowest among the five,/gi, "là thấp nhất trong số năm nước,"],
    [/were the lowest among the five/gi, "thấp nhất trong số năm nước"],
    [/were the lowest among/gi, "thấp nhất trong số"],
    [/were the highest among/gi, "cao nhất trong số"],
    [/fluctuating around 1\.5% over the decade/gi, "dao động quanh mức 1.5% trong suốt thập kỷ"],
    [/fluctuating around/gi, "dao động quanh mức"],
    [/fluctuated around/gi, "dao động quanh mức"],
    [/over the decade/gi, "trong suốt thập kỷ"],

    [/The UK's figures also remained relatively stable, but were slightly higher, at roughly 2\.5%,/gi, "Các con số của Vương quốc Anh cũng giữ ở mức tương đối ổn định, nhưng cao hơn một chút, ở mức khoảng 2.5%,"],
    [/figures also remained relatively stable/gi, "các con số cũng giữ ở mức tương đối ổn định"],
    [/remained relatively stable/gi, "giữ ở mức tương đối ổn định"],
    [/were slightly higher, at roughly/gi, "cao hơn một chút, ở mức khoảng"],
    [/were slightly lower, at roughly/gi, "thấp hơn một chút, ở mức khoảng"],
    [/maintaining a consistent gap of about 1% above Germany throughout this period/gi, "duy trì khoảng cách ổn định khoảng 1% phía trên Đức trong suốt giai đoạn này"],
    [/maintaining a consistent gap of about 1% above Germany throughout the period/gi, "duy trì khoảng cách ổn định khoảng 1% phía trên Đức trong suốt giai đoạn này"],
    [/maintaining a consistent gap of about 1% above Germany/gi, "duy trì khoảng cách ổn định khoảng 1% phía trên Đức"],
    [/maintaining a consistent gap of/gi, "duy trì khoảng cách ổn định"],
    [/above Germany throughout this period/gi, "phía trên Đức trong suốt giai đoạn này"],
    [/above Germany/gi, "phía trên Đức"],
    [/throughout this period/gi, "trong suốt giai đoạn này"],
    [/throughout the period/gi, "trong suốt giai đoạn này"],

    // --- Entity & Country Names ---
    [/The UK's figures/gi, "Số liệu của Vương quốc Anh"],
    [/The UK's figure/gi, "Số liệu của Vương quốc Anh"],
    [/UK's figures/gi, "Số liệu của Vương quốc Anh"],
    [/Germany's figures/gi, "Số liệu của Đức"],
    [/France's figures/gi, "Số liệu của Pháp"],
    [/Sweden's figures/gi, "Số liệu của Thụy Điển"],
    [/the Netherlands' figures/gi, "Số liệu của Hà Lan"],
    [/France's rate/gi, "tỷ lệ của Pháp"],
    [/Sweden's rate/gi, "tỷ lệ của Thụy Điển"],
    [/Germany's rate/gi, "tỷ lệ của Đức"],
    [/the Netherlands' rate/gi, "tỷ lệ của Hà Lan"],
    [/the UK's rate/gi, "tỷ lệ của Vương quốc Anh"],
    [/France's/gi, "của Pháp"],
    [/Sweden's/gi, "của Thụy Điển"],
    [/Germany's/gi, "của Đức"],
    [/the UK's/gi, "của Vương quốc Anh"],
    [/the Netherlands's/gi, "của Hà Lan"],
    [/the Netherlands'/gi, "của Hà Lan"],
    [/the Netherlands/gi, "Hà Lan"],
    [/Germany/gi, "Đức"],
    [/France/gi, "Pháp"],
    [/Sweden/gi, "Thụy Điển"],
    [/the UK/gi, "Vương quốc Anh"],

    // --- Connectors, Pronouns, and Common Vocabulary ---
    [/\bdeclined significantly\b/gi, "giảm đáng kể"],
    [/\bdeclined substantially\b/gi, "giảm đáng kể"],
    [/\bdeclined sharply\b/gi, "giảm mạnh"],
    [/\bdeclined slightly\b/gi, "giảm nhẹ"],
    [/\bdeclined\b/gi, "giảm"],
    [/\bdecreased significantly\b/gi, "giảm đáng kể"],
    [/\bdecreased\b/gi, "giảm"],
    [/\bfell sharply\b/gi, "giảm mạnh"],
    [/\bfell\b/gi, "giảm"],
    [/\bdropped\b/gi, "giảm"],
    [/\brecorded\b/gi, "ghi nhận"],
    [/\bshowed\b/gi, "cho thấy"],
    [/\bexperienced\b/gi, "trải qua"],
    [/\bincreased dramatically\b/gi, "tăng vọt"],
    [/\bincreased significantly\b/gi, "tăng đáng kể"],
    [/\bincreased\b/gi, "tăng"],
    [/\brose\b/gi, "tăng"],
    [/\bclimbed\b/gi, "tăng"],
    [/\bsurpassed\b/gi, "vượt qua"],
    [/\bwere surpassed by\b/gi, "bị vượt qua bởi"],
    [/\bwas surpassed by\b/gi, "bị vượt qua bởi"],
    [/\bstabilized\b/gi, "ổn định"],
    [/\bhovering at\b/gi, "dao động ở mức"],
    [/\bhovered at\b/gi, "dao động ở mức"],
    [/\bfluctuated around\b/gi, "dao động quanh mức"],
    [/\bfluctuating around\b/gi, "dao động quanh mức"],
    [/\buhwile\b/gi, "trong khi"],
    [/\bwhile\b/gi, "trong khi"],
    [/\bmeanwhile,\b/gi, "Trong khi đó,"],
    [/\bmeanwhile\b/gi, "trong khi đó"],
    [/\bby contrast,\b/gi, "Trái lại,"],
    [/\bby contrast\b/gi, "trái lại"],
    [/\bin contrast,\b/gi, "Ngược lại,"],
    [/\bin contrast\b/gi, "ngược lại"],
    [/\boverall,\b/gi, "Nhìn chung,"],
    [/\boverall\b/gi, "nhìn chung"],
    [/\band\b/gi, "và"],
    [/\bor\b/gi, "hoặc"],
    [/\bthe figure\b/gi, "con số này"],
    [/\bthe figures\b/gi, "các con số"],
    [/\bfigures\b/gi, "số liệu"],
    [/\bfigure\b/gi, "con số"],
    [/\brates\b/gi, "tỷ lệ"],
    [/\brate\b/gi, "tỷ lệ"],
    [/\bhighest rates\b/gi, "các tỷ lệ cao nhất"],
    [/\bhighest rate\b/gi, "tỷ lệ cao nhất"],
    [/\blowest rates\b/gi, "các tỷ lệ thấp nhất"],
    [/\blowest rate\b/gi, "tỷ lệ thấp nhất"],
    [/\bhighest\b/gi, "cao nhất"],
    [/\blowest\b/gi, "thấp nhất"],
    [/\bnations\b/gi, "quốc gia"],
    [/\bnation\b/gi, "quốc gia"],
    [/\bcountries\b/gi, "quốc gia"],
    [/\bcountry\b/gi, "quốc gia"],
    [/\bemployees\b/gi, "nhân viên"],
    [/\bemployee\b/gi, "nhân viên"],
    [/\bproportion\b/gi, "tỷ lệ"],
    [/\bpercentage\b/gi, "tỷ lệ phần trăm"],
    [/\bperiod\b/gi, "giai đoạn"],
    [/\bdecade\b/gi, "thập kỷ"],
    [/\byears\b/gi, "năm"],
    [/\byear\b/gi, "năm"]
  ];

  // Sort sub-dictionary by pattern length descending
  subDictionary.sort((a, b) => b[0].source.length - a[0].source.length);

  function translateChunk(str: string): string {
    let result = str
      .replace(/[\u2018\u2019\u0060]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\s+([:\.,;?!])/g, "$1")
      .replace(/:\s*/g, ": ");

    for (const [pattern, repl] of subDictionary) {
      result = result.replace(pattern, repl);
    }

    // Clean up standalone English articles before Vietnamese words safely (avoiding 'của', 'và')
    result = result
      .replace(/(?<![a-zA-ZÀ-ỹ])\b(the|a|an)\s+([a-àáảãạăằắẳẵặâầấẩẫậeèéẻẽẹêềếểễệiìíỉĩịoòóỏõọôồốổỗộơờớởỡợuùúủũụưừứửữựyỳýỷỹỵđ]+)/gi, "$2");

    return result;
  }

  function processSingleSentence(sent: string): string {
    const trimmedSent = sent.trim();
    if (!trimmedSent) return sent;

    // Check sentenceMap first
    for (const [pattern, translation] of sentenceMap) {
      if (pattern.test(trimmedSent)) {
        return translation;
      }
    }

    // Process parts (handling mark tags)
    const parts = trimmedSent.split(/(<mark[^>]*>[\s\S]*?<\/mark>)/gi);
    const translatedParts = parts
      .map((part) => {
        const match = part.match(/^<mark[^>]*>([\s\S]*?)<\/mark>$/i);
        if (match) {
          const cleanInner = match[1].replace(/<\/?mark[^>]*>/gi, "");
          return `<mark>${translateChunk(cleanInner)}</mark>`;
        }
        return translateChunk(part);
      })
      .join("");

    return translatedParts
      .replace(/<mark[^>]*>\s*<mark[^>]*>/gi, "<mark>")
      .replace(/<\/mark>\s*<\/mark>/gi, "</mark>");
  }

  function processParagraph(para: string): string {
    const trimmed = para.trim();
    if (!trimmed) return para;

    // Check if whole paragraph matches sentenceMap
    for (const [pattern, translation] of sentenceMap) {
      if (pattern.test(trimmed)) {
        return translation;
      }
    }

    // Split paragraph by sentences
    const sentences = trimmed.split(/(?<=[.!?])\s+/g);
    return sentences.map((s) => processSingleSentence(s)).join(" ");
  }

  return text
    .split("\n\n")
    .map((para) => processParagraph(para))
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

  const viEssaySource = generateFallbackVietnameseTranslation(
    report.fullUpgradeEssayVietnamese || report.fullUpgradeEssay || ""
  );

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
