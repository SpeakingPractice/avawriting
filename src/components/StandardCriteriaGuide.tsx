import React, { useState, useEffect } from "react";
import {
  Target,
  CheckCircle2,
  Sparkles,
  Compass,
  Layers,
  HelpCircle,
  FileText,
  Zap,
  TrendingUp,
  BarChart2,
  PieChart,
  Grid,
  MapPin,
  GitCommit,
  CheckSquare,
  Award,
  Sliders,
  Download,
  Check,
  Minus,
  FileSpreadsheet,
  Table,
  ChevronDown,
  ChevronUp,
  Printer,
} from "lucide-react";

export type BandLevel = "B1" | "B2" | "C1" | "C2";

export interface StandardCriteriaGuideProps {
  taskType: "task1" | "task2";
  promptText?: string;
  essayText?: string;
}

export type Task1Type =
  | "line_dynamic"
  | "bar_chart"
  | "table_data"
  | "pie_chart"
  | "process_diagram"
  | "map_diagram"
  | "mixed_charts";

export type Task2Type =
  | "agree_disagree"
  | "discuss_both"
  | "adv_disadv"
  | "problem_solution"
  | "two_part";

export interface CriteriaDetails {
  ta: string[];
  cc: string[];
  lr: string[];
  gra: string[];
}

