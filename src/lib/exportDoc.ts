import { GradingReport } from "../types";

export function exportReportToDoc(
  report: GradingReport,
  taskType: "task1" | "task2" | string,
  promptText: string,
  originalEssay: string
) {
  const currentDate = new Date().toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const taskTitle = taskType === "task1" ? "IELTS Writing Task 1" : "IELTS Writing Task 2";

  // Process fullUpgradeEssay HTML marks for Word
  const formattedEssayHtml = report.fullUpgradeEssay
    .split("\n\n")
    .map((para) => {
      // replace <mark> tags with inline styled spans for full Word compatibility
      const styledPara = para.replace(
        /<mark[^>]*>([\s\S]*?)<\/mark>/gi,
        '<span style="background-color: #ffe4e6; color: #881337; font-weight: bold; border-bottom: 2px solid #f43f5e; padding: 2px 4px;">$1</span>'
      );
      return `<p style="margin-bottom: 12pt; text-indent: 18pt; line-height: 1.6; text-align: justify; font-family: 'Calibri', sans-serif; font-size: 12pt;">${styledPara}</p>`;
    })
    .join("");

  // Build criteria HTML
  const criteriaList = [
    { title: taskType === "task1" ? "Task Achievement (TA)" : "Task Response (TR)", detail: report.criteria.taOrTr },
    { title: "Coherence & Cohesion (CC)", detail: report.criteria.cc },
    { title: "Lexical Resource (LR)", detail: report.criteria.lr },
    { title: "Grammatical Range & Accuracy (GRA)", detail: report.criteria.gra },
  ];

  const criteriaHtml = criteriaList
    .map(
      (c) => `
    <div style="margin-bottom: 16pt; border: 1px solid #cbd5e1; padding: 12pt; background-color: #ffffff;">
      <div style="font-size: 13pt; font-weight: bold; color: #1e3a8a; margin-bottom: 6pt;">
        ${c.title} &mdash; <span style="background-color: #dbeafe; color: #1e40af; padding: 2pt 8pt; font-size: 11pt;">Band ${c.detail.band}.0</span>
      </div>
      <p style="margin-bottom: 6pt; font-size: 12pt; color: #334155;"><strong>Phân tích chi tiết:</strong> ${c.detail.feedback}</p>
      ${
        c.detail.example
          ? `<p style="margin-bottom: 0; font-size: 11pt; color: #475569; background-color: #f8fafc; padding: 8pt; border-left: 3px solid #3b82f6;"><strong>Ví dụ &amp; Ghi chú:</strong> ${c.detail.example}</p>`
          : ""
      }
    </div>
  `
    )
    .join("");

  // Build Upgrades (5 điểm cần sửa đổi) HTML
  const upgradesHtml = report.upgrades
    .map(
      (u, idx) => `
    <div style="margin-bottom: 12pt; border-left: 4px solid #e11d48; background-color: #fff1f2; padding: 10pt 14pt;">
      <p style="margin-bottom: 4pt; font-weight: bold; color: #9f1239; font-size: 12pt;">Điểm Nâng Cấp #${idx + 1}</p>
      <p style="margin-bottom: 4pt; font-size: 11pt; color: #881337;"><strong>Câu gốc của bạn:</strong> <span style="text-decoration: line-through;">${u.before}</span></p>
      <p style="margin-bottom: 6pt; font-size: 12pt; color: #15803d; font-weight: bold;"><strong>Câu nâng cấp Band 8.0+:</strong> ${u.after}</p>
      <p style="margin-bottom: 0; font-size: 11pt; color: #475569;"><strong>Lý do &amp; Cách áp dụng:</strong> ${u.explanation}</p>
    </div>
  `
    )
    .join("");

  // Build Next Steps (Cẩm nang lên band) HTML
  const nextStepsHtml = report.nextBandSteps
    .map(
      (step, idx) => `
    <li style="margin-bottom: 8pt; font-size: 12pt; color: #1e293b; line-height: 1.5;">
      <strong>Bước ${idx + 1}:</strong> ${step}
    </li>
  `
    )
    .join("");

  // Full Word Document HTML Template
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
  h2 { font-size: 14pt !important; font-family: 'Calibri', sans-serif !important; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 4pt; margin-top: 20pt; margin-bottom: 10pt; font-weight: bold; }
  
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
        Báo Cáo Phân Tích &amp; Nâng Cấp Bài Viết IELTS
      </td>
    </tr>
  </table>

  <!-- Title Section -->
  <div style="text-align: center; margin-bottom: 20pt; border-bottom: 3px double #1e3a8a; padding-bottom: 12pt;">
    <p style="font-size: 14pt; font-weight: bold; color: #1e3a8a; margin-bottom: 2pt;">TRƯỜNG ANH NGỮ MỸ DU</p>
    <h1 style="font-size: 20pt !important; color: #0f172a; margin-bottom: 6pt;">BÁO CÁO PHÂN TÍCH &amp; NÂNG CẤP BÀI VIẾT IELTS</h1>
    <p style="font-size: 11pt; color: #64748b; margin: 0;">Ngày xuất báo cáo: ${currentDate}</p>
  </div>

  <!-- Summary Table -->
  <table class="meta-table">
    <tr>
      <td style="width: 30%; font-weight: bold; background-color: #f1f5f9; color: #334155;">Dạng Bài:</td>
      <td>${taskTitle}</td>
      <td style="width: 25%; font-weight: bold; background-color: #f1f5f9; color: #334155;">Điểm Overall Band:</td>
      <td style="font-weight: bold; color: #1e3a8a; font-size: 13pt !important;">BAND ${report.overallBand}.0 / 9.0</td>
    </tr>
    <tr>
      <td style="font-weight: bold; background-color: #f1f5f9; color: #334155;">Số Từ Bài Làm:</td>
      <td>${report.wordCount} từ (${report.wordCountRequirement === "meets" ? "Đạt chuẩn" : "Chưa đủ số từ quy định"})</td>
      <td style="font-weight: bold; background-color: #f1f5f9; color: #334155;">Điểm Thành Phần:</td>
      <td>
        TR/TA: <strong>${report.criteria.taOrTr.band}</strong> | 
        CC: <strong>${report.criteria.cc.band}</strong> | 
        LR: <strong>${report.criteria.lr.band}</strong> | 
        GRA: <strong>${report.criteria.gra.band}</strong>
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
  <h2>1. Bài Viết Mẫu Hoàn Chỉnh Để Học Tập (Band 8.0+) - Nâng Cấp Từ Bài Gốc</h2>
  <div style="background-color: #fff1f2; border: 1px solid #fecdd3; padding: 8pt 12pt; margin-bottom: 12pt; font-size: 11pt; color: #9f1239;">
    <strong>Ghi chú đọc bài:</strong> Các vị trí được <span style="background-color: #ffe4e6; color: #881337; font-weight: bold; padding: 2px 4px;">tô màu đỏ nhạt</span> là các câu, cụm từ hoặc đoạn văn đã được chỉnh sửa &amp; nâng cấp từ bài viết gốc của bạn để đạt chuẩn Band 8.0+. Những phần không tô màu là cấu trúc tốt được giữ nguyên.
  </div>

  <div style="background-color: #fafafa; border: 1px solid #e2e8f0; padding: 14pt; margin-bottom: 20pt;">
    ${formattedEssayHtml}
  </div>

  <!-- SECTION 2: 5 Điểm Cần Sửa Đổi Để Bứt Phá -->
  <h2>2. Top 5 Điểm Cần Sửa Đổi Để Bứt Phá (Upgrades Chi Tiết)</h2>
  <p style="margin-bottom: 10pt; font-size: 11pt; color: #475569;">Dưới đây là 5 vị trí trọng yếu trong bài làm gốc đã được tái cấu trúc thành phiên bản sắc bén chuẩn Band 8.0+:</p>
  ${upgradesHtml}

  <!-- SECTION 3: Nhận Xét Chi Tiết 4 Tiêu Chí -->
  <h2>3. Nhận Xét Chi Tiết Theo 4 Tiêu Chí IELTS Band Descriptors</h2>
  ${criteriaHtml}

  <!-- SECTION 4: Cẩm Nang Lên Band -->
  <h2>4. Cẩm Nang Lên Band (Lộ Trình Hành Động Tối Ưu Cho Bài Tiếp Theo)</h2>
  <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 12pt; margin-bottom: 20pt;">
    <ol style="margin-top: 0; margin-bottom: 0; padding-left: 20pt;">
      ${nextStepsHtml}
    </ol>
  </div>

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
  a.download = `Bao_Cao_Cham_IELTS_Band_8+_Truong_Anh_Ngu_My_Du_${Date.now()}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
