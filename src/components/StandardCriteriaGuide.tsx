import React, { useState } from "react";
import {
  Table,
  ChevronDown,
  ChevronUp,
  Printer,
  Check,
  Minus,
} from "lucide-react";
import {
  isFeatureSatisfied,
  task1ProgressionCategories,
  task2ProgressionCategories,
} from "../data/criteriaData";

export interface StandardCriteriaGuideProps {
  taskType: "task1" | "task2";
  promptText?: string;
  essayText?: string;
}

export const StandardCriteriaGuide: React.FC<StandardCriteriaGuideProps> = ({
  taskType,
}) => {
  // State for matrix filter & collapse
  const [matrixFilter, setMatrixFilter] = useState<"ALL" | "TA_TR" | "CC" | "LR" | "GRA">("ALL");
  const [isMatrixCollapsed, setIsMatrixCollapsed] = useState<boolean>(false);

  const progressionCategories = taskType === "task1" ? task1ProgressionCategories : task2ProgressionCategories;

  const filteredProgressionCategories = progressionCategories.filter((cat) => {
    if (matrixFilter === "ALL") return true;
    return cat.code === matrixFilter;
  });

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
          <td colspan="6">
            <strong>${cat.categoryName}</strong> - <em>${cat.badgeText}</em>
          </td>
        </tr>
      `;

      cat.features.forEach((feat, idx) => {
        const isB1 = isFeatureSatisfied("B1", feat.minBand) ? '<span class="check check-b1">✓ Đạt</span>' : '<span class="dash">-</span>';
        const isB2 = isFeatureSatisfied("B2", feat.minBand) ? '<span class="check check-b2">✓ Đạt</span>' : '<span class="dash">-</span>';
        const isC1 = isFeatureSatisfied("C1", feat.minBand) ? '<span class="check check-c1">✓ Đạt</span>' : '<span class="dash">-</span>';
        const isC2 = isFeatureSatisfied("C2", feat.minBand) ? '<span class="check check-c2">✓ Đạt</span>' : '<span class="dash">-</span>';

        const rowBgStyle =
          feat.minBand === "B1" ? "background-color: #edf7f2;" :
          feat.minBand === "B2" ? "background-color: #f0f6fc;" :
          feat.minBand === "C1" ? "background-color: #fffde8;" :
          "background-color: #fde8e8;";

        rowsHtml += `
          <tr style="${rowBgStyle}">
            <td class="feat-col">
              <div class="feat-title">#${idx + 1}. ${feat.title}</div>
              <div class="feat-desc">${feat.description.replace(/\n/g, '<br/>')}</div>
            </td>
            <td class="center-col" style="font-weight: bold; font-size: 10px;">${feat.score}</td>
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
            width: 40%;
          }
          .cat-header td {
            background-color: #f1f5f9;
            color: #1e3a8a;
            font-size: 11px;
            padding: 8px 10px;
            border-top: 2px solid #94a3b8;
          }
          .feat-col {
            width: 40%;
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
            line-height: 1.35;
          }
          .center-col {
            text-align: center;
            vertical-align: middle;
            width: 12%;
          }
          .check {
            font-weight: 800;
            font-size: 10px;
          }
          .check-b1 { color: #166534; }
          .check-b2 { color: #166534; }
          .check-c1 { color: #166534; }
          .check-c2 { color: #166534; }
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
          <p>Hệ thống Tiến Hoá Kỹ Năng IELTS Writing - Tích Luỹ Theo Band Score (B1 5.0+ ➔ B2 6.0+ ➔ C1 7.0+ ➔ C2 8.0+ - Max 9.0)</p>
        </div>
        <table>
          <thead>
            <tr>
              <th class="feat-th">Đặc Tính / Kỹ Năng Yêu Cầu (Feature)</th>
              <th style="width: 8%;">SCORE<br><span style="font-weight:normal;font-size:8px;">(Overall: 9.0)</span></th>
              <th style="width: 13%;">Band B1 (5.0+)<br><span style="font-weight:normal;font-size:9px;">Nền Tảng</span></th>
              <th style="width: 13%;">Band B2 (6.0+)<br><span style="font-weight:normal;font-size:9px;">+Tích Lũy B1</span></th>
              <th style="width: 13%;">Band C1 (7.0+)<br><span style="font-weight:normal;font-size:9px;">+Tích Lũy B1+B2</span></th>
              <th style="width: 13%;">Band C2 (8.0+)<br><span style="font-weight:normal;font-size:9px;">+Tích Lũy B1+B2+C1</span></th>
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

  return (
    <div className="space-y-5">
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
                Bảng đang được thu gọn để tiết kiệm không gian. Nhấn <strong>"Mở rộng Bảng"</strong> để xem đầy đủ các kỹ năng tích lũy từ Band B1 đến C2.
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
                  <tr className="bg-slate-900 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider divide-x divide-slate-800">
                    <th className="p-2 sm:p-3 w-[35%] sm:w-[42%]">Đặc Tính / Kỹ Năng Yêu Cầu (Feature)</th>
                    <th className="p-1 sm:p-2.5 text-center bg-slate-800 text-slate-200 w-[10%] sm:w-[8%]">
                      <div className="text-[8.5px] sm:text-xs font-black leading-tight">SCORE</div>
                      <div className="text-[7px] sm:text-[9px] text-slate-400 font-normal normal-case leading-tight">Max 9.0</div>
                    </th>
                    <th className="p-1 sm:p-2.5 text-center bg-amber-950/60 text-amber-200 w-[13.75%] sm:w-[12.5%]">
                      <div className="text-[8.5px] sm:text-xs font-black leading-tight">B1 (5.0+)</div>
                      <div className="text-[7px] sm:text-[9px] text-amber-300/80 font-normal normal-case leading-tight">Nền tảng</div>
                    </th>
                    <th className="p-1 sm:p-2.5 text-center bg-blue-950/60 text-blue-200 w-[13.75%] sm:w-[12.5%]">
                      <div className="text-[8.5px] sm:text-xs font-black leading-tight">B2 (6.0+)</div>
                      <div className="text-[7px] sm:text-[9px] text-blue-300/80 font-normal normal-case leading-tight">+Tích lũy B1</div>
                    </th>
                    <th className="p-1 sm:p-2.5 text-center bg-indigo-950/60 text-indigo-200 w-[13.75%] sm:w-[12.5%]">
                      <div className="text-[8.5px] sm:text-xs font-black leading-tight">C1 (7.0+)</div>
                      <div className="text-[7px] sm:text-[9px] text-indigo-300/80 font-normal normal-case leading-tight">+Tích lũy B1+B2</div>
                    </th>
                    <th className="p-1 sm:p-2.5 text-center bg-purple-950/60 text-purple-200 w-[13.75%] sm:w-[12.5%]">
                      <div className="text-[8.5px] sm:text-xs font-black leading-tight">C2 (8.0+ - Max 9.0)</div>
                      <div className="text-[7px] sm:text-[9px] text-purple-300/80 font-normal normal-case leading-tight">+Tích lũy B1+B2+C1</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-medium">
                  {filteredProgressionCategories.map((cat) => (
                    <React.Fragment key={cat.code}>
                      {/* Category Section Header */}
                      <tr className={`${cat.headerBg} border-t-2 border-slate-300`}>
                        <td colSpan={6} className="p-2 px-3 font-black uppercase tracking-wide text-xs">
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
                      {cat.features.map((feat, idx) => {
                        const rowBgClass =
                          feat.minBand === "B1" ? "bg-[#edf7f2]" :
                          feat.minBand === "B2" ? "bg-[#f0f6fc]" :
                          feat.minBand === "C1" ? "bg-[#fffde8]" :
                          "bg-[#fde8e8]";

                        return (
                          <tr key={feat.id} className={`${rowBgClass} transition-colors`}>
                            {/* Feature Title & Description */}
                            <td className="p-2.5 sm:p-3 align-top border-r border-slate-200/80 break-words">
                              <div className="font-bold text-slate-900 text-xs flex items-start gap-1">
                                <span className="text-slate-500 font-mono text-[10px] shrink-0 mt-0.5">#{idx + 1}</span>
                                <span>{feat.title}</span>
                              </div>
                              <p className="text-[11px] text-slate-700 mt-0.5 leading-tight pl-3 font-normal">
                                {feat.description}
                              </p>
                            </td>

                            {/* SCORE Column */}
                            <td className="p-1 sm:p-2 align-middle text-center border-r border-slate-200/80 font-bold text-slate-800 text-[10px] sm:text-[11px]">
                              {feat.score}
                            </td>

                            {/* B1 Column */}
                            <td className="p-1 sm:p-2 align-middle text-center border-r border-slate-200/80">
                              {isFeatureSatisfied("B1", feat.minBand) ? (
                                <span className="inline-flex items-center justify-center gap-0.5 font-extrabold text-[10px] sm:text-[11px] text-emerald-800">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  <span>Đạt</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center text-slate-300">
                                  <Minus className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </td>

                            {/* B2 Column */}
                            <td className="p-1 sm:p-2 align-middle text-center border-r border-slate-200/80">
                              {isFeatureSatisfied("B2", feat.minBand) ? (
                                <span className="inline-flex items-center justify-center gap-0.5 font-extrabold text-[10px] sm:text-[11px] text-emerald-800">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  <span>Đạt</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center text-slate-300">
                                  <Minus className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </td>

                            {/* C1 Column */}
                            <td className="p-1 sm:p-2 align-middle text-center border-r border-slate-200/80">
                              {isFeatureSatisfied("C1", feat.minBand) ? (
                                <span className="inline-flex items-center justify-center gap-0.5 font-extrabold text-[10px] sm:text-[11px] text-emerald-800">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  <span>Đạt</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center text-slate-300">
                                  <Minus className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </td>

                            {/* C2 Column */}
                            <td className="p-1 sm:p-2 align-middle text-center">
                              {isFeatureSatisfied("C2", feat.minBand) ? (
                                <span className="inline-flex items-center justify-center gap-0.5 font-extrabold text-[10px] sm:text-[11px] text-emerald-800">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  <span>Đạt</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center text-slate-300">
                                  <Minus className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
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