export const StandardCriteriaGuide: React.FC<StandardCriteriaGuideProps> = ({
  taskType,
  promptText = "",
  essayText = "",
}) => {
  const [selectedBand, setSelectedBand] = useState<BandLevel>("C1");

  // State for matrix filter & collapse
  const [matrixFilter, setMatrixFilter] = useState<"ALL" | "TA_TR" | "CC" | "LR" | "GRA">("ALL");
  const [isMatrixCollapsed, setIsMatrixCollapsed] = useState<boolean>(false);

  // Rank helper for progression matrix
  const BAND_ORDER: Record<BandLevel, number> = {
    B1: 1,
    B2: 2,
    C1: 3,
    C2: 4,
  };

  const isFeatureSatisfied = (targetBand: BandLevel, minRequiredBand: BandLevel): boolean => {
    return BAND_ORDER[targetBand] >= BAND_ORDER[minRequiredBand];
  };

  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Vui lòng cho phép popup trình duyệt để mở cửa sổ tải / in file PDF.");
      return;
    }

    const titleText = `BẢNG TIÊU CHÍ IELTS WRITING (${taskType.toUpperCase()})`;

    let rowsHtml = "";

    progressionCategories.forEach((cat) => {
      rowsHtml += `
        <tr class="cat-header">
          <td colspan="5">
            <strong>${cat.categoryName}</strong> - <em>${cat.badgeText}</em>
          </td>
        </tr>
      `;

      cat.features.forEach((feat, idx) => {
        const isB1 = isFeatureSatisfied("B1", feat.minBand) ? '<span class="check">✓ Đạt</span>' : '<span class="dash">-</span>';
        const isB2 = isFeatureSatisfied("B2", feat.minBand) ? '<span class="check">✓ Đạt</span>' : '<span class="dash">-</span>';
        const isC1 = isFeatureSatisfied("C1", feat.minBand) ? '<span class="check">✓ Đạt</span>' : '<span class="dash">-</span>';
        const isC2 = isFeatureSatisfied("C2", feat.minBand) ? '<span class="check">✓ Đạt</span>' : '<span class="dash">-</span>';

        rowsHtml += `
          <tr>
            <td class="feat-col">
              <div class="feat-title">#${idx + 1}. ${feat.title}</div>
              <div class="feat-desc">${feat.description}</div>
            </td>
            <td class="center-col">${isB1}</td>
            <td class="center-col">${isB2}</td>
            <td class="center-col">${isC1}</td>
            <td class="center-col">${isC2}</td>
          </tr>
        `;
      });
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>${titleText}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 12px;
            background: #fff;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 10px;
            margin-bottom: 14px;
          }
          .header h1 {
            font-size: 18px;
            color: #1e3a8a;
            margin: 0 0 4px 0;
            text-transform: uppercase;
            font-weight: 800;
          }
          .header p {
            font-size: 11px;
            color: #475569;
            margin: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 7px 9px;
            vertical-align: top;
          }
          th {
            background-color: #0f172a;
            color: #ffffff;
            font-weight: bold;
            text-transform: uppercase;
            text-align: center;
            font-size: 10px;
          }
          th.feat-th {
            text-align: left;
            width: 44%;
          }
          .cat-header td {
            background-color: #f1f5f9;
            color: #1e3a8a;
            font-size: 11px;
            padding: 8px 10px;
            border-top: 2px solid #94a3b8;
          }
          .feat-col {
            width: 44%;
          }
          .feat-title {
            font-weight: bold;
            color: #0f172a;
            font-size: 11px;
          }
          .feat-desc {
            color: #475569;
            font-size: 10px;
            margin-top: 2px;
            line-height: 1.3;
          }
          .center-col {
            text-align: center;
            vertical-align: middle;
            width: 14%;
          }
          .check {
            display: inline-block;
            background-color: #dcfce7;
            color: #166534;
            border: 1px solid #86efac;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 10px;
          }
          .dash {
            color: #cbd5e1;
            font-size: 14px;
          }
          .footer {
            margin-top: 14px;
            text-align: right;
            font-size: 10px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${titleText}</h1>
          <p>Hệ thống Tiến Hoá Kỹ Năng IELTS Writing - Tích Luỹ Theo Band Score (B1 5.0+ ➔ B2 6.0+ ➔ C1 7.0+ ➔ C2 7.5+)</p>
        </div>
        <table>
          <thead>
            <tr>
              <th class="feat-th">Đặc Tính / Kỹ Năng Yêu Cầu (Feature)</th>
              <th>Band B1 (5.0+)<br><span style="font-weight:normal;font-size:9px;">Nền Tảng</span></th>
              <th>Band B2 (6.0+)<br><span style="font-weight:normal;font-size:9px;">+Tích Lũy B1</span></th>
              <th>Band C1 (7.0+)<br><span style="font-weight:normal;font-size:9px;">+Tích Lũy B1+B2</span></th>
              <th>Band C2 (7.5+)<br><span style="font-weight:normal;font-size:9px;">+Tích Lũy B1+B2+C1</span></th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="footer">
          Xuất file tự động từ IELTS Writing Evaluator System
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  interface ProgressionFeatureItem {
    id: string;
    title: string;
    description: string;
    minBand: BandLevel;
  }

  interface ProgressionCategoryGroup {
    code: "TA_TR" | "CC" | "LR" | "GRA";
    categoryName: string;
    badgeText: string;
    headerBg: string;
    badgeBg: string;
    textColor: string;
    borderColor: string;
    features: ProgressionFeatureItem[];
  }

  const task1ProgressionCategories: ProgressionCategoryGroup[] = [
    {
      code: "TA_TR",
      categoryName: "1. Task Achievement (TA) - Độ Hoàn Thành Task 1 - Nội Dung & Luận Điểm",
      badgeText: "Nội Dung & Luận Điểm",
      headerBg: "bg-blue-100/80",
      badgeBg: "bg-blue-200/90",
      textColor: "text-blue-950",
      borderColor: "border-blue-300",
      features: [
        {
          id: "ta1_1",
          title: "Giới thiệu đúng biểu đồ và bố cục rõ ràng",
          description: "Paraphrase đề bài chính xác và chia bài thành Introduction – Overview – Body hợp lý.",
          minBand: "B1",
        },
        {
          id: "ta1_2",
          title: "Mô tả các đặc điểm chính của dữ liệu",
          description: "Lựa chọn các số liệu hoặc xu hướng nổi bật thay vì liệt kê toàn bộ.",
          minBand: "B1",
        },
        {
          id: "ta1_3",
          title: "Overview rõ ràng & Nhất quán",
          description: "Nêu xu hướng chính (tăng/ giảm/ lớn nhất/ nhỏ nhất/ thay đổi nổi bật) ngay ở phần Overall.",
          minBand: "B1",
        },
        {
          id: "ta1_4",
          title: "Mô tả và hỗ trợ bằng số liệu phù hợp",
          description: "Mỗi đoạn thân bài tập trung vào một nhóm dữ liệu và sử dụng số liệu minh họa.",
          minBand: "B2",
        },
        {
          id: "ta1_5",
          title: "Bao quát đầy đủ các đặc điểm chính",
          description: "Không bỏ sót nhóm dữ liệu hoặc xu hướng quan trọng; tránh mô tả lan man các chi tiết nhỏ.",
          minBand: "B2",
        },
        {
          id: "ta1_6",
          title: "So sánh và nhóm dữ liệu hợp lý",
          description: "Biết nhóm các đối tượng có điểm tương đồng và đưa ra các phép so sánh hợp lý.",
          minBand: "C1",
        },
        {
          id: "ta1_7",
          title: "Chọn lọc và tổng hợp thông tin hiệu quả",
          description: "Ưu tiên mô tả xu hướng và đặc điểm nổi bật thay vì liệt kê từng con số.",
          minBand: "C1",
        },
        {
          id: "ta1_8",
          title: "Phân tích dữ liệu tinh tế và khách quan",
          description: "Nhận diện các mô hình phức tạp, ngoại lệ hoặc mối quan hệ giữa các nhóm dữ liệu mà không suy diễn nguyên nhân.",
          minBand: "C2",
        },
      ],
    },
    {
      code: "CC",
      categoryName: "2. Coherence & Cohesion (CC) - Mạch Lạc & Liên Kết Ý Tưởng - Bố Cục & Chuyển Ý",
      badgeText: "Bố Cục & Chuyển Ý",
      headerBg: "bg-indigo-100/80",
      badgeBg: "bg-indigo-200/90",
      textColor: "text-indigo-950",
      borderColor: "border-indigo-300",
      features: [
        {
          id: "cc1_1",
          title: "Phân chia đoạn văn rõ ràng (Paragraphing)",
          description: "Chia bài viết thành các đoạn văn riêng biệt có nhiệm vụ rõ ràng (Ví dụ: nhiệm vụ Intro là giới thiệu).",
          minBand: "B1",
        },
        {
          id: "cc1_2",
          title: "Sử dụng từ nối cơ bản (Basic Linkers)",
          description: "Dùng các liên từ thông dụng (and, but, also, besides, first, second, then, next, finally…).",
          minBand: "B1",
        },
        {
          id: "cc1_3_b1",
          title: "Bố cục logic giữa các phần (Intro - Overview - Body)",
          description: "Sắp xếp thông tin theo trình tự hợp lý, diễn đạt mạch lạc dễ theo dõi.",
          minBand: "B1",
        },
        {
          id: "cc1_3",
          title: "Sử dụng từ nối học thuật đa dạng (Academic Connectors)",
          description: "Áp dụng linh hoạt các từ nối (looking first at, turning to, while, whereas, meanwhile, however, by contrast, in comparison, compared with, similarly, likewise, notably, respectively, although, initially, subsequently, following this, once, after which, before being V3…).",
          minBand: "B2",
        },
        {
          id: "cc1_4",
          title: "Câu chủ đề (Topic Sentence) rõ ràng định hướng đoạn",
          description: "Mỗi đoạn thân bài mở đầu bằng câu chủ đề tóm tắt ý chính của cả đoạn. (looking first at the highest contributors,… / turning to the remaining countries,…)",
          minBand: "B2",
        },
        {
          id: "cc1_5",
          title: "Mạch triển khai thông tin tự nhiên (mạch đọc không đứt gãy)",
          description: "Các đoạn được liên kết mượt mà theo một trình tự rõ ràng, giúp người đọc dễ dàng theo dõi sự phát triển của bài viết mà không cảm thấy đột ngột. (Intro → Overview → Body 1 → Body 2…).",
          minBand: "B2",
        },
        {
          id: "cc1_6",
          title: "Liên kết tự nhiên bằng phép thế và từ thay thế (referencing/ substitution)",
          description: "Dùng linh hoạt this figure, this value, this area/site, the former, the latter, this trend, respectively…",
          minBand: "C1",
        },
        {
          id: "cc1_7",
          title: "Cách nhóm thông tin và chia đoạn hợp lý (chiến lược grouping hiệu quả)",
          description: "Biết lựa chọn tiêu chí phù hợp để nhóm các thông tin liên quan và phân chia chúng vào các đoạn hợp lý. Chart: highest contributors → middle group → lowest group HOẶC increase → decrease. Map: left → middle → right HOẶC before → after. Process: preparation → production → distribution.",
          minBand: "C1",
        },
        {
          id: "cc1_8",
          title: "Tổng hợp và liên kết thông tin một cách tự nhiên (điều rút ra được)",
          description: "Biết kết nối các xu hướng hoặc đặc điểm có liên quan để làm nổi bật bức tranh tổng thể. Chart: While the US remained the dominant donor, Germany recorded the fastest growth... Map: Overall, the town underwent significant urban development... Process: After being collected, the water undergoes a series of treatment stages...",
          minBand: "C2",
        },
      ],
    },
    {
      code: "LR",
      categoryName: "3. Lexical Resource (LR) - Vốn Từ Vựng & Diễn Đạt - Từ Vựng & Collocations",
      badgeText: "Từ Vựng & Collocations",
      headerBg: "bg-emerald-100/80",
      badgeBg: "bg-emerald-200/90",
      textColor: "text-emerald-950",
      borderColor: "border-emerald-300",
      features: [
        {
          id: "lr1_1",
          title: "Từ vựng thông dụng đủ diễn đạt ý tưởng",
          description: "Đủ vốn từ cơ bản để truyền tải nội dung bài viết không bị tắc nghẽn. (increase, decrease, highest, lowest,…)",
          minBand: "B1",
        },
        {
          id: "lr1_2",
          title: "Chính tả và dạng từ cơ bản chính xác",
          description: "Mắc rất ít lỗi chính tả nghiêm trọng ở các từ vựng cơ bản.",
          minBand: "B1",
        },
        {
          id: "lr1_3_b1",
          title: "Sử dụng từ vựng số liệu & xu hướng cơ bản",
          description: "Mô tả sự tăng/giảm hoặc con số đơn giản chính xác không bị sai lệch.",
          minBand: "B1",
        },
        {
          id: "lr1_3",
          title: "Sử dụng đúng từ vựng theo từng dạng",
          description: "Chart: peak, bottom out, level off, fluctuate, account for, represent, proportion, figure… Map: residential area, industrial zone, facilities, demolish, construct, redevelop, remove… Process: raw materials, manufacture, remove impurities, filter, package, transport, deliver…",
          minBand: "B2",
        },
        {
          id: "lr1_4",
          title: "Collocations quen thuộc & Dạng từ (Word form) chính xác",
          description: "Sử dụng cụm từ kết hợp tự nhiên (experience a rise, record a decline, remain unchanged/stable, reach a peak,…) và đúng loại từ.",
          minBand: "B2",
        },
        {
          id: "lr1_5",
          title: "Biết Paraphrase linh hoạt tránh lặp từ",
          description: "Thay thế từ vựng đề bài bằng từ đồng nghĩa hoặc cấu trúc diễn đạt khác. (increase → rise → grow → climb; decrease → fall → drop → decline; figure → number → amount → value).",
          minBand: "B2",
        },
        {
          id: "lr1_6",
          title: "Vốn từ học thuật chính xác và collocations nâng cao (thay đổi từ vựng)",
          description: "Việc sử dụng/ thay đổi từ chính xác, hiểu và vận dụng tốt collocations nâng cao. (recorded a sharp increase, experienced/saw/witnessed a significant drop, remained relatively stable, reached a peak of, reach a trough of, hit a high of, hit a low of, accounted for/ made up the largest proportion, underwent substantial redevelopment/ changes,…)",
          minBand: "C1",
        },
        {
          id: "lr1_7",
          title: "Paraphrase chính xác tuyệt đối sắc thái nghĩa (thay đổi cả câu)",
          description: "Diễn đạt linh hoạt bằng nhiều cách mà không bị chệch sắc thái hay gượng ép. Chart: Germany increased → Germany recorded an increase -> Germany experienced steady growth. Map: A park was replaced by a supermarket → the park gave way to a supermarket → the former park site was redeveloped into a supermarket.",
          minBand: "C1",
        },
        {
          id: "lr1_8",
          title: "Vốn từ miêu tả dữ liệu tự nhiên và chính xác như người bản ngữ",
          description: "Sử dụng linh hoạt các cách diễn đạt học thuật, collocations và paraphrase một cách tự nhiên, chính xác, gần như không có dấu hiệu gượng ép. (The figure increased → The figure experienced a moderate increase → The figure recorded a moderate increase before stabilising at approximately 20%.)",
          minBand: "C2",
        },
      ],
    },
    {
      code: "GRA",
      categoryName: "4. Grammatical Range & Accuracy (GRA) - Ngữ Pháp & Độ Chính Xác - Cấu Trúc & Ngữ Pháp",
      badgeText: "Cấu Trúc & Ngữ Pháp",
      headerBg: "bg-purple-100/80",
      badgeBg: "bg-purple-200/90",
      textColor: "text-purple-950",
      borderColor: "border-purple-300",
      features: [
        {
          id: "gra1_1",
          title: "Thành thạo câu đơn & Câu ghép cơ bản",
          description: "Viết đúng các câu đơn và câu ghép sử dụng and, but, so, or.",
          minBand: "B1",
        },
        {
          id: "gra1_2",
          title: "Chia đúng thì cơ bản & Hòa hợp Chủ - Vị",
          description: "Sử dụng đúng thì Hiện tại đơn, Quá khứ đơn, sự hòa hợp giữa chủ ngữ và động từ (số ít / số nhiều), và sử dụng đúng số ít/số nhiều của danh từ.",
          minBand: "B1",
        },
        {
          id: "gra1_3_b1",
          title: "Cấu trúc câu rõ nghĩa & kiểm soát lỗi cơ bản",
          description: "Mắc ít lỗi ngữ pháp nghiêm trọng, đảm bảo ý nghĩa truyền đạt không bị hiểu sai.",
          minBand: "B1",
        },
        {
          id: "gra1_3",
          title: "Sử dụng linh hoạt các câu phức (Complex Sentences)",
          description: "Sử dụng linh hoạt các câu phức: mệnh đề quan hệ, mệnh đề thời gian (before, after, when, once, until, while), so sánh (than, twice as…as, three times higher than), nhượng bộ (although, eventhough, while, whereas) để tăng tính đa dạng của câu.",
          minBand: "B2",
        },
        {
          id: "gra1_4",
          title: "Đa dạng hoá cấu trúc câu (câu đơn → ghép → phức)",
          description: "Kết hợp câu đơn, câu ghép, câu phức hoặc kết hợp, và khi phù hợp có sử dụng thể bị động để tăng tính đa dạng trong diễn đạt.",
          minBand: "B2",
        },
        {
          id: "gra1_5",
          title: "Kiểm soát tốt ngữ pháp, ít lỗi nghiêm trọng",
          description: "Các lỗi ngữ pháp nếu có không ảnh hưởng đáng kể đến sự rõ ràng của bài viết.",
          minBand: "B2",
        },
        {
          id: "gra1_6",
          title: "Cấu trúc phức nâng cao",
          description: "Sử dụng linh hoạt các cấu trúc ngữ pháp nâng cao như mệnh đề quan hệ rút gọn (V-ing, V-3), mệnh đề phân từ (having reached a peak in 2009, the figure declined gradually thereafter / remaining stable at around 10 million, the figure then increased slightly to 11 million in 2010)…",
          minBand: "C1",
        },
        {
          id: "gra1_7",
          title: "Độ chính xác ngữ pháp cao (~90-95%+)",
          description: "Hầu như không mắc lỗi ngữ pháp, làm chủ hoàn toàn dấu câu (phẩy, chấm, ngoặc).",
          minBand: "C1",
        },
        {
          id: "gra1_8",
          title: "Làm chủ ngữ pháp phức với độ chính xác gần như tuyệt đối",
          description: "Sử dụng đa dạng các cấu trúc ngữ pháp phức một cách tự nhiên; lỗi rất hiếm và hầu như không ảnh hưởng đến chất lượng bài viết.",
          minBand: "C2",
        },
      ],
    },
  ];

  const task2ProgressionCategories: ProgressionCategoryGroup[] = [
    {
      code: "TA_TR",
      categoryName: "1. Task Response (TR) - Trả Lời Trực Tiếp Đề Bài Task 2 - Nội Dung & Luận Điểm",
      badgeText: "Nội Dung & Luận Điểm",
      headerBg: "bg-blue-100/80",
      badgeBg: "bg-blue-200/90",
      textColor: "text-blue-950",
      borderColor: "border-blue-300",
      features: [
        {
          id: "tr2_1",
          title: "Nêu lập trường cơ bản & bố cục đoạn rõ ràng",
          description: "Trả lời trực tiếp câu hỏi chính của đề bài, chia bài thành Mở - Thân - Kết rõ ràng.",
          minBand: "B1",
        },
        {
          id: "tr2_2",
          title: "Cung cấp 2-3 ý chính hỗ trợ bài viết",
          description: "Nêu được các ý chính và có giải thích.",
          minBand: "B1",
        },
        {
          id: "tr2_3",
          title: "Thesis Statement rõ ràng & nhất quán",
          description: "Nêu bật quan điểm cá nhân ngay ở phần mở bài.",
          minBand: "B1",
        },
        {
          id: "tr2_4",
          title: "Phát triển luận điểm đầy đủ (Ý chính -> Giải thích -> Ví dụ)",
          description: "Mỗi đoạn thân bài tập trung 1 ý chủ đạo với lập luận logic kèm ví dụ minh hoạ.",
          minBand: "B2",
        },
        {
          id: "tr2_5",
          title: "Bao phủ trọn vẹn tất cả các yêu cầu đề bài",
          description: "Giải quyết triệt để mọi vế câu hỏi hoặc nhóm thông tin then chốt không bị bỏ sót.",
          minBand: "B2",
        },
        {
          id: "tr2_6",
          title: "Lập luận sắc bén chiều sâu (Mô hình PEEL / Phân tích tác động vĩ mô)",
          description: "Phân tích nguyên nhân gốc rễ, tác động kinh tế - xã hội, có ví dụ tốt và liên kết lại chủ đề đoạn.",
          minBand: "C1",
        },
        {
          id: "tr2_7",
          title: "Xử lý phản biện & nhượng bộ (Counter-argument) mượt mà",
          description: "Nhượng bộ góc nhìn đối lập và phản biện đanh thép để củng cố lập trường chính.",
          minBand: "C1",
        },
        {
          id: "tr2_8",
          title: "Phân tích đanh thép & có chiều sâu / thực tiễn cao",
          description: "Bảo vệ lập trường bằng tư duy phân tích, giải quyết góc nhìn đa chiều với ý tưởng khó có thể bị bác bỏ. Các giải thích và ví dụ không có sự tuyệt đối hay đánh đồng (tránh overgeneralization).",
          minBand: "C2",
        },
      ],
    },
    {
      code: "CC",
      categoryName: "2. Coherence & Cohesion (CC) - Mạch Lạc & Liên Kết Ý Tưởng - Bố Cục & Chuyển Ý",
      badgeText: "Bố Cục & Chuyển Ý",
      headerBg: "bg-indigo-100/80",
      badgeBg: "bg-indigo-200/90",
      textColor: "text-indigo-950",
      borderColor: "border-indigo-300",
      features: [
        {
          id: "cc2_1",
          title: "Phân chia đoạn văn rõ ràng (Paragraphing)",
          description: "Chia bài viết thành các đoạn văn riêng biệt có nhiệm vụ rõ ràng.",
          minBand: "B1",
        },
        {
          id: "cc2_2",
          title: "Sử dụng từ nối cơ bản (Basic Linkers)",
          description: "Dùng các liên từ thông dụng (First, Second, Then, Also, Because, In conclusion).",
          minBand: "B1",
        },
        {
          id: "cc2_3_b1",
          title: "Bố cục logic giữa các đoạn văn",
          description: "Sắp xếp các ý tưởng theo trình tự mạch lạc, phân chia đoạn văn hợp lý.",
          minBand: "B1",
        },
        {
          id: "cc2_3",
          title: "Sử dụng từ nối học thuật đa dạng (Academic Connectors)",
          description: "Áp dụng linh hoạt On the one hand, On the other hand, Furthermore, As a result, Consequently.",
          minBand: "B2",
        },
        {
          id: "cc2_4",
          title: "Câu chủ đề (Topic Sentence) rõ ràng định hướng đoạn",
          description: "Mỗi đoạn thân bài mở đầu bằng câu chủ đề tóm tắt ý chính của cả đoạn.",
          minBand: "B2",
        },
        {
          id: "cc2_5",
          title: "Mạch chuyển ý trôi chảy giữa các đoạn văn",
          description: "Liên kết giữa các đoạn mượt mà, không bị cứng nhắc hay lạm dụng liên từ.",
          minBand: "B2",
        },
        {
          id: "cc2_6",
          title: "Liên kết bằng phép thế đại từ & Danh từ hóa (Nominalization)",
          description: "Sử dụng tự nhiên “it, this policy, these measures, the former/latter” và biến đổi danh từ.",
          minBand: "C1",
        },
        {
          id: "cc2_7",
          title: "Mạch suy luận logic không lạm dụng liên từ đầu câu",
          description: "Tự bản thân các câu nối tiếp nhau bằng tư duy logic tự nhiên, với sự kết hợp của các mục trên.",
          minBand: "C1",
        },
        {
          id: "cc2_8",
          title: "Mạch liên kết trôi chảy tuyệt đối",
          description: "Sự kết nối giữa các ý tưởng mượt mà hơn, ưu tiên sử dụng được quy tắc Diễn Tiến Đề Ngữ (Theme–Rheme progression) trong giai đoạn này.",
          minBand: "C2",
        },
      ],
    },
    {
      code: "LR",
      categoryName: "3. Lexical Resource (LR) - Vốn Từ Vựng & Diễn Đạt - Từ Vựng & Collocations",
      badgeText: "Từ Vựng & Collocations",
      headerBg: "bg-emerald-100/80",
      badgeBg: "bg-emerald-200/90",
      textColor: "text-emerald-950",
      borderColor: "border-emerald-300",
      features: [
        {
          id: "lr2_1",
          title: "Từ vựng thông dụng đủ diễn đạt ý tưởng",
          description: "Dùng được từ vựng đơn giản (cho phép lặp từ) nhưng đủ để truyền tải nội dung bài viết.",
          minBand: "B1",
        },
        {
          id: "lr2_2",
          title: "Chính tả đúng ở các từ vựng phổ thông",
          description: "Mắc rất ít lỗi chính tả nghiêm trọng ở các từ vựng cơ bản.",
          minBand: "B1",
        },
        {
          id: "lr2_3_b1",
          title: "Diễn đạt ý tưởng rõ ràng theo chủ đề",
          description: "Sử dụng từ vựng phù hợp với đề bài, truyền đạt thông điệp chính không gây hiểu nhầm.",
          minBand: "B1",
        },
        {
          id: "lr2_3",
          title: "Sử dụng từ vựng theo chủ đề (Topic-specific vocabulary)",
          description: "Dùng từ vựng học thuật thuộc chủ đề bài viết chính xác ngữ cảnh.",
          minBand: "B2",
        },
        {
          id: "lr2_4",
          title: "Collocations quen thuộc & Dạng từ (Word form) chính xác",
          description: "Dùng cụm từ kết hợp (play a key role, make a contribution, have an effect on…) và đúng loại từ.",
          minBand: "B2",
        },
        {
          id: "lr2_5",
          title: "Biết Paraphrase linh hoạt tránh lặp từ",
          description: "Thay thế từ vựng đề bài bằng từ đồng nghĩa phù hợp hoặc cấu trúc diễn đạt khác.",
          minBand: "B2",
        },
        {
          id: "lr2_6",
          title: "Vốn từ học thuật sâu rộng & Collocations đắt giá",
          description: "Sử dụng các từ vựng đắt giá (lucrative opportunity, far-reaching impact, root cause, alleviate…).",
          minBand: "C1",
        },
        {
          id: "lr2_7",
          title: "Paraphrase chính xác tuyệt đối sắc thái nghĩa",
          description: "Diễn đạt linh hoạt/ kết hợp bằng nhiều cách (từ đồng nghĩa đúng ngữ cảnh, thay đổi loại từ, phrases, collocations) mà không làm thay đổi ý nghĩa hoặc khiến câu văn gượng ép.",
          minBand: "C1",
        },
        {
          id: "lr2_8",
          title: "Ngôn ngữ bản xứ tinh tế & High-level Idiomatic Collocations",
          description: "Nắm rõ sắc thái từ vựng khi viết, thuật ngữ và collocations chính xác gần như tuyệt đối.",
          minBand: "C2",
        },
      ],
    },
    {
      code: "GRA",
      categoryName: "4. Grammatical Range & Accuracy (GRA) - Ngữ Pháp & Độ Chính Xác - Cấu Trúc & Ngữ Pháp",
      badgeText: "Cấu Trúc & Ngữ Pháp",
      headerBg: "bg-purple-100/80",
      badgeBg: "bg-purple-200/90",
      textColor: "text-purple-950",
      borderColor: "border-purple-300",
      features: [
        {
          id: "gra2_1",
          title: "Thành thạo câu đơn & Câu ghép cơ bản",
          description: "Viết đúng các câu đơn và câu ghép sử dụng and, but, so, or.",
          minBand: "B1",
        },
        {
          id: "gra2_2",
          title: "Chia đúng thì cơ bản & Hòa hợp Chủ - Vị",
          description: "Sử dụng đúng thì Hiện tại đơn, Quá khứ đơn và hòa hợp số ít / số nhiều.",
          minBand: "B1",
        },
        {
          id: "gra2_3_b1",
          title: "Cấu trúc câu rõ nghĩa & kiểm soát lỗi cơ bản",
          description: "Viết được các câu hoàn chỉnh, các lỗi mắc phải không gây cản trở người đọc tiếp thu ý chính.",
          minBand: "B1",
        },
        {
          id: "gra2_3",
          title: "Sử dụng linh hoạt các câu phức (Complex Sentences)",
          description: "Áp dụng tốt câu điều kiện, mệnh đề quan hệ (which/that/who), câu nhượng bộ (although/while).",
          minBand: "B2",
        },
        {
          id: "gra2_4",
          title: "Kết hợp câu đơn và câu phức",
          description: "Biết sử dụng xen kẽ câu đơn và câu phức để diễn đạt ý; vẫn có thể còn một số lỗi ngữ pháp nhưng nhìn chung không ảnh hưởng đến việc truyền đạt.",
          minBand: "B2",
        },
        {
          id: "gra2_5",
          title: "Kiểm soát tốt ngữ pháp, ít lỗi nghiêm trọng",
          description: "Đảm bảo câu văn luôn rõ nghĩa, người đọc tiếp thu dễ dàng.",
          minBand: "B2",
        },
        {
          id: "gra2_6",
          title: "Cấu trúc phức nâng cao (Phân từ rút gọn, Đảo ngữ)",
          description: "Thành thạo đa dạng ngữ pháp: mệnh đề phân từ chỉ nguyên nhân/kết quả, MĐQH rút gọn (V-ing/ V3), đảo ngữ, cấu trúc nhượng bộ phức tạp (admittedly, granted, it is true that… Nevertheless …).",
          minBand: "C1",
        },
        {
          id: "gra2_7",
          title: "Độ chính xác ngữ pháp cao (~90-95%+)",
          description: "Lỗi ngữ pháp gần như không có nếu có thì người đọc vẫn hiểu được nội dung, làm chủ hoàn toàn dấu câu (phẩy, chấm, ngoặc).",
          minBand: "C1",
        },
        {
          id: "gra2_8",
          title: "Làm chủ ngữ pháp phức với độ chính xác gần như tuyệt đối",
          description: "Sử dụng đa dạng các cấu trúc ngữ pháp phức tạp một cách chính xác; lỗi rất hiếm và hầu như không ảnh hưởng đến sự rõ ràng của bài viết.",
          minBand: "C2",
        },
      ],
    },
  ];

  const progressionCategories = taskType === "task1" ? task1ProgressionCategories : task2ProgressionCategories;

  const filteredProgressionCategories =
    matrixFilter === "ALL"
      ? progressionCategories
      : progressionCategories.filter((c) => c.code === matrixFilter);

  // State for detected / chosen essay type
  const [task1EssayType, setTask1EssayType] = useState<Task1Type>("line_dynamic");
  const [task2EssayType, setTask2EssayType] = useState<Task2Type>("agree_disagree");
  const [isManualSelect, setIsManualSelect] = useState(false);

  // Auto detect essay type based on prompt & essay if not manually selected
  useEffect(() => {
    if (isManualSelect) return;

    const combined = (promptText + " " + essayText).toLowerCase();

    if (taskType === "task1") {
      if (
        combined.includes("process") ||
        combined.includes("diagram") ||
        combined.includes("step") ||
        combined.includes("stage") ||
        combined.includes("how to") ||
        combined.includes("manufactured") ||
        combined.includes("produced") ||
        combined.includes("cycle")
      ) {
        setTask1EssayType("process_diagram");
      } else if (
        combined.includes("map") ||
        combined.includes("village") ||
        combined.includes("town") ||
        combined.includes("development of") ||
        combined.includes("infrastructure") ||
        combined.includes("island") ||
        combined.includes("redeveloped") ||
        combined.includes("renovated") ||
        combined.includes("layout")
      ) {
        setTask1EssayType("map_diagram");
      } else if (
        combined.includes("pie") ||
        combined.includes("proportion") ||
        combined.includes("share") ||
        combined.includes("sector")
      ) {
        setTask1EssayType("pie_chart");
      } else if (combined.includes("table")) {
        setTask1EssayType("table_data");
      } else if (combined.includes("bar") || combined.includes("column")) {
        setTask1EssayType("bar_chart");
      } else if (
        combined.includes("line") ||
        combined.includes("over the period") ||
        combined.includes("between") ||
        combined.includes("trend")
      ) {
        setTask1EssayType("line_dynamic");
      } else if (combined.includes("chart") && combined.includes("table")) {
        setTask1EssayType("mixed_charts");
      } else {
        setTask1EssayType("line_dynamic");
      }
    } else {
      if (
        combined.includes("agree or disagree") ||
        combined.includes("to what extent") ||
        combined.includes("do you agree") ||
        combined.includes("agree with this statement")
      ) {
        setTask2EssayType("agree_disagree");
      } else if (
        combined.includes("discuss both") ||
        combined.includes("both views") ||
        combined.includes("both sides")
      ) {
        setTask2EssayType("discuss_both");
      } else if (
        combined.includes("advantage") ||
        combined.includes("benefit") ||
        combined.includes("drawback") ||
        combined.includes("disadvantage") ||
        combined.includes("outweigh")
      ) {
        setTask2EssayType("adv_disadv");
      } else if (
        combined.includes("solution") ||
        combined.includes("cause") ||
        combined.includes("problem") ||
        combined.includes("reason") ||
        combined.includes("measures") ||
        combined.includes("effect") ||
        combined.includes("why")
      ) {
        setTask2EssayType("problem_solution");
      } else if (
        combined.includes("two questions") ||
        combined.includes("?") ||
        combined.includes("what can be done")
      ) {
        setTask2EssayType("two_part");
      } else {
        setTask2EssayType("agree_disagree");
      }
    }
  }, [taskType, promptText, essayText, isManualSelect]);

  // Reset manual flag when prompt changes
  useEffect(() => {
    setIsManualSelect(false);
  }, [promptText]);

  // Labels mapping for Task 1 & Task 2 types
  const task1TypeLabels: Record<Task1Type, { name: string; desc: string; icon: any }> = {
    line_dynamic: { name: "Line Graph (Đường / Xu hướng)", desc: "Biểu đồ đường biến đổi theo thời gian", icon: TrendingUp },
    bar_chart: { name: "Bar Chart (Biểu đồ Cột)", desc: "So sánh các hạng mục / Cột theo thời gian", icon: BarChart2 },
    table_data: { name: "Table (Bảng Số Liệu)", desc: "Bảng dữ liệu nhiều mốc hoặc so sánh tĩnh", icon: Grid },
    pie_chart: { name: "Pie Chart (Biểu đồ Tròn)", desc: "Tỷ lệ phần trăm và cơ cấu thị phần", icon: PieChart },
    process_diagram: { name: "Process (Sơ đồ Quy trình)", desc: "Quy trình sản xuất nhân tạo hoặc vòng đời tự nhiên", icon: GitCommit },
    map_diagram: { name: "Map (Bản đồ Biến đổi)", desc: "Sự thay đổi địa lý / hạ tầng qua các năm", icon: MapPin },
    mixed_charts: { name: "Mixed Charts (Kết hợp)", desc: "Kết hợp 2 dạng biểu đồ khác nhau", icon: Layers },
  };

  const task2TypeLabels: Record<Task2Type, { name: string; desc: string; icon: any }> = {
    agree_disagree: { name: "Agree or Disagree", desc: "Tán thành hoặc phản đối quan điểm", icon: CheckSquare },
    discuss_both: { name: "Discuss Both Views", desc: "Thảo luận 2 góc nhìn & đưa ra ý kiến cá nhân", icon: Compass },
    adv_disadv: { name: "Advantages & Disadvantages", desc: "Phân tích Mặt tốt & Mặt xấu / Outweigh", icon: Sparkles },
    problem_solution: { name: "Causes & Solutions", desc: "Nguyên nhân & Giải pháp / Tác động", icon: HelpCircle },
    two_part: { name: "Two-Part / Direct Questions", desc: "Trả lời trực tiếp 2 câu hỏi từ đề bài", icon: FileText },
  };

  // Render Target Band Info Badge
  const bandBadges: Record<BandLevel, { name: string; target: string; color: string; desc: string }> = {
    B1: { name: "Band B1", target: "5.0+", color: "bg-amber-100 text-amber-900 border-amber-300", desc: "Đạt yêu cầu tối thiểu, bố cục rõ ràng, từ vựng/ngữ pháp đơn giản nhưng đúng trọng tâm." },
    B2: { name: "Band B2", target: "6.0+", color: "bg-blue-100 text-blue-900 border-blue-300", desc: "Bố cục mạch lạc, có Overview/Thesis rõ ràng, từ vựng học thuật khá, ít lỗi nghiêm trọng." },
    C1: { name: "Band C1", target: "7.0+", color: "bg-indigo-100 text-indigo-900 border-indigo-300", desc: "Phân tích sâu sắc, nhóm dữ liệu logic, từ vựng học thuật đa dạng, ngữ pháp phức tạp và chính xác cao." },
    C2: { name: "Band C2", target: "7.5+", color: "bg-purple-100 text-purple-900 border-purple-300", desc: "Lập luận thượng thừa, diễn đạt tự nhiên như người bản xứ, liên kết mượt mà tuyệt đối." },
  };

  // Helper to generate distinct criteria (TA/TR, CC, LR, GRA) per Band Level and Essay Type as arrays of positive features
  const getCriteriaForBandAndType = (
    typeKind: "task1" | "task2",
    eType: Task1Type | Task2Type,
    band: BandLevel
  ): CriteriaDetails => {
    if (typeKind === "task1") {
      const t1Type = eType as Task1Type;
      if (t1Type === "map_diagram") {
        switch (band) {
          case "B1":
            return {
              ta: [
                "Nêu được 2-3 sự thay đổi chính trên bản đồ",
                "Có đoạn Overview ngắn đề cập đến sự thay đổi chung",
                "Mô tả cơ bản vị trí các công trình chính (nhưng còn bỏ sót chi tiết)",
              ],
              cc: [
                "Chia bài thành 3-4 đoạn rõ ràng (Mở bài, Overview, 2 Thân bài)",
                "Sử dụng từ nối vị trí cơ bản: In the north, Near, Next to, On the left, After that",
              ],
              lr: [
                "Sử dụng động từ mô tả thay đổi đơn giản: build, make, remove, change, turn into",
                "Sử dụng danh từ địa điểm quen thuộc: house, road, park, shop",
              ],
              gra: [
                "Sử dụng câu đơn và câu ghép cơ bản",
                "Áp dụng thì quá khứ đơn và thể bị động cơ bản: was built, was removed",
              ],
            };
          case "B2":
            return {
              ta: [
                "Mô tả đầy đủ các thay đổi quy hoạch chính (xây mới, dỡ bỏ, di dời, mở rộng)",
                "Overview nêu rõ xu hướng đô thị hóa, công nghiệp hóa hoặc thương mại hóa",
                "So sánh đối chiếu rõ nét giữa 2 khoảng thời gian / 2 bản đồ",
              ],
              cc: [
                "Bố cục phân đoạn logic theo khu vực địa lý (Phía Bắc/Nam hoặc khu trung tâm/ngoại ô)",
                "Sử dụng liên kết không gian chính xác: To the west of, Adjacent to, In the southern sector, Flanked by",
              ],
              lr: [
                "Vốn từ quy hoạch chuẩn xác: demolished, replaced by, converted into, relocated, modernized, residential area",
                "Sử dụng linh hoạt từ chỉ sự mở rộng: expanded, widened, extended",
              ],
              gra: [
                "Kết hợp thành thục thể bị động: was constructed, were replaced, was converted",
                "Mệnh đề quan hệ & câu phức chỉ mục đích: cleared to make way for, demolished to accommodate",
              ],
            };
          case "C1":
            return {
              ta: [
                "Phân tích quy hoạch sắc bén, nhóm các sự thay đổi theo khu vực/công năng cực kỳ logic",
                "Overview tổng quát được bức tranh chuyển đổi diện mạo vĩ mô xuất sắc",
                "Mô tả chính xác tuyệt đối mọi chi tiết mà không bị sa đà vào liệt kê vặt",
              ],
              cc: [
                "Mạch liên kết không gian tự nhiên và linh hoạt: Flanking the thoroughfare, Directly opposite, Concurrently, Positioned in the vicinity of",
                "Chuyển đoạn trôi chảy không dùng khuôn mẫu cứng nhắc",
              ],
              lr: [
                "Vốn từ quy hoạch & hạ tầng nâng cao: urban expansion, infrastructure overhaul, commercial complex, residential layout, structural transformation",
                "Dùng danh từ hóa tinh tế: the demolition of X, the erection of Y",
              ],
              gra: [
                "Làm chủ mệnh đề phân từ vị trí: Situated along the coastline, X was built...",
                "Sử dụng thể bị động hoàn thành: has been transformed into, has seen the replacement of",
                "Độ chính xác ngữ pháp và dấu câu xấp xỉ 100%",
              ],
            };
          case "C2":
            return {
              ta: [
                "Đánh giá tái quy hoạch toàn diện, nhận diện sắc bén sự thay đổi chức năng sử dụng đất (land use)",
                "Overview khái quát tầm nhìn quy hoạch tổng thể ấn tượng",
                "So sánh đối chiếu diện mạo trước - sau hoàn hảo không tì vết",
              ],
              cc: [
                "Mạch liên kết không gian trôi chảy mượt mà không dấu vết (Seamless spatial cohesion)",
                "Điều tiết nhịp điệu diễn đạt không gian tinh tế và tự nhiên tuyệt đối",
              ],
              lr: [
                "Dùng thuật ngữ quy hoạch đô thị bản xứ sắc bén: reconfiguration, land use transformation, pedestrianized zone, commercial hub, gentrification",
                "Phối hợp collocations chuẩn mực người bản xứ",
              ],
              gra: [
                "Ngữ pháp chính xác tuyệt đối 100%",
                "Linh hoạt các cấu trúc phức kết hợp tả biến đổi không gian, nhịp điệu câu cực kỳ tự nhiên",
              ],
            };
        }
      } else if (t1Type === "process_diagram") {
        switch (band) {
          case "B1":
            return {
              ta: [
                "Liệt kê đầy đủ các bước chính từ đầu đến cuối quy trình",
                "Overview nêu được tổng số bước hoặc điểm bắt đầu/kết thúc cơ bản",
              ],
              cc: [
                "Chia bài thành các đoạn rõ ràng theo các giai đoạn chính",
                "Sử dụng từ nối thứ tự đơn giản: First, Second, Then, Next, After that, Finally",
              ],
              lr: [
                "Sử dụng động từ hành động đơn giản: put, take, heat, make, clean, send, mix",
                "Sử dụng danh từ chỉ nguyên liệu và dụng cụ cơ bản",
              ],
              gra: [
                "Sử dụng câu đơn và câu ghép cơ bản",
                "Áp dụng thì hiện tại đơn ở thể chủ động và bị động đơn giản: is washed, are mixed",
              ],
            };
          case "B2":
            return {
              ta: [
                "Mô tả trọn vẹn từ nguyên liệu đầu vào đến thành phẩm cuối cùng, không bỏ sót bước",
                "Overview tóm tắt tổng số bước & điểm bắt đầu/kết thúc rõ ràng",
                "Phân biệt rõ ràng các nhánh quy trình hoặc quy trình khép kín / tuần hoàn",
              ],
              cc: [
                "Mạch nối chuỗi giai đoạn mạch lạc: Initially, In the subsequent stage, Once X is completed, Prior to being packaged",
                "Nhóm các bước nhỏ thành 2 đoạn thân bài cân đối",
              ],
              lr: [
                "Từ vựng quy trình chuyên biệt: harvested, extracted, sorted, shredded, extruded, packaged, transformed",
                "Sử dụng thuật ngữ kỹ thuật phù hợp với ngữ cảnh sơ đồ",
              ],
              gra: [
                "Thành thạo thể bị động hiện tại đơn: are collected, is melted, is refined",
                "Sử dụng mệnh đề thời gian kết nối các bước: Once the bottles are shredded, ... / After being heated, ...",
              ],
            };
          case "C1":
            return {
              ta: [
                "Phân tích mối quan hệ logic giữa các giai đoạn (sơ chế -> tinh chế -> đóng gói/phân phối)",
                "Overview khái quát bản chất chuyển hóa (sản xuất công nghiệp hay chu trình tự nhiên)",
                "Mô tả chính xác cơ chế hoạt động mà không thêm thắt ý kiến cá nhân",
              ],
              cc: [
                "Mạch liên kết trôi chảy linh hoạt: The process commences with..., Following this, ..., Subsequently, ..., culminating in...",
                "Sử dụng từ tham chiếu tự nhiên: this raw material, these newly formed flakes",
              ],
              lr: [
                "Vốn từ sản xuất & chuyển hóa nâng cao: undergoes a treatment process, refined into, converted into, subjected to high temperatures, distributed to markets",
                "Paraphrase linh hoạt tên gọi các công đoạn",
              ],
              gra: [
                "Sử dụng thành thục mệnh đề phân từ: Having been sorted, the items are washed... / ...thereby facilitating the extraction of X",
                "Kiểm soát cấu trúc câu phức nguyên nhân-kết quả và bị động nâng cao",
              ],
            };
          case "C2":
            return {
              ta: [
                "Khái quát hóa quy trình và cơ chế chuyển hóa vĩ mô hoàn hảo",
                "Mô tả chính xác từng phản ứng, thao tác kỹ thuật và nguyên lý vận hành",
                "Overview thể hiện tư duy phân tích kỹ thuật đẳng cấp",
              ],
              cc: [
                "Chuỗi liên kết giai đoạn trôi chảy tuyệt đối (Seamless sequential flow)",
                "Xâu chuỗi chu kỳ logic tự nhiên, nhịp văn miêu tả quy trình chuyên nghiệp",
              ],
              lr: [
                "Ngôn ngữ quy trình & khoa học bản xứ tinh tế",
                "Collocations chuyên ngành sản xuất/sinh học chuẩn xác tuyệt đối",
              ],
              gra: [
                "Ngữ pháp chuẩn xác 100%",
                "Làm chủ các cấu trúc câu phức tả quy trình tuần hoàn/liên tục phức tạp",
              ],
            };
        }
      } else {
        // Line, Bar, Table, Pie, Mixed
        switch (band) {
          case "B1":
            return {
              ta: [
                "Nêu được các số liệu/tỷ lệ chính nổi bật",
                "Overview đề cập đến xu hướng tổng thể hoặc nhóm lớn nhất (dù còn sơ sài)",
              ],
              cc: [
                "Chia bài rõ ràng thành 3-4 đoạn",
                "Sử dụng từ nối cơ bản: In 2010, Also, Compared to, In contrast, Finally",
              ],
              lr: [
                "Từ vựng chỉ xu hướng & số liệu đơn giản: go up, go down, big, small, percent, chart shows",
                "Mắc ít lỗi từ vựng/chính tả",
              ],
              gra: [
                "Sử dụng câu đơn và câu ghép cơ bản",
                "Chú ý sử dụng đúng giới từ đi kèm số liệu: increase to, stand at",
              ],
            };
          case "B2":
            return {
              ta: [
                "Chọn lọc điểm số liệu then chốt (đỉnh, đáy, mốc giao thoa, chênh lệch lớn)",
                "Overview nêu rõ xu hướng vĩ mô hoặc nhóm chiếm tỷ trọng thống trị",
                "So sánh đối chiếu số liệu giữa các nhóm một cách có hệ thống",
              ],
              cc: [
                "Bố cục so sánh mạch lạc theo tiêu chí logic (theo thời gian hoặc theo hạng mục)",
                "Sử dụng từ nối so sánh/đối lập chuẩn: In contrast, Respectively, Followed by, Accounted for",
              ],
              lr: [
                "Từ vựng xu hướng & cơ cấu chuẩn: experienced a steady rise, recorded a drop, constituted, represented a major share, plateaued",
                "Tránh lặp lại từ vựng bằng cách dùng đa dạng từ chỉ số liệu: percentage, proportion, figure, rate",
              ],
              gra: [
                "Sử dụng linh hoạt câu phức so sánh: twice as high as, accounting for 35%, which was higher than...",
                "Chia thì chuẩn xác theo mốc thời gian trong đề bài",
              ],
            };
          case "C1":
            return {
              ta: [
                "Nhóm số liệu thông minh (logical data grouping) theo đặc điểm tương đồng hoặc đối lập",
                "Overview phác họa bức tranh tổng thể sắc bén và đắt giá",
                "Phân tích sự thay đổi khoảng cách (gap widened/narrowed) và mối tương quan giữa các đối tượng",
              ],
              cc: [
                "Kết nối tự nhiên bằng phép thế đại từ: this figure, these trends, the former / the latter",
                "Sự chuyển tiếp giữa các đoạn so sánh mượt mà, không bị cứng nhắc theo khuôn mẫu",
              ],
              lr: [
                "Vốn từ mô tả số liệu & cơ cấu nâng cao: dominant proportion, marginal fraction, experienced a threefold increase, overtakes, fluctuates wildly",
                "Dùng linh hoạt các cấu trúc paraphrase chỉ số lượng",
              ],
              gra: [
                "Sử dụng mệnh đề phân từ rút gọn: Starting at 40%, X surged to reach..., before dropping to...",
                "Cấu trúc đảo ngữ so sánh & kiểm soát tuyệt đối ngữ pháp, dấu câu",
              ],
            };
          case "C2":
            return {
              ta: [
                "Đọc vị bức tranh dữ liệu vĩ mô & vi mô xuất sắc, chọn lọc điểm nổi bật hoàn hảo",
                "So sánh đối chiếu đa chiều, phân tích xu hướng và tương quan dữ liệu đỉnh cao",
                "Overview cô đọng, sắc sảo như bản báo cáo phân tích chuyên nghiệp",
              ],
              cc: [
                "Mạch văn phân tích dữ liệu liền mạch tự nhiên (Seamless data synthesis)",
                "Điều tiết nhịp điệu so sánh tinh tế, không có dấu vết của bài thi mẫu",
              ],
              lr: [
                "Thuật ngữ phân tích thống kê bản xứ: sluggish growth, steep trajectory, disparity, market share erosion, peak value",
                "Collocations chuyên sâu về dữ liệu kinh tế/xã hội",
              ],
              gra: [
                "Ngữ pháp chính xác tuyệt đối 100%",
                "Biến hóa phong phú mọi cấu trúc câu phức so sánh và phân tích xu hướng",
              ],
            };
        }
      }
    } else {
      // Task 2
      const t2Type = eType as Task2Type;
      if (t2Type === "problem_solution") {
        switch (band) {
          case "B1":
            return {
              ta: [
                "Nêu được 1-2 nguyên nhân và 1-2 giải pháp cho vấn đề",
                "Giải pháp tương đối phù hợp với nguyên nhân đã nêu",
              ],
              cc: [
                "Chia 4 đoạn rõ ràng (Body 1: Causes, Body 2: Solutions)",
                "Sử dụng từ nối cơ bản: One reason is, Another problem is, To solve this, First, Second",
              ],
              lr: [
                "Từ vựng chủ đề đơn giản: cause, problem, reason, solution, help, stop, government should",
                "Ít lỗi từ vựng",
              ],
              gra: [
                "Dùng câu đơn và câu ghép cơ bản",
                "Sử dụng đúng động từ khuyết thiếu đề xuất: should, can, need to",
              ],
            };
          case "B2":
            return {
              ta: [
                "Phân tích rõ ràng CẢ nguyên nhân VÀ giải pháp",
                "Các giải pháp tương ứng trực tiếp và giải quyết triệt để các nguyên nhân ở Thân bài 1",
                "Mỗi ý đều có giải thích và tác động đi kèm",
              ],
              cc: [
                "Chuyển ý giữa nguyên nhân và giải pháp mạch lạc: Chief among the causes is..., To address this issue, a practical solution is...",
                "Từ nối nguyên nhân - kết quả chuẩn xác",
              ],
              lr: [
                "Từ vựng chuyên biệt: root cause, underlying factor, mitigate, implement policies, alleviate, feasible measure",
                "Collocations về chính sách & giải pháp",
              ],
              gra: [
                "Sử dụng câu điều kiện cho giải pháp: If governments introduce..., it would...",
                "Sử dụng thể bị động đề xuất: Strict rules should be implemented / Measures ought to be taken",
              ],
            };
          case "C1":
            return {
              ta: [
                "Phân tích cơ chế tác động của nguyên nhân gốc rễ (root cause)",
                "Đề xuất hệ thống giải pháp đa tầng (chính phủ, nhà trường, cá nhân) có tính khả thi và bền vững cao",
                "Đánh giá tính hiệu quả thực tế của các biện pháp",
              ],
              cc: [
                "Mạch liên kết nhân - quả logic sâu sắc: Consequently, This exacerbates the situation, To counteract this trend, ...",
                "Mạch dẫn dắt từ vấn đề sang giải pháp trôi chảy",
              ],
              lr: [
                "Từ vựng chuyên sâu: exacerbate, curbing the problem, multi-pronged strategy, systemic issue, enforce strict regulations",
                "Dùng từ vựng học thuật phong phú",
              ],
              gra: [
                "Đa dạng cấu trúc giả định: Were governments to enact..., By virtue of implementing...",
                "Bị động nâng cao và kiểm soát tốt dấu câu",
              ],
            };
          case "C2":
            return {
              ta: [
                "Đào sâu bản chất xã hội/kinh tế của vấn đề",
                "Giải pháp mang tính chiến lược dài hạn và toàn diện tuyệt đối",
                "Tầm nhìn xử lý triệt để nguyên nhân vĩ mô",
              ],
              cc: [
                "Liên kết nhân - quả và đề xuất giải pháp liền mạch hoàn hảo (Seamless cause-effect-solution logic)",
                "Mạch suy luận tự nhiên",
              ],
              lr: [
                "Từ ngữ bản xứ sắc bén, thuật ngữ chính sách & giải pháp chuẩn xác tuyệt đối: policy framework, socio-economic fallout, preventative measures",
                "Sử dụng collocations đắt giá",
              ],
              gra: [
                "Ngữ pháp chính xác 100%",
                "Cấu trúc câu phức diễn đạt cơ chế tác động & giải pháp biến hóa tinh tế",
              ],
            };
        }
      } else if (t2Type === "discuss_both") {
        switch (band) {
          case "B1":
            return {
              ta: [
                "Thảo luận được cả 2 góc nhìn từ đề bài",
                "Nêu được ý kiến cá nhân (ở Mở bài hoặc Kết bài)",
                "Mỗi góc nhìn có 1-2 ý giải thích cơ bản",
              ],
              cc: [
                "Bố cục 4 đoạn rõ ràng (Thân bài 1: Góc nhìn 1, Thân bài 2: Góc nhìn 2)",
                "Sử dụng từ nối đối lập cơ bản: On the one hand, On the other hand, In my opinion, However",
              ],
              lr: [
                "Từ vựng chủ đề ở mức thông dụng: some people think, other people believe, good side, bad side",
                "Sử dụng từ ngữ bám sát đề bài",
              ],
              gra: [
                "Sử dụng câu đơn, câu ghép",
                "Mắc một số lỗi nhỏ về câu nhượng bộ hoặc chia động từ",
              ],
            };
          case "B2":
            return {
              ta: [
                "Thảo luận cân bằng cả 2 góc nhìn với các lý lẽ rõ ràng",
                "Thesis Statement khẳng định rõ lập trường cá nhân nghiêng về góc nhìn nào ngay từ Mở bài",
                "Mỗi thân bài phát triển luận điểm đầy đủ kèm giải thích và dẫn chứng",
              ],
              cc: [
                "Bố cục thảo luận đối lập mạch lạc: On the one hand..., On the other hand..., While there are valid arguments for X, I side with Y...",
                "Mỗi đoạn có Topic sentence làm kim chỉ nam",
              ],
              lr: [
                "Từ vựng thảo luận đa chiều: proponents, supporters, argue, contend, perspective, valid grounds, career-oriented",
                "Sử dụng từ nối học thuật phù hợp",
              ],
              gra: [
                "Thành thạo câu nhượng bộ: While X offers benefits, Y is more crucial",
                "Sử dụng mệnh đề quan hệ và câu phức linh hoạt",
              ],
            };
          case "C1":
            return {
              ta: [
                "Thảo luận công bằng 2 góc nhìn với các lý lẽ có trọng lượng cao",
                "Giải thích rõ ràng tại sao góc nhìn được chọn lại vượt trội hơn góc nhìn còn lại",
                "Lập luận sắc bén, dẫn chứng mang tính thực tiễn cao",
              ],
              cc: [
                "Chuyển tiếp góc nhìn mượt mà: Advocates of X contend that..., conversely, supporters of Y emphasize that..., In my view, the latter is more convincing...",
                "Sử dụng mạch liên kết ý tưởng thay vì chỉ phụ thuộc vào liên từ",
              ],
              lr: [
                "Vốn từ học thuật thảo luận sâu rộng: proponents, detractors, advocate, hold the view, valid rationale, paramount importance",
                "Paraphrase linh hoạt 2 góc nhìn",
              ],
              gra: [
                "Sử dụng thành thục mệnh đề nhượng bộ nâng cao: Granted that X holds merit, it is Y that truly determines...",
                "Cấu trúc câu biến hóa, ngữ pháp và dấu câu chuẩn xác",
              ],
            };
          case "C2":
            return {
              ta: [
                "Phân tích 2 góc nhìn dưới lăng kính đa chiều đanh thép",
                "Lập trường cá nhân được bảo vệ bằng lập luận triết học/thực tiễn áp đảo",
                "Đánh giá sự cân bằng giữa 2 luồng ý kiến đỉnh cao",
              ],
              cc: [
                "Sự kết nối giữa 2 luồng tư duy hoàn hảo (Seamless dual-perspective balance)",
                "Mạch văn thảo luận tự nhiên, tinh tế",
              ],
              lr: [
                "Từ ngữ bản xứ tự nhiên tuyệt đối",
                "Collocations phản biện sắc sảo: compelling justification, overarching principle, substantiated claim",
              ],
              gra: [
                "Ngữ pháp chính xác 100%",
                "Làm chủ các cấu trúc phức phản biện & nhượng bộ tinh xảo",
              ],
            };
        }
      } else if (t2Type === "adv_disadv") {
        switch (band) {
          case "B1":
            return {
              ta: [
                "Nêu được ít nhất 1 Ưu điểm và 1 Nhược điểm",
                "Có đề cập vế nào nhiều hơn / tốt hơn hay xấu hơn",
                "Giải thích lý do đơn giản",
              ],
              cc: [
                "Chia đoạn rõ ràng (Body 1: Disadvantages, Body 2: Advantages)",
                "Sử dụng từ nối cơ bản: One advantage is, One disadvantage is, On the positive side, On the negative side",
              ],
              lr: [
                "Từ vựng lợi - hại cơ bản: good, bad, advantage, disadvantage, problem, helpful",
                "Ít mắc lỗi chính tả nghiêm trọng",
              ],
              gra: [
                "Dùng câu đơn và câu ghép cơ bản",
                "Mắc lỗi nhỏ về thì hoặc từ nối",
              ],
            };
          case "B2":
            return {
              ta: [
                "Phân tích rõ ràng cả Ưu điểm VÀ Nhược điểm",
                "Khẳng định rõ vế nào áp đảo (Outweigh) ngay trong Thesis Statement ở Mở bài",
                "Phát triển lý lẽ mạch lạc ở cả 2 đoạn thân bài",
              ],
              cc: [
                "Cấu trúc cân đo lợi - hại mạch lạc: Chief among the drawbacks is..., However, these are counterbalanced by..., The main benefit lies in...",
                "Sử dụng liên từ đối lập hiệu quả",
              ],
              lr: [
                "Từ vựng ưu/nhược điểm học thuật: advantages, drawbacks, merits, shortcomings, offset, counterbalance, outweigh",
                "Dùng từ chính xác theo ngữ cảnh",
              ],
              gra: [
                "Sử dụng câu phức nhượng bộ và điều kiện: While X poses risks, its benefits are far more pronounced",
                "Kiểm soát tốt thì và cấu trúc câu",
              ],
            };
          case "C1":
            return {
              ta: [
                "Phân tích tác động lâu dài của cả 2 mặt (ngắn hạn vs dài hạn / cá nhân vs xã hội)",
                "Đưa ra lý do thuyết phục tại sao mặt tích cực lại vượt trội hơn mặt tiêu cực",
                "Lập luận đòn bẩy chứng minh tính áp đảo",
              ],
              cc: [
                "Mạch lập luận so sánh lợi - hại tự nhiên: Although the drawbacks are non-negligible, they are heavily outweighed by...",
                "Liên kết ý sâu sắc bằng phép thế và từ nối nâng cao",
              ],
              lr: [
                "Vốn từ lợi/hại phong phú: double-edged sword, detrimental impact, lucrative opportunity, eclipse the drawbacks, far-reaching benefits",
                "Paraphrase linh hoạt không lặp từ",
              ],
              gra: [
                "Cấu trúc câu phức nhượng bộ nâng cao, mệnh đề giả định và bị động kiểm soát tốt",
                "Độ chính xác ngữ pháp cao",
              ],
            };
          case "C2":
            return {
              ta: [
                "Đánh giá tác động hai mặt cấp độ vĩ mô sắc bén",
                "Lập luận áp đảo thuyết phục tuyệt đối không thể bác bỏ",
                "Tầm nhìn toàn diện về cân bằng chi phí - lợi ích (cost-benefit)",
              ],
              cc: [
                "Sự chuyển tiếp giữa lợi và hại trôi chảy tuyệt đối (Seamless cost-benefit analysis)",
                "Nhịp văn uyển chuyển, tự nhiên",
              ],
              lr: [
                "Từ ngữ bản xứ tinh tế: inherent flaws, transformative potential, outweighing factors, mitigate risks",
                "Sử dụng collocations chuẩn mực",
              ],
              gra: [
                "Ngữ pháp chuẩn xác 100%",
                "Làm chủ mọi cấu trúc phức so sánh & đánh giá trọng lượng",
              ],
            };
        }
      } else if (t2Type === "two_part") {
        switch (band) {
          case "B1":
            return {
              ta: [
                "Trả lời được cả 2 câu hỏi trong đề bài (mỗi câu ở 1 đoạn thân bài)",
                "Giải thích ý ở mức cơ bản",
              ],
              cc: [
                "Chia đoạn rõ ràng (Body 1: Question 1, Body 2: Question 2)",
                "Dùng từ nối cơ bản: Regarding the first question, About the second question, Also, Because",
              ],
              lr: [
                "Từ vựng thông dụng bám sát từ ngữ trong đề bài",
                "Mắc ít lỗi từ vựng",
              ],
              gra: [
                "Câu đơn và câu ghép cơ bản",
                "Mắc ít lỗi ngữ pháp nghiêm trọng",
              ],
            };
          case "B2":
            return {
              ta: [
                "Trả lời trực tiếp, đầy đủ CẢ 2 CÂU HỎI trong 2 đoạn thân bài tương ứng",
                "Thesis Statement ở Mở bài tóm tắt câu trả lời cho cả 2 câu hỏi",
                "Phát triển luận điểm rõ ràng kèm giải thích",
              ],
              cc: [
                "Chuyển tiếp mượt mà giữa 2 câu hỏi: Regarding the reasons for X..., Turning to whether this is a positive trend...",
                "Mỗi thân bài tập trung giải quyết 1 câu hỏi",
              ],
              lr: [
                "Từ vựng linh hoạt bám sát chủ đề của 2 câu hỏi",
                "Paraphrase từ vựng trong đề bài để tránh lặp từ",
              ],
              gra: [
                "Kết hợp câu đơn, câu ghép và câu phức phù hợp với ngữ cảnh của từng câu hỏi",
                "Kiểm soát tốt ngữ pháp",
              ],
            };
          case "C1":
            return {
              ta: [
                "Trả lời sâu sắc và thỏa đáng cả 2 câu hỏi",
                "Phát triển ý ngắn gọn nhưng có trọng lượng và lập luận sắc bén",
                "Nêu bật mối liên hệ logic giữa câu hỏi 1 và câu hỏi 2",
              ],
              cc: [
                "Liên kết logic tự nhiên giữa 2 câu hỏi: In addressing the initial query..., With respect to the second issue...",
                "Liên kết ý trôi chảy không bị khiên cưỡng",
              ],
              lr: [
                "Vốn từ học thuật phong phú theo từng câu hỏi",
                "Paraphrase linh hoạt không lặp từ đề bài, dùng collocations tự nhiên",
              ],
              gra: [
                "Đa dạng các cấu trúc phức (câu nguyên nhân-kết quả, câu điều kiện, câu bị động)",
                "Độ chính xác ngữ pháp cao",
              ],
            };
          case "C2":
            return {
              ta: [
                "Giải quyết triệt để 2 câu hỏi với góc nhìn độc đáo, thuyết phục tuyệt đối",
                "Lập luận sắc sảo, dẫn chứng thực tiễn áp đảo",
                "Đánh giá toàn diện và bản chất của 2 câu hỏi",
              ],
              cc: [
                "Kết nối 2 vấn đề trôi chảy hoàn hảo (Seamless transition between queries)",
                "Nhịp văn điều tiết linh hoạt",
              ],
              lr: [
                "Ngôn ngữ bản xứ tinh tế, sử dụng collocations chuyên sâu bám sát 2 nội dung câu hỏi",
                "Từ vựng đắt giá, ngữ cảnh chuẩn xác",
              ],
              gra: [
                "Ngữ pháp chính xác 100%",
                "Cấu trúc câu linh hoạt biến hóa tinh xảo",
              ],
            };
        }
      } else {
        // Agree or Disagree
        switch (band) {
          case "B1":
            return {
              ta: [
                "Nêu được rõ lập trường (Đồng ý hay Phản đối) trong Mở bài hoặc Kết bài",
                "Đưa ra được 2 lý do hỗ trợ quan điểm chính",
                "Giải thích ý ở mức cơ bản, ví dụ đơn giản",
              ],
              cc: [
                "Bố cục 4 đoạn rõ ràng (Mở bài, 2 Thân bài, Kết bài)",
                "Sử dụng từ nối cơ bản: Firstly, Secondly, On the other hand, In conclusion, Because",
              ],
              lr: [
                "Từ vựng thông dụng theo chủ đề bài viết",
                "Mắc một số lỗi từ vựng/chính tả nhỏ không gây hiểu lầm",
              ],
              gra: [
                "Sử dụng câu đơn và câu ghép cơ bản",
                "Kiểm soát thì hiện tại/quá khứ và chia động từ số ít/số nhiều",
              ],
            };
          case "B2":
            return {
              ta: [
                "Lập trường (Thesis Statement) nhất quán từ Mở bài đến Kết bài",
                "Trả lời trọn vẹn câu hỏi, các đoạn thân bài phát triển theo mô hình Luận điểm -> Giải thích -> Ví dụ",
                "Phân tích rõ ràng các tác động tiêu cực/tích cực",
              ],
              cc: [
                "Bố cục mạch lạc, các đoạn thân bài tập trung vào 1 ý chủ đạo (Topic sentence rõ ràng)",
                "Sử dụng từ nối học thuật: Furthermore, Consequently, However, As a result, In light of this",
              ],
              lr: [
                "Sử dụng vốn từ học thuật khá phong phú bám sát chủ đề",
                "Áp dụng các collocations quen thuộc, ít lỗi word form (dạng từ)",
              ],
              gra: [
                "Phối hợp linh hoạt câu đơn, câu ghép và câu phức (câu điều kiện, mệnh đề quan hệ)",
                "Ít lỗi ngữ pháp nghiêm trọng, đảm bảo câu văn rõ nghĩa",
              ],
            };
          case "C1":
            return {
              ta: [
                "Lập trường sắc bén, lập luận từng đoạn theo mô hình PEEL (Point -> Explanation -> Example -> Link)",
                "Phân tích chiều sâu tác động vĩ mô (kinh tế, xã hội, tâm lý) thuyết phục",
                "Xử lý phản biện/nhượng bộ (Counter-argument) mượt mà để củng cố quan điểm",
              ],
              cc: [
                "Mạch liên kết tự nhiên bằng phép thế đại từ, từ đồng nghĩa và cấu trúc chuyển tiếp nâng cao",
                "Mạch suy luận chặt chẽ, các ý liên kết logic không cần lạm dụng liên từ",
              ],
              lr: [
                "Vốn từ học thuật sâu rộng (Academic vocabulary & Topic-specific collocations)",
                "Diễn đạt linh hoạt bằng paraphrase tự nhiên, dùng từ chính xác ngữ cảnh",
              ],
              gra: [
                "Thành thạo các cấu trúc phức nâng cao: mệnh đề nhượng bộ (Although/While), phân từ rút gọn, câu giả định, bị động",
                "Độ chính xác ngữ pháp cao, làm chủ dấu câu",
              ],
            };
          case "C2":
            return {
              ta: [
                "Lập luận đanh thép, chiều sâu triết học/thực tiễn sắc sảo, thuyết phục tuyệt đối",
                "Giải quyết góc nhìn đa chiều đỉnh cao, lập trường nhất quán hoàn hảo",
                "Mọi luận điểm đều được bảo vệ bằng lập luận chắc chắn",
              ],
              cc: [
                "Mạch văn trôi chảy tự nhiên không dấu vết (Seamless cohesion)",
                "Dẫn dắt suy luận mượt mà thượng thừa, nhịp văn uyển chuyển",
              ],
              lr: [
                "Sử dụng từ ngữ bản xứ tinh tế, collocations & thuật ngữ nâng cao chuẩn xác 100%",
                "Lối diễn đạt bóng bẩy nhưng tự nhiên và đắt giá",
              ],
              gra: [
                "Ngữ pháp chính xác tuyệt đối 100%",
                "Làm chủ hoàn toàn mọi cấu trúc phức tạp với sức nặng lập luận cao",
              ],
            };
        }
      }
    }
  };

  const activeEssayType = taskType === "task1" ? task1EssayType : task2EssayType;
  const currentTypeLabel =
    taskType === "task1" ? task1TypeLabels[task1EssayType] : task2TypeLabels[task2EssayType];

  const criteria = getCriteriaForBandAndType(taskType, activeEssayType, selectedBand);

  return (
    <div className="space-y-5">
      {/* HEADER SECTION: ESSAY TYPE SELECTOR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-900 text-white rounded-xl shadow-xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-blue-950 text-sm sm:text-base uppercase tracking-wide">
                TIÊU CHÍ ĐÁNH GIÁ THEO DẠNG BÀI ({taskType === "task1" ? "TASK 1" : "TASK 2"})
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Hệ thống tự động nhận diện dạng bài hoặc bạn có thể chọn thủ công bên dưới:
              </p>
            </div>
          </div>

          {/* Badge Active Type */}
          <div className="flex items-center gap-2">
            {isManualSelect ? (
              <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md font-bold border border-indigo-200">
                ✍️ Chọn Thủ Công
              </span>
            ) : (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold border border-emerald-200">
                🤖 Tự Động Nhận Diện
              </span>
            )}
            <span className="text-xs font-black bg-blue-900 text-yellow-300 px-2.5 py-1 rounded-lg border border-blue-900">
              {currentTypeLabel.name}
            </span>
          </div>
        </div>

        {/* Horizontal Pills Selection */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {taskType === "task1"
            ? (Object.keys(task1TypeLabels) as Task1Type[]).map((typeKey) => {
                const item = task1TypeLabels[typeKey];
                const IconComp = item.icon;
                const isSelected = task1EssayType === typeKey;

                return (
                  <button
                    key={typeKey}
                    type="button"
                    onClick={() => {
                      setTask1EssayType(typeKey);
                      setIsManualSelect(true);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                      isSelected
                        ? "bg-blue-900 text-white border-blue-900 shadow-sm ring-2 ring-yellow-400"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300"
                    }`}
                  >
                    <IconComp className={`w-3.5 h-3.5 ${isSelected ? "text-yellow-400" : "text-blue-900"}`} />
                    <span>{item.name}</span>
                  </button>
                );
              })
            : (Object.keys(task2TypeLabels) as Task2Type[]).map((typeKey) => {
                const item = task2TypeLabels[typeKey];
                const IconComp = item.icon;
                const isSelected = task2EssayType === typeKey;

                return (
                  <button
                    key={typeKey}
                    type="button"
                    onClick={() => {
                      setTask2EssayType(typeKey);
                      setIsManualSelect(true);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                      isSelected
                        ? "bg-blue-900 text-white border-blue-900 shadow-sm ring-2 ring-yellow-400"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300"
                    }`}
                  >
                    <IconComp className={`w-3.5 h-3.5 ${isSelected ? "text-yellow-400" : "text-indigo-900"}`} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
        </div>
      </div>

      {/* Target Band Switcher Buttons (B1, B2, C1, C2) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-4 h-4 text-blue-900" />
            <span>Chọn Điểm Mục Tiêu (Target Band Score):</span>
          </label>
          <span className="text-[11px] text-slate-500 font-medium">Bấm chọn 1 trong 4 mức độ:</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {(["B1", "B2", "C1", "C2"] as BandLevel[]).map((band) => {
            const isSelected = selectedBand === band;
            const badge = bandBadges[band];

            return (
              <button
                key={band}
                type="button"
                onClick={() => setSelectedBand(band)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-blue-900 text-white border-blue-900 shadow-md ring-2 ring-yellow-400 scale-[1.02]"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-black uppercase px-2 py-0.5 rounded-md ${
                      isSelected
                        ? "bg-yellow-400 text-blue-950"
                        : "bg-slate-200 text-slate-800"
                    }`}
                  >
                    {band}
                  </span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-yellow-400" />}
                </div>
                <div className="mt-2">
                  <div
                    className={`text-xs font-bold ${
                      isSelected ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {badge.name}
                  </div>
                  <div
                    className={`text-[10px] ${
                      isSelected ? "text-blue-200" : "text-slate-500"
                    }`}
                  >
                    {badge.target}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Band Short Description */}
        <div
          className={`p-3 rounded-xl border text-xs font-medium flex items-start space-x-2.5 ${bandBadges[selectedBand].color}`}
        >
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">{bandBadges[selectedBand].name}:</strong>{" "}
            {bandBadges[selectedBand].desc}
          </div>
        </div>
      </div>

      {/* CRITERIA CHECKLIST DISPLAY */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center space-x-2 text-indigo-900 font-extrabold text-sm sm:text-base">
            <CheckSquare className="w-5 h-5 text-indigo-800" />
            <span>
              YÊU CẦU TIÊU CHÍ CHÍNH XÁC BAND {selectedBand} ({bandBadges[selectedBand].target}) - {currentTypeLabel.name}
            </span>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            Chuẩn Khảo Thí IELTS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          {/* TA / TR */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex flex-col justify-between space-y-2">
            <div>
              <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-blue-200/60">
                <span className="font-extrabold text-blue-900 uppercase tracking-wider text-[11px] flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-blue-700" />
                  1. {taskType === "task1" ? "Task Achievement (TA)" : "Task Response (TR)"}
                </span>
                <span className="text-[10px] font-extrabold bg-blue-200/80 text-blue-900 px-2 py-0.5 rounded">
                  Độ Hoàn Thành
                </span>
              </div>
              <ul className="space-y-1 mt-1 text-slate-800 font-medium">
                {criteria.ta.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-snug">
                    <span className="text-blue-700 font-extrabold shrink-0 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* CC */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 flex flex-col justify-between space-y-2">
            <div>
              <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-indigo-200/60">
                <span className="font-extrabold text-indigo-900 uppercase tracking-wider text-[11px] flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-indigo-700" />
                  2. Coherence &amp; Cohesion (CC)
                </span>
                <span className="text-[10px] font-extrabold bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded">
                  Mạch Lạc &amp; Liên Kết
                </span>
              </div>
              <ul className="space-y-1 mt-1 text-slate-800 font-medium">
                {criteria.cc.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-snug">
                    <span className="text-indigo-700 font-extrabold shrink-0 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* LR */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col justify-between space-y-2">
            <div>
              <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-emerald-200/60">
                <span className="font-extrabold text-emerald-900 uppercase tracking-wider text-[11px] flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-emerald-700" />
                  3. Lexical Resource (LR)
                </span>
                <span className="text-[10px] font-extrabold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded">
                  Vốn Từ Vựng
                </span>
              </div>
              <ul className="space-y-1 mt-1 text-slate-800 font-medium">
                {criteria.lr.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-snug">
                    <span className="text-emerald-700 font-extrabold shrink-0 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* GRA */}
          <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200/80 flex flex-col justify-between space-y-2">
            <div>
              <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-purple-200/60">
                <span className="font-extrabold text-purple-900 uppercase tracking-wider text-[11px] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                  4. Grammatical Range &amp; Accuracy (GRA)
                </span>
                <span className="text-[10px] font-extrabold bg-purple-200/80 text-purple-900 px-2 py-0.5 rounded">
                  Ngữ Pháp &amp; Độ Chính Xác
                </span>
              </div>
              <ul className="space-y-1 mt-1 text-slate-800 font-medium">
                {criteria.gra.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-snug">
                    <span className="text-purple-700 font-extrabold shrink-0 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* BẢNG SO SÁNH SỰ TIẾN HÓA TIÊU CHÍ THEO TỪNG BAND (PROGRESSION MATRIX) */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-4 space-y-3">
          {/* Title Row */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-indigo-900 to-blue-900 text-white rounded-xl shadow-xs shrink-0">
              <Table className="w-5 h-5 text-yellow-300" />
            </div>
            <h3 className="font-extrabold text-blue-950 text-base sm:text-lg tracking-tight">
              BẢNG TIÊU CHÍ IELTS WRITING
            </h3>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            {/* Export PDF Button */}
            <button
              type="button"
              onClick={handleExportPDF}
              className="px-3.5 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-blue-950"
              title="Xuất file PDF hoặc mở trang in"
            >
              <Printer className="w-4 h-4 text-yellow-300" />
              <span>Tải Bảng (PDF)</span>
            </button>

            {/* Collapse / Expand Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMatrixCollapsed(!isMatrixCollapsed)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-300"
            >
              {isMatrixCollapsed ? (
                <>
                  <ChevronDown className="w-4 h-4 text-blue-900" />
                  <span>Mở rộng Bảng</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-4 h-4 text-slate-600" />
                  <span>Thu gọn</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* IF COLLAPSED */}
        {isMatrixCollapsed ? (
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-blue-950 font-medium">
              <Table className="w-4 h-4 text-blue-800 shrink-0" />
              <span>
                Bảng đang được thu gọn để tiết kiệm không gian. Nhấn <strong>"Mở rộng Bảng"</strong> để xem đầy đủ 32 kỹ năng tích lũy từ Band B1 đến C2.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsMatrixCollapsed(false)}
              className="px-3 py-1 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer"
            >
              Mở rộng ngay
            </button>
          </div>
        ) : (
          <>
            {/* Filter Categories Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setMatrixFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  matrixFilter === "ALL"
                    ? "bg-blue-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Tất Cả Tiêu Chí
              </button>
              <button
                type="button"
                onClick={() => setMatrixFilter("TA_TR")}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  matrixFilter === "TA_TR"
                    ? "bg-blue-800 text-white shadow-xs"
                    : "bg-blue-50 text-blue-900 hover:bg-blue-100"
                }`}
              >
                1. {taskType === "task1" ? "Task Achievement (TA)" : "Task Response (TR)"}
              </button>
              <button
                type="button"
                onClick={() => setMatrixFilter("CC")}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  matrixFilter === "CC"
                    ? "bg-indigo-800 text-white shadow-xs"
                    : "bg-indigo-50 text-indigo-900 hover:bg-indigo-100"
                }`}
              >
                2. Coherence &amp; Cohesion (CC)
              </button>
              <button
                type="button"
                onClick={() => setMatrixFilter("LR")}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  matrixFilter === "LR"
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                }`}
              >
                3. Lexical Resource (LR)
              </button>
              <button
                type="button"
                onClick={() => setMatrixFilter("GRA")}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  matrixFilter === "GRA"
                    ? "bg-purple-800 text-white shadow-xs"
                    : "bg-purple-50 text-purple-900 hover:bg-purple-100"
                }`}
              >
                4. Grammatical Range &amp; Accuracy (GRA)
              </button>
            </div>

            {/* MATRIX TABLE */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px] sm:text-xs font-black uppercase tracking-wider divide-x divide-slate-800">
                    <th className="p-2.5 sm:p-3 w-[50%]">Đặc Tính / Kỹ Năng Yêu Cầu (Feature)</th>
                    <th className="p-2 sm:p-2.5 text-center bg-amber-950/60 text-amber-200 w-[12.5%]">
                      <div>B1 (5.0+)</div>
                      <div className="text-[9px] text-amber-300/80 font-normal normal-case">Nền tảng</div>
                    </th>
                    <th className="p-2 sm:p-2.5 text-center bg-blue-950/60 text-blue-200 w-[12.5%]">
                      <div>B2 (6.0+)</div>
                      <div className="text-[9px] text-blue-300/80 font-normal normal-case">+Tích lũy B1</div>
                    </th>
                    <th className="p-2 sm:p-2.5 text-center bg-indigo-950/60 text-indigo-200 w-[12.5%]">
                      <div>C1 (7.0+)</div>
                      <div className="text-[9px] text-indigo-300/80 font-normal normal-case">+Tích lũy B1+B2</div>
                    </th>
                    <th className="p-2 sm:p-2.5 text-center bg-purple-950/60 text-purple-200 w-[12.5%]">
                      <div>C2 (7.5+)</div>
                      <div className="text-[9px] text-purple-300/80 font-normal normal-case">+Tích lũy B1+B2+C1</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-medium">
                  {filteredProgressionCategories.map((cat) => (
                    <React.Fragment key={cat.code}>
                      {/* Category Section Header */}
                      <tr className={`${cat.headerBg} border-t-2 border-slate-300`}>
                        <td colSpan={5} className="p-2 px-3 font-black uppercase tracking-wide text-xs">
                          <div className="flex items-center justify-between">
                            <span className={`flex items-center gap-2 ${cat.textColor}`}>
                              <span>{cat.categoryName}</span>
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${cat.badgeBg} ${cat.textColor}`}>
                              {cat.badgeText}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Feature Rows */}
                      {cat.features.map((feat, idx) => (
                        <tr key={feat.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                          {/* Feature Title & Description */}
                          <td className="p-2.5 sm:p-3 align-top border-r border-slate-200 break-words">
                            <div className="font-bold text-slate-900 text-xs flex items-start gap-1">
                              <span className="text-slate-400 font-mono text-[10px] shrink-0 mt-0.5">#{idx + 1}</span>
                              <span>{feat.title}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-tight pl-3 font-normal">
                              {feat.description}
                            </p>
                          </td>

                          {/* B1 Column */}
                          <td className="p-2 align-middle text-center border-r border-slate-200">
                            {isFeatureSatisfied("B1", feat.minBand) ? (
                              <div className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs font-extrabold text-[10px] gap-1">
                                <Check className="w-3 h-3 text-amber-800 stroke-[3]" />
                                <span>Đạt</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center text-slate-300">
                                <Minus className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </td>

                          {/* B2 Column */}
                          <td className="p-2 align-middle text-center border-r border-slate-200">
                            {isFeatureSatisfied("B2", feat.minBand) ? (
                              <div className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs font-extrabold text-[10px] gap-1">
                                <Check className="w-3 h-3 text-blue-800 stroke-[3]" />
                                <span>Đạt</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center text-slate-300">
                                <Minus className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </td>

                          {/* C1 Column */}
                          <td className="p-2 align-middle text-center border-r border-slate-200">
                            {isFeatureSatisfied("C1", feat.minBand) ? (
                              <div className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-indigo-100 text-indigo-900 border border-indigo-300 shadow-2xs font-extrabold text-[10px] gap-1">
                                <Check className="w-3 h-3 text-indigo-800 stroke-[3]" />
                                <span>Đạt</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center text-slate-300">
                                <Minus className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </td>

                          {/* C2 Column */}
                          <td className="p-2 align-middle text-center">
                            {isFeatureSatisfied("C2", feat.minBand) ? (
                              <div className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs font-extrabold text-[10px] gap-1">
                                <Check className="w-3 h-3 text-purple-800 stroke-[3]" />
                                <span>Đạt</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center text-slate-300">
                                <Minus className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
