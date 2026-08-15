import React, { useState } from "react";
import { TaskExportData, exportReportToDoc, exportReportToPdf, formatBandScore, calculateCombinedIeltsBand, formatExportFileName } from "../lib/exportDoc";
import { Download, X, Check, FileText, FileSpreadsheet, Tag } from "lucide-react";

export interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  allAvailableTasks: TaskExportData[];
  activeTaskData: TaskExportData;
  studentClass?: string;
  teacherName?: string;
  studentName?: string;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  allAvailableTasks = [],
  activeTaskData,
  studentClass = "",
  teacherName = "",
  studentName = "",
}) => {
  if (!isOpen) return null;

  const [format, setFormat] = useState<"doc" | "pdf">("doc");

  const t1Task = allAvailableTasks.find((t) => t.taskType === "task1");
  const t2Task = allAvailableTasks.find((t) => t.taskType === "task2");

  const hasDualTasks = !!(t1Task && t2Task);

  // Content selection: 'all' | 'task1' | 'task2'
  const [contentSelection, setContentSelection] = useState<"all" | "task1" | "task2">(() => {
    if (hasDualTasks) return "all";
    return activeTaskData.taskType === "task1" ? "task1" : "task2";
  });

  const effectiveClass = studentClass || activeTaskData.studentClass || t1Task?.studentClass || t2Task?.studentClass || "";
  const effectiveTeacher = teacherName || activeTaskData.teacherName || t1Task?.teacherName || t2Task?.teacherName || "";
  const effectiveName = studentName || activeTaskData.studentName || t1Task?.studentName || t2Task?.studentName || "";

  const previewFileName = formatExportFileName(effectiveClass, effectiveName, format);

  const combinedBand = hasDualTasks && t1Task && t2Task
    ? calculateCombinedIeltsBand(t1Task.report.overallBand, t2Task.report.overallBand)
    : activeTaskData.report?.overallBand || 0;

  const handleExport = () => {
    let tasksToExport: TaskExportData[] = [];

    if (contentSelection === "all") {
      const rawList = hasDualTasks ? [t1Task!, t2Task!] : [activeTaskData];
      tasksToExport = rawList.map((t) => ({
        ...t,
        studentClass: t.studentClass || effectiveClass,
        teacherName: t.teacherName || effectiveTeacher,
        studentName: t.studentName || effectiveName,
      }));
    } else if (contentSelection === "task1") {
      const target = t1Task || (activeTaskData.taskType === "task1" ? activeTaskData : null);
      if (target) {
        tasksToExport = [{
          ...target,
          studentClass: target.studentClass || effectiveClass,
          teacherName: target.teacherName || effectiveTeacher,
          studentName: target.studentName || effectiveName,
        }];
      }
    } else if (contentSelection === "task2") {
      const target = t2Task || (activeTaskData.taskType === "task2" ? activeTaskData : null);
      if (target) {
        tasksToExport = [{
          ...target,
          studentClass: target.studentClass || effectiveClass,
          teacherName: target.teacherName || effectiveTeacher,
          studentName: target.studentName || effectiveName,
        }];
      }
    }

    if (tasksToExport.length === 0) return;

    if (format === "doc") {
      exportReportToDoc(tasksToExport);
    } else {
      exportReportToPdf(tasksToExport);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Xuất Báo Cáo Chấm Bài
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Chọn định dạng và nội dung báo cáo cần tải về
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-all cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin">
          {/* Section 1: Choose File Format */}
          <div className="space-y-3">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
              1. CHỌN ĐỊNH DẠNG FILE TẢI VỀ
            </label>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Word Card */}
              <button
                type="button"
                onClick={() => setFormat("doc")}
                className={`p-4 rounded-2xl border text-left transition-all flex items-center space-x-3.5 cursor-pointer relative ${
                  format === "doc"
                    ? "border-2 border-blue-600 bg-blue-50/50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                  DOC
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Word (.doc)</div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Chuẩn A4, Calibri 12pt
                  </div>
                </div>
              </button>

              {/* PDF Card */}
              <button
                type="button"
                onClick={() => setFormat("pdf")}
                className={`p-4 rounded-2xl border text-left transition-all flex items-center space-x-3.5 cursor-pointer relative ${
                  format === "pdf"
                    ? "border-2 border-blue-600 bg-blue-50/50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                  PDF
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">PDF (.pdf)</div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Xem / In ấn trực tiếp A4
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Choose Report Content */}
          <div className="space-y-3 pt-1">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
              2. CHỌN NỘI DUNG BÁO CÁO
            </label>

            <div className="space-y-3">
              {/* Option 1: Both Tasks */}
              <button
                type="button"
                onClick={() => setContentSelection("all")}
                className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  contentSelection === "all"
                    ? "border-2 border-rose-500 bg-rose-50/30 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        contentSelection === "all"
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {contentSelection === "all" && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      🎓 Xuất Cả 2 Tasks (Task 1 + Task 2)
                    </span>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 text-xs font-extrabold border border-rose-200/80 shrink-0">
                    Band {formatBandScore(combinedBand)}
                  </span>
                </div>

                <p className="text-xs text-slate-500 font-medium mt-2 pl-8 leading-relaxed">
                  Xuất gộp cả 2 bài thành 1 file báo cáo đầy đủ kèm Tổng band score IELTS Writing.
                </p>

                <div className="mt-2.5 pl-8 flex flex-wrap items-center gap-3 text-xs font-medium">
                  <span className="flex items-center space-x-1">
                    <span className="text-slate-500">Task 1:</span>
                    {t1Task ? (
                      <span className="text-emerald-700 font-bold">✅ Đã chấm ({formatBandScore(t1Task.report.overallBand)})</span>
                    ) : (
                      <span className="text-amber-600 font-bold">⌛ Chưa chấm</span>
                    )}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center space-x-1">
                    <span className="text-slate-500">Task 2:</span>
                    {t2Task ? (
                      <span className="text-emerald-700 font-bold">✅ Đã chấm ({formatBandScore(t2Task.report.overallBand)})</span>
                    ) : (
                      <span className="text-amber-600 font-bold">⌛ Chưa chấm</span>
                    )}
                  </span>
                </div>
              </button>

              {/* Option 2: Task 1 Only */}
              <button
                type="button"
                onClick={() => setContentSelection("task1")}
                className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  contentSelection === "task1"
                    ? "border-2 border-rose-500 bg-rose-50/30 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        contentSelection === "task1"
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {contentSelection === "task1" && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      📄 Chỉ xuất Task 1
                    </span>
                  </div>

                  {t1Task ? (
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-extrabold border border-emerald-200 shrink-0">
                      Band {formatBandScore(t1Task.report.overallBand)}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 shrink-0">
                      Chưa chấm
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 font-medium mt-1.5 pl-8 leading-relaxed">
                  Báo cáo chấm bài IELTS Writing Task 1 (Kèm hình biểu đồ)
                </p>
              </button>

              {/* Option 3: Task 2 Only */}
              <button
                type="button"
                onClick={() => setContentSelection("task2")}
                className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  contentSelection === "task2"
                    ? "border-2 border-rose-500 bg-rose-50/30 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        contentSelection === "task2"
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {contentSelection === "task2" && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      📄 Chỉ xuất Task 2
                    </span>
                  </div>

                  {t2Task ? (
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-extrabold border border-emerald-200 shrink-0">
                      Band {formatBandScore(t2Task.report.overallBand)}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 shrink-0">
                      Chưa chấm
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 font-medium mt-1.5 pl-8 leading-relaxed">
                  Báo cáo chấm bài IELTS Writing Task 2
                </p>
              </button>
            </div>
          </div>

          {/* Section 3: File Name Syntax Preview */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
              <Tag className="w-3.5 h-3.5 text-blue-600" />
              <span>TÊN FILE XUẤT RA:</span>
            </div>
            <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-xs text-blue-900 font-bold truncate select-all">
              {previewFileName}
            </div>
            <p className="text-[11px] text-slate-500 italic">
              Cú pháp: Writing [Lớp] - [Họ và Tên]
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="px-6 py-2.5 rounded-xl bg-rose-800 hover:bg-rose-900 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all flex items-center space-x-2 cursor-pointer active:scale-[0.98]"
          >
            <Download className="w-4 h-4 text-white" />
            <span>
              {format === "doc" ? "Tải File Word (.doc)" : "Tải File PDF (.pdf)"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
