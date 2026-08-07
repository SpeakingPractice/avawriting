import React, { useState, useRef } from "react";
import { GradingReport } from "../types";
import { ScoreGauge } from "./ScoreGauge";
import { StandardCriteriaGuide } from "./StandardCriteriaGuide";
import { EssayEvaluationView } from "./EssayEvaluationView";
import { exportReportToDoc, formatBandScore, calculateCombinedIeltsBand, TaskExportData, generateFallbackVietnameseTranslation } from "../lib/exportDoc";
import {
  Sparkles,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  FileText,
  Copy,
  Check,
  RotateCcw,
  MessageSquare,
  Award,
  Flame,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileCheck,
  Target,
  CheckCircle2,
} from "lucide-react";

interface ReportDashboardProps {
  report: GradingReport;
  onRevision: (textToRevise: string) => void;
  originalEssay: string;
  taskType?: "task1" | "task2" | "combo";
  promptText?: string;
  allAvailableTasks?: TaskExportData[];
  task1Image?: string | null;
}

export const ReportDashboard: React.FC<ReportDashboardProps> = ({
  report,
  onRevision,
  originalEssay,
  taskType = "task2",
  promptText = "",
  allAvailableTasks = [],
  task1Image = null,
}) => {
  const [activeTab, setActiveTab] = useState<"criteriaGuide" | "essayEvaluation" | "strengths" | "model" | "roadmap">("criteriaGuide");
  const [copied, setCopied] = useState(false);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const t1Task = allAvailableTasks.find((t) => t.taskType === "task1");
  const t2Task = allAvailableTasks.find((t) => t.taskType === "task2");
  const hasDualTasks = !!(t1Task && t2Task);

  const [selectedTaskIdx, setSelectedTaskIdx] = useState<number>(() => {
    if (hasDualTasks) {
      return taskType === "task1" ? 0 : 1;
    }
    return 0;
  });

  const activeTaskData: TaskExportData = hasDualTasks
    ? selectedTaskIdx === 0
      ? t1Task!
      : t2Task!
    : {
        taskType: taskType === "combo" ? "task2" : taskType,
        promptText,
        originalEssay,
        report,
        task1Image: task1Image || (taskType === "task1" ? t1Task?.task1Image : null),
      };

  const activeReport = activeTaskData.report;
  const activeTaskType = activeTaskData.taskType;

  const combinedOverallBand = hasDualTasks
    ? calculateCombinedIeltsBand(t1Task!.report.overallBand, t2Task!.report.overallBand)
    : activeReport.overallBand;

  const scrollTabs = (direction: "left" | "right") => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({
        left: direction === "left" ? -220 : 220,
        behavior: "smooth",
      });
    }
  };

  const handleCopyModel = () => {
    const cleanText = activeReport.fullUpgradeEssay.replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi, "$1");
    navigator.clipboard.writeText(cleanText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportSingleDoc = (taskToExport?: TaskExportData) => {
    exportReportToDoc([taskToExport || activeTaskData]);
  };

  const handleExportAllDoc = () => {
    exportReportToDoc(hasDualTasks ? [t1Task!, t2Task!] : [activeTaskData]);
  };

  const renderParagraphWithHighlights = (text: string) => {
    if (!text) return null;
    // Clean nested mark tags like <mark><mark>text</mark></mark>
    let sanitizedText = text
      .replace(/<mark[^>]*>\s*<mark[^>]*>/gi, "<mark>")
      .replace(/<\/mark>\s*<\/mark>/gi, "</mark>");

    const parts = sanitizedText.split(/(<mark[^>]*>[\s\S]*?<\/mark>)/gi);
    return parts.map((part, index) => {
      const match = part.match(/^<mark[^>]*>([\s\S]*?)<\/mark>$/i);
      if (match) {
        // Strip any residual inner/outer mark tags from match[1]
        const cleanContent = match[1].replace(/<\/?mark[^>]*>/gi, "").trim();
        if (!cleanContent) return null;
        return (
          <mark
            key={index}
            className="bg-rose-100 text-rose-950 border-b-2 border-rose-400 font-medium px-1.5 py-0.5 rounded mx-0.5 inline shadow-2xs"
            title="Nội dung đã được chỉnh sửa / nâng cấp từ bài viết gốc"
          >
            {cleanContent}
          </mark>
        );
      }
      // Strip any stray orphan <mark> or </mark> tags from non-highlight parts
      const cleanPart = part.replace(/<\/?mark[^>]*>/gi, "");
      return <React.Fragment key={index}>{cleanPart}</React.Fragment>;
    });
  };

  const { taOrTr, cc, lr, gra } = activeReport.criteria;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden" id="report-dashboard">
      {/* Premium Certificate Header */}
      <div className="bg-blue-900 text-white p-6 relative border-b-4 border-yellow-400">
        <div className="absolute top-4 right-4 opacity-10">
          <Award className="w-24 h-24" />
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:justify-between space-y-4 sm:space-y-0 relative z-10">
          <div className="text-center sm:text-left">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-500/30 text-[11px] font-bold uppercase tracking-wider mb-2">
              <Award className="w-3.5 h-3.5" />
              <span>Khảo Thí Chuẩn Quốc Tế</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {hasDualTasks
                ? "Báo cáo phân tích bài viết IELTS Task 1 & Task 2"
                : `Báo cáo phân tích bài viết IELTS ${activeTaskType === "task1" ? "Task 1" : "Task 2"}`}
            </h2>
          </div>

          {/* Overall Band Banner */}
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center space-x-4">
            <ScoreGauge 
              score={combinedOverallBand} 
              size={84} 
              strokeWidth={8} 
              showLabel={false} 
              textColor="text-white"
              labelColor="text-yellow-300"
              trackColor="stroke-blue-800/80"
            />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-blue-300">
                {hasDualTasks ? "Điểm Writing Overall" : "Kết quả chung"}
              </div>
              <div className="text-lg font-black text-yellow-400">Band {formatBandScore(combinedOverallBand)}</div>
              <div className="text-xs font-semibold text-white/95 mt-0.5">
                {hasDualTasks ? (
                  <span>
                    Task 1: <strong>Band {formatBandScore(t1Task!.report.overallBand)}</strong> | Task 2: <strong>Band {formatBandScore(t2Task!.report.overallBand)}</strong>
                  </span>
                ) : (
                  activeReport.overallBand >= 7.5 ? "Cực Kỳ Ấn Tượng" : activeReport.overallBand >= 6.5 ? "Đạt Chuẩn Chuyên Nghiệp" : activeReport.overallBand >= 5.5 ? "Khá Tốt" : "Cần Cố Gắng"
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Word Count Indicator Row (Requirement 4: Export buttons removed from under word count) */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-blue-100">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
              <span className="font-semibold text-blue-200">
                {hasDualTasks ? `Tổng số từ (Task ${activeTaskType === "task1" ? "1" : "2"}):` : "Tổng số từ:"}
              </span>
              <span className="font-bold text-white">{activeReport.wordCount} từ</span>
            </div>
            <div className="flex items-center space-x-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
              <span className="font-semibold text-blue-200">Trạng thái từ:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                  activeReport.wordCountRequirement === "meets"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                }`}
              >
                {activeReport.wordCountRequirement === "meets" ? "✓ Đủ số từ tối thiểu" : "⚠️ Chưa đạt độ dài"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dual Task Selector Toggle (Requirement 2 & 3: Clear separation between Task 1 and Task 2) */}
      {hasDualTasks && (
        <div className="bg-blue-950 p-2.5 border-b border-blue-900 flex items-center justify-center gap-2 sm:gap-4">
          <button
            onClick={() => setSelectedTaskIdx(0)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              selectedTaskIdx === 0
                ? "bg-yellow-400 text-blue-950 shadow-md scale-[1.02]"
                : "bg-blue-900/80 text-blue-100 hover:bg-blue-800 border border-blue-700/50"
            }`}
          >
            <span>📊 BÁO CÁO TASK 1</span>
            <span className="bg-blue-950 text-yellow-300 px-2 py-0.5 rounded-full text-[10px] font-black">
              Band {formatBandScore(t1Task!.report.overallBand)}
            </span>
          </button>

          <button
            onClick={() => setSelectedTaskIdx(1)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              selectedTaskIdx === 1
                ? "bg-yellow-400 text-blue-950 shadow-md scale-[1.02]"
                : "bg-blue-900/80 text-blue-100 hover:bg-blue-800 border border-blue-700/50"
            }`}
          >
            <span>✍️ BÁO CÁO TASK 2</span>
            <span className="bg-blue-950 text-yellow-300 px-2 py-0.5 rounded-full text-[10px] font-black">
              Band {formatBandScore(t2Task!.report.overallBand)}
            </span>
          </button>
        </div>
      )}

      {/* Tabs Navigation with Scroll Arrows */}
      <div className="relative flex items-center border-b border-slate-200 bg-slate-50/50">
        <button
          onClick={() => scrollTabs("left")}
          className="absolute left-1 z-10 p-1.5 rounded-full bg-white/90 shadow-md border border-slate-200 text-slate-600 hover:text-blue-900 transition-all cursor-pointer hidden sm:flex items-center justify-center"
          title="Kéo sang trái"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={tabsContainerRef}
          className="flex border-b border-slate-200 overflow-x-auto bg-slate-50/50 scrollbar-thin scrollbar-thumb-slate-200 touch-pan-x flex-nowrap scroll-smooth w-full px-2 sm:px-8"
        >
          <button
            onClick={() => setActiveTab("criteriaGuide")}
            className={`shrink-0 min-w-max py-3 px-4 sm:px-5 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === "criteriaGuide"
                ? "border-blue-900 text-blue-900 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Target className="w-4 h-4 text-amber-500" />
            <span>Tiêu Chí Mẫu & Dàn Bài</span>
          </button>

          <button
            onClick={() => setActiveTab("essayEvaluation")}
            className={`shrink-0 min-w-max py-3 px-4 sm:px-5 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === "essayEvaluation"
                ? "border-blue-900 text-blue-900 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Đánh Giá Bài Viết</span>
          </button>

          <button
            onClick={() => setActiveTab("strengths")}
            className={`shrink-0 min-w-max py-3 px-4 sm:px-5 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === "strengths"
                ? "border-blue-900 text-blue-900 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Thế Mạnh & Cải Thiện</span>
          </button>

          <button
            onClick={() => setActiveTab("roadmap")}
            className={`shrink-0 min-w-max py-3 px-4 sm:px-5 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === "roadmap"
                ? "border-blue-900 text-blue-900 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <ArrowRight className="w-4 h-4" />
            <span>Cẩm Nang Lên Band</span>
          </button>

          <button
            onClick={() => setActiveTab("model")}
            className={`shrink-0 min-w-max py-3 px-4 sm:px-5 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === "model"
                ? "border-blue-900 text-blue-900 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Bài Viết Mẫu (Band 8.0+)</span>
          </button>
        </div>

        <button
          onClick={() => scrollTabs("right")}
          className="absolute right-1 z-10 p-1.5 rounded-full bg-white/90 shadow-md border border-slate-200 text-slate-600 hover:text-blue-900 transition-all cursor-pointer hidden sm:flex items-center justify-center"
          title="Kéo sang phải"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-6">
        {/* 0. Tiêu Chí Mẫu & Dàn Bài Theo Target Band */}
        {activeTab === "criteriaGuide" && (
          <StandardCriteriaGuide
            taskType={activeTaskType}
            promptText={activeTaskData.promptText}
            essayText={activeTaskData.originalEssay}
          />
        )}

        {/* 0.5. Đánh Giá Bài Viết Theo Bảng Tiêu Chí Standard */}
        {activeTab === "essayEvaluation" && (
          <EssayEvaluationView
            report={activeReport}
            taskType={activeTaskType}
            essayText={activeTaskData.originalEssay}
            promptText={activeTaskData.promptText}
          />
        )}

        {/* 1. Thế Mạnh & Điểm Cải Thiện */}
        {activeTab === "strengths" && (
          <div className="space-y-6 animate-fadeIn" id="panel-strengths">
            {/* Strengths */}
            <div>
              <div className="flex items-center space-x-2 text-slate-700 mb-3">
                <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                <h3 className="font-bold text-sm tracking-tight text-slate-800 uppercase">
                  Điểm Sáng Trong Bài Viết (Key Strengths)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeReport.strengths.map((st, idx) => (
                  <div key={idx} className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-4">
                    <div className="flex items-start space-x-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold mt-0.5">
                        ✓
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-emerald-900 leading-tight">
                          {st.title}
                        </h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {st.explanation}
                        </p>
                        {st.example && (
                          <div className="mt-2.5 bg-white/70 border border-emerald-100 rounded-lg p-2.5 text-xs font-serif italic text-slate-700 border-l-2 border-emerald-400 pl-2">
                            "{st.example}"
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Improvements */}
            <div>
              <div className="flex items-center space-x-2 text-slate-700 mb-3">
                <span className="w-1.5 h-4 bg-amber-500 rounded-full"></span>
                <h3 className="font-bold text-sm tracking-tight text-slate-800 uppercase">
                  5 Điểm Cần Sửa Đổi Để Bứt Phá Điểm Số (Priority Improvements)
                </h3>
              </div>

              <div className="space-y-3">
                {activeReport.improvements.map((imp, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-start space-x-3 hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center">
                        {imp.title}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        <span className="font-semibold text-slate-500">Mô tả lỗi:</span> {imp.explanation}
                      </p>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        <span className="font-semibold text-blue-700">Tác động đến Band điểm:</span> {imp.impact}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. Cẩm Nang Lên Band */}
        {activeTab === "roadmap" && (
          <div className="space-y-4" id="panel-roadmap">
            <div className="flex items-center space-x-2 text-slate-700 mb-3">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full"></span>
              <h3 className="font-bold text-sm tracking-tight text-slate-800 uppercase">
                Lộ Trình Hành Động Tối Ưu Cho Bài Viết Kế Tiếp
              </h3>
            </div>

            <div className="space-y-4">
              {activeReport.nextBandSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex items-start space-x-3"
                >
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-700 text-xs font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Bài Viết Mẫu Band 8.0+ */}
        {activeTab === "model" && (
          <div className="space-y-4" id="panel-model">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2 text-slate-700">
                <span className="w-1.5 h-4 bg-blue-700 rounded-full"></span>
                <h3 className="font-bold text-sm tracking-tight text-slate-800 uppercase">
                  Bài Viết Mẫu Hoàn Chỉnh (Band 8.0+)
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {hasDualTasks ? (
                  <>
                    <button
                      onClick={() => handleExportSingleDoc(t1Task)}
                      className="inline-flex items-center space-x-1 text-xs text-blue-900 hover:text-blue-950 font-bold bg-amber-200 hover:bg-amber-300 border border-amber-300 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                      title="Xuất file Word riêng cho Task 1"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-950" />
                      <span>Xuất Task 1</span>
                    </button>
                    <button
                      onClick={() => handleExportSingleDoc(t2Task)}
                      className="inline-flex items-center space-x-1 text-xs text-blue-900 hover:text-blue-950 font-bold bg-amber-200 hover:bg-amber-300 border border-amber-300 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                      title="Xuất file Word riêng cho Task 2"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-950" />
                      <span>Xuất Task 2</span>
                    </button>
                    <button
                      onClick={handleExportAllDoc}
                      className="inline-flex items-center space-x-1 text-xs text-blue-950 hover:text-black font-extrabold bg-amber-400 hover:bg-amber-300 border border-amber-500 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs"
                      title="Xuất file Word gộp chứa trọn bộ báo cáo Task 1 & Task 2"
                    >
                      <FileCheck className="w-3.5 h-3.5 text-blue-950" />
                      <span>Xuất Cả 2 Tasks</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleExportSingleDoc()}
                    className="inline-flex items-center space-x-1 text-xs text-blue-900 hover:text-blue-950 font-bold bg-amber-300 hover:bg-amber-400 border border-amber-400 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-950" />
                    <span>Xuất File Word (.doc)</span>
                  </button>
                )}
                <button
                  onClick={handleCopyModel}
                  className="inline-flex items-center space-x-1 text-xs text-blue-700 hover:text-blue-800 font-bold bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Đã sao chép!" : "Sao chép bài mẫu"}</span>
                </button>
              </div>
            </div>

            {/* Model Essay Task Switcher for Dual Mode */}
            {hasDualTasks && (
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
                <button
                  onClick={() => setSelectedTaskIdx(0)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedTaskIdx === 0
                      ? "bg-blue-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  📊 Bài Mẫu Task 1 (Band 8.0+)
                </button>
                <button
                  onClick={() => setSelectedTaskIdx(1)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedTaskIdx === 1
                      ? "bg-blue-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  ✍️ Bài Mẫu Task 2 (Band 8.0+)
                </button>
              </div>
            )}

            {/* Color Legend Indicator */}
            <div className="flex items-center gap-2 text-xs text-slate-700 bg-rose-50/80 border border-rose-200/80 px-3 py-2 rounded-lg">
              <span className="inline-block bg-rose-100 text-rose-950 border-b-2 border-rose-400 font-bold px-2 py-0.5 rounded text-[11px] shrink-0">
                🔴 Chữ tô màu đỏ nhạt
              </span>
              <span className="font-medium text-slate-700">
                = Vị trí đã được sửa đổi & nâng cấp từ bài viết gốc của bạn. Những đoạn không tô màu là phần viết tốt được giữ nguyên.
              </span>
            </div>

            {/* Task 1 Image Preview if present */}
            {activeTaskData.task1Image && activeTaskType === "task1" && (
              <div className="bg-white border border-slate-200 rounded-xl p-3 text-center my-2 shadow-2xs">
                <p className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">[Hình Ảnh / Sơ Đồ Đề Bài Task 1 được tải lên]</p>
                <img
                  src={activeTaskData.task1Image}
                  alt="Sơ đồ đề bài Task 1"
                  className="max-h-72 mx-auto rounded-lg border border-slate-200 object-contain"
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>[1.1] Bài Viết Nâng Cấp Tiếng Anh (English Model Essay Band 8.0+)</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 md:p-6 font-serif text-sm leading-relaxed text-slate-800 max-h-[360px] overflow-y-auto scrollbar-thin">
                {activeReport.fullUpgradeEssay.split("\n\n").map((para, i) => (
                  <p key={i} className="mb-4 last:mb-0 indent-4">
                    {renderParagraphWithHighlights(para)}
                  </p>
                ))}
              </div>
            </div>

            {/* Vietnamese Translation Section */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>[1.2] Bản Dịch Tiếng Việt Song Ngữ Đối Chiếu (Vietnamese Translation)</span>
              </div>
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 md:p-6 font-serif text-sm leading-relaxed text-slate-800 max-h-[360px] overflow-y-auto scrollbar-thin">
                {generateFallbackVietnameseTranslation(
                  activeReport.fullUpgradeEssayVietnamese || activeReport.fullUpgradeEssay
                )
                  .split("\n\n")
                  .map((para, i) => (
                    <p key={i} className="mb-4 last:mb-0 indent-4">
                      {renderParagraphWithHighlights(para)}
                    </p>
                  ))}
              </div>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 flex items-start space-x-2">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p>
                <span className="font-bold">Cách tự học hiệu quả:</span> Bài viết mẫu này được xây dựng bằng cách giữ lại các phần tốt trong bài làm của bạn, đồng thời tiếp thu và ứng dụng triệt để các ý tưởng mới từ phần Cẩm Nang Lên Band.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Revision / Retake Block - Encourages the user to write their next draft! */}
      <div className="bg-slate-50 border-t border-slate-100 p-6 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-6">
        <div className="flex items-start space-x-3 text-left">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shrink-0 mt-0.5">
            <RotateCcw className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">
              Bạn Muốn Nâng Cao Điểm Số Ngay Lập Tức?
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Hệ thống AVA khuyến khích bạn viết lại bài viết này bằng cách áp dụng các điểm cải thiện phía trên, hoặc dùng trực tiếp bài viết mẫu làm xuất phát điểm cho sự sáng tạo mới!
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto shrink-0 justify-end">
          <button
            onClick={() => onRevision(originalEssay)}
            className="flex-1 md:flex-none justify-center inline-flex items-center space-x-1 text-xs text-slate-700 hover:text-slate-800 font-bold bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Sửa bài gốc</span>
          </button>
          <button
            onClick={() => onRevision(report.fullUpgradeEssay)}
            className="flex-1 md:flex-none justify-center inline-flex items-center space-x-1 text-xs text-white hover:bg-blue-800 font-bold bg-blue-700 px-4 py-2.5 rounded-xl shadow-md shadow-blue-700/10 hover:shadow-lg transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Dùng bài nâng cấp làm nháp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
