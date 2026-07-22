import React from "react";
import { EssayHistoryItem } from "../types";
import { BookOpen, Calendar, Trash2, Award, ChevronRight } from "lucide-react";

interface ReviewHistoryProps {
  history: EssayHistoryItem[];
  onSelect: (item: EssayHistoryItem) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onClearAll: () => void;
  activeId?: string;
}

export const ReviewHistory: React.FC<ReviewHistoryProps> = ({
  history,
  onSelect,
  onDelete,
  onClearAll,
  activeId,
}) => {
  if (history.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center" id="history-empty">
        <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
        <p className="text-sm font-medium text-slate-500">Chưa có lịch sử chấm bài</p>
        <p className="text-xs text-slate-400 mt-1">Bài viết sau khi chấm sẽ được lưu tại đây để bạn đối chiếu.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3" id="history-container">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Lịch sử chấm bài ({history.length})
        </h3>
        <button
          onClick={onClearAll}
          className="text-xs text-rose-500 hover:text-rose-600 font-medium transition-colors"
        >
          Xóa toàn bộ
        </button>
      </div>

      <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-slate-200">
        {history.map((item) => {
          const formattedDate = new Date(item.date).toLocaleDateString("vi-VN", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          const isActive = activeId === item.id;

          return (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              className={`group flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                isActive
                  ? "bg-blue-50/70 border-blue-200 text-blue-900 shadow-sm"
                  : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50"
              }`}
              id={`history-item-${item.id}`}
            >
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      item.taskType === "task1"
                        ? "bg-sky-100 text-sky-800"
                        : "bg-indigo-100 text-indigo-800"
                    }`}
                  >
                    {item.taskType === "task1" ? "Task 1" : "Task 2"}
                  </span>
                  <div className="flex items-center text-amber-500 text-[11px] font-bold">
                    <Award className="w-3.5 h-3.5 mr-0.5" />
                    Band {item.report.overallBand.toFixed(1)}
                  </div>
                </div>

                <p className="text-xs font-semibold text-slate-700 mt-1.5 truncate">
                  {item.prompt || (item.essay.length > 40 ? item.essay.substring(0, 40) + "..." : item.essay)}
                </p>

                <div className="flex items-center text-[10px] text-slate-400 mt-1">
                  <Calendar className="w-3 h-3 mr-1" />
                  {formattedDate}
                  <span className="mx-1">•</span>
                  {item.report.wordCount} từ
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={(e) => onDelete(item.id, e)}
                  className="p-1 text-slate-300 hover:text-rose-500 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Xóa bản ghi này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <ChevronRight className={`w-4 h-4 text-slate-400 ${isActive ? "text-blue-500" : ""}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
