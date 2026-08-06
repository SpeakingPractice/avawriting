import React, { useState } from "react";
import { GradingReport, CriterionDetail } from "../types";
import {
  BandLevel,
  task1ProgressionCategories,
  task2ProgressionCategories,
  ProgressionFeatureItem,
  ProgressionCategoryGroup,
} from "../data/criteriaData";
import {
  CheckCircle2,
  Sparkles,
  BookOpen,
  Award,
  Filter,
  FileText,
  HelpCircle,
  BarChart2,
  Check,
} from "lucide-react";

interface EssayEvaluationViewProps {
  report: GradingReport;
  taskType: "task1" | "task2";
  essayText: string;
  promptText?: string;
}

interface FeatureEvalResult {
  earned: number;
  maxScore: number;
  status: "full" | "partial" | "none";
  reasoning?: string;
}

const getFeatureEvalResult = (
  detail: CriterionDetail,
  feat: ProgressionFeatureItem,
  featIndex: number
): FeatureEvalResult => {
  const maxScore = parseFloat(feat.score) || 0;

  if (detail.featureScores && Array.isArray(detail.featureScores) && detail.featureScores.length > 0) {
    const item = detail.featureScores.find((f) => f.id === feat.id);
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

  // Fallback heuristic for legacy reports without featureScores array
  const thresholds = [1.0, 3.0, 5.0, 5.5, 6.0, 7.0, 8.0, 9.0];
  const targetThreshold = thresholds[featIndex - 1] || 9.0;
  const prevThreshold = featIndex > 1 ? thresholds[featIndex - 2] : 0;
  const b = detail.band || 0;

  if (b >= targetThreshold) {
    return { earned: maxScore, maxScore, status: "full" };
  } else if (b > prevThreshold) {
    const partial = Math.min(maxScore, Math.max(0.5, b - prevThreshold));
    return { earned: partial, maxScore, status: "partial" };
  }
  return { earned: 0, maxScore, status: "none" };
};

// Styling helper for feature cards based on minBand color theme
const getFeatureColorStyle = (minBand: BandLevel) => {
  switch (minBand) {
    case "B1":
      return {
        bg: "bg-[#edf7f2]",
        border: "border-emerald-300",
        badgeBg: "bg-emerald-200/90 text-emerald-950",
        tagColor: "text-emerald-800 bg-emerald-100/90 border border-emerald-300",
        label: "B1 (5.0+)",
        colorName: "xanh lá",
      };
    case "B2":
      return {
        bg: "bg-[#f0f6fc]",
        border: "border-blue-300",
        badgeBg: "bg-blue-200/90 text-blue-950",
        tagColor: "text-blue-800 bg-blue-100/90 border border-blue-300",
        label: "B2 (6.0+)",
        colorName: "xanh dương",
      };
    case "C1":
      return {
        bg: "bg-[#fffde8]",
        border: "border-amber-300",
        badgeBg: "bg-amber-200/90 text-amber-950",
        tagColor: "text-amber-900 bg-amber-100/90 border border-amber-300",
        label: "C1 (7.0+)",
        colorName: "vàng",
      };
    case "C2":
      return {
        bg: "bg-[#fde8e8]",
        border: "border-rose-300",
        badgeBg: "bg-rose-200/90 text-rose-950",
        tagColor: "text-rose-900 bg-rose-100/90 border border-rose-300",
        label: "C2 (8.0+ / Max 9.0)",
        colorName: "hồng/đỏ",
      };
  }
};

export const EssayEvaluationView: React.FC<EssayEvaluationViewProps> = ({
  report,
  taskType,
  essayText,
  promptText,
}) => {
  const [activeCategory, setActiveCategory] = useState<"ALL" | "TA_TR" | "CC" | "LR" | "GRA">("ALL");

  const categories = taskType === "task1" ? task1ProgressionCategories : task2ProgressionCategories;

  // Map category code to report criterion details
  const getCriterionDetail = (code: "TA_TR" | "CC" | "LR" | "GRA"): CriterionDetail => {
    switch (code) {
      case "TA_TR":
        return report.criteria.taOrTr;
      case "CC":
        return report.criteria.cc;
      case "LR":
        return report.criteria.lr;
      case "GRA":
        return report.criteria.gra;
    }
  };

  // Compute stats across all categories
  let totalFeaturesCount = 0;
  let totalAchievedCount = 0;
  let totalAchievedScore = 0;

  categories.forEach((cat) => {
    const detail = getCriterionDetail(cat.code);
    cat.features.forEach((feat, index) => {
      totalFeaturesCount += 1;
      const res = getFeatureEvalResult(detail, feat, index + 1);
      if (res.earned > 0) {
        totalAchievedCount += 1;
        totalAchievedScore += res.earned;
      }
    });
  });

  const filteredCategories = categories.filter((cat) => {
    if (activeCategory === "ALL") return true;
    return cat.code === activeCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-black uppercase tracking-wider">
                Đánh Giá Bài Viết
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {taskType === "task1" ? "IELTS Writing Task 1" : "IELTS Writing Task 2"}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Kết Quả Đánh Giá Bài Viết Theo Bảng Tiêu Chí Standard</span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              Đối chiếu chi tiết bài viết của học sinh với 32 đặc tính tiêu chuẩn. Các đặc tính học sinh đạt được được tô màu nền tương ứng theo Band điểm và đánh mã ghi chú rõ ràng.
            </p>
          </div>

          {/* Quick Score Metrics Card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 p-3.5 rounded-xl flex items-center gap-4 shrink-0 self-stretch md:self-auto justify-around">
            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-slate-300">Overall Band</div>
              <div className="text-2xl font-black text-yellow-400">{report.overallBand}</div>
            </div>
            <div className="h-8 w-px bg-white/20"></div>
            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-slate-300">Đặc Tính Đạt</div>
              <div className="text-2xl font-black text-emerald-400">
                {totalAchievedCount} <span className="text-xs font-normal text-slate-300">/ {totalFeaturesCount}</span>
              </div>
            </div>
            <div className="h-8 w-px bg-white/20"></div>
            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-slate-300">Tổng Score</div>
              <div className="text-2xl font-black text-blue-300">{totalAchievedScore}</div>
            </div>
          </div>
        </div>

        {/* Color Legend Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-[#edf7f2] border border-emerald-300 text-slate-900">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
            <div className="truncate">
              <span className="font-extrabold text-emerald-950">Band B1 (5.0+)</span>
              <span className="text-[10px] text-emerald-800 block">Màu Xanh Lá</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-[#f0f6fc] border border-blue-300 text-slate-900">
            <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0"></span>
            <div className="truncate">
              <span className="font-extrabold text-blue-950">Band B2 (6.0+)</span>
              <span className="text-[10px] text-blue-800 block">Màu Xanh Dương</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-[#fffde8] border border-amber-300 text-slate-900">
            <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></span>
            <div className="truncate">
              <span className="font-extrabold text-amber-950">Band C1 (7.0+)</span>
              <span className="text-[10px] text-amber-800 block">Màu Vàng</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-[#fde8e8] border border-rose-300 text-slate-900">
            <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0"></span>
            <div className="truncate">
              <span className="font-extrabold text-rose-950">Band C2 (8.0+ - Max 9.0)</span>
              <span className="text-[10px] text-rose-800 block">Màu Hồng / Đỏ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200">
        <button
          onClick={() => setActiveCategory("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeCategory === "ALL"
              ? "bg-blue-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          Tất Cả Tiêu Chí ({totalAchievedCount}/{totalFeaturesCount} đặc tính)
        </button>

        {categories.map((cat) => {
          const detail = getCriterionDetail(cat.code);
          const catAchieved = cat.features.filter((feat, idx) => {
            const res = getFeatureEvalResult(detail, feat, idx + 1);
            return res.earned > 0;
          }).length;
          return (
            <button
              key={cat.code}
              onClick={() => setActiveCategory(cat.code)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeCategory === cat.code
                  ? "bg-blue-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              {cat.badgeText} ({catAchieved}/8)
            </button>
          );
        })}
      </div>

      {/* Criteria Analysis Cards */}
      <div className="space-y-6">
        {filteredCategories.map((cat) => {
          const detail = getCriterionDetail(cat.code);

          const featureResults = cat.features.map((feat, idx) => ({
            feat,
            featIndex: idx + 1,
            evalRes: getFeatureEvalResult(detail, feat, idx + 1),
          }));

          const achievedFeatures = featureResults.filter((item) => item.evalRes.earned > 0);
          const upcomingFeatures = featureResults.filter((item) => item.evalRes.earned === 0);

          return (
            <div
              key={cat.code}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
            >
              {/* Category Header */}
              <div className={`${cat.headerBg} p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2`}>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-white/80 shadow-2xs text-slate-800">
                    <Award className="w-4 h-4 text-blue-900" />
                  </span>
                  <h3 className={`font-extrabold text-sm sm:text-base ${cat.textColor}`}>
                    {cat.categoryName}
                  </h3>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="px-2.5 py-1 rounded-lg bg-white/90 text-slate-900 font-extrabold text-xs shadow-2xs border border-slate-200">
                    Band Điểm: <span className="text-blue-900 text-sm font-black">{detail.band}</span> / 9.0
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg ${cat.badgeBg} ${cat.textColor} font-bold text-xs`}>
                    Đạt {achievedFeatures.length}/8 Đặc Tính
                  </span>
                </div>
              </div>

              {/* Examiner Feedback Summary */}
              <div className="p-4 bg-slate-50/60 border-b border-slate-100 text-xs text-slate-700 leading-relaxed">
                <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Nhận xét giám khảo cho tiêu chí này:</span>
                </div>
                <p className="italic text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200/80">
                  "{detail.feedback}"
                </p>
              </div>

              {/* Achieved Features Section */}
              <div className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Các đặc tính bài viết đã làm được ({achievedFeatures.length}):</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 italic">
                    Tô màu nền theo từng đặc tính &amp; kèm mã (#stt - score)
                  </span>
                </div>

                {achievedFeatures.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Chưa đạt đặc tính nào ở tiêu chí này. Hãy củng cố các kỹ năng nền tảng B1 (5.0+).
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {achievedFeatures.map(({ feat, featIndex, evalRes }) => {
                      const style = getFeatureColorStyle(feat.minBand);
                      const isPartial = evalRes.status === "partial";
                      const maxFeatScore = parseFloat(feat.score) || 0;

                      return (
                        <div
                          key={feat.id}
                          className={`${style.bg} ${style.border} p-3.5 rounded-xl border shadow-2xs transition-all hover:shadow-xs flex flex-col justify-between gap-2.5`}
                        >
                          <div>
                            {/* Feature Title with Bracket Syntax requested: (#1 - 1 score) or (#7 - 0.5/1 score) */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-extrabold text-slate-950 text-xs sm:text-sm flex items-start gap-1.5 leading-snug">
                                <span className={`p-0.5 rounded bg-white/80 shrink-0 mt-0.5 border ${isPartial ? 'text-amber-700 border-amber-300' : 'text-emerald-700 border-emerald-200'}`}>
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </span>
                                <div>
                                  <span>{feat.title}</span>
                                  <span className="ml-1.5 inline-block font-mono font-bold text-xs text-slate-800 bg-white/90 px-1.5 py-0.5 rounded border border-slate-300">
                                    (#{featIndex} - {isPartial ? `${evalRes.earned}/${maxFeatScore}` : feat.score} score)
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-slate-700 mt-2 leading-relaxed pl-5 font-normal">
                              {feat.description}
                            </p>

                            {/* AI Reasoning if partial/specific */}
                            {evalRes.reasoning && (
                              <div className="ml-5 mt-2 p-2 rounded bg-white/80 border border-slate-200 text-[11px] text-slate-700 italic">
                                <span className="font-bold not-italic text-slate-900">Ghi chú: </span>
                                {evalRes.reasoning}
                              </div>
                            )}
                          </div>

                          {/* Footer Tag Badges */}
                          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] pl-5">
                            <span className={`px-2 py-0.5 rounded font-bold ${style.tagColor}`}>
                              Yêu cầu: {style.label}
                            </span>
                            <span className={`font-extrabold px-2 py-0.5 rounded ${isPartial ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'}`}>
                              {isPartial ? `Đạt một phần: +${evalRes.earned} / ${maxFeatScore}` : `Đạt trọn vẹn: +${evalRes.earned}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Upcoming / Next Target Features */}
                {upcomingFeatures.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <h5 className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5 uppercase tracking-wide">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span>Các đặc tính cần rèn luyện tiếp theo để tăng Band ({upcomingFeatures.length}):</span>
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {upcomingFeatures.map(({ feat, featIndex }) => {
                        return (
                          <div
                            key={feat.id}
                            className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start justify-between gap-2 opacity-80"
                          >
                            <div>
                              <span className="font-bold text-slate-800">
                                #{featIndex}. {feat.title}
                              </span>
                              <span className="ml-1 font-mono text-[10px] text-slate-500">
                                (#{featIndex} - {feat.score} score)
                              </span>
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                {feat.description}
                              </p>
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-200 rounded shrink-0">
                              Target {feat.minBand}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Student Essay Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-900" />
            <span>Nội Dung Bài Làm Gốc Của Học Sinh</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {essayText.trim().split(/\s+/).filter(Boolean).length} từ
          </span>
        </div>

        {promptText && (
          <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl text-xs text-amber-950">
            <span className="font-bold block mb-0.5">Đề bài:</span>
            <p className="leading-relaxed text-slate-800">{promptText}</p>
          </div>
        )}

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs leading-relaxed text-slate-800 font-mono whitespace-pre-wrap max-h-80 overflow-y-auto">
          {essayText}
        </div>
      </div>
    </div>
  );
};
