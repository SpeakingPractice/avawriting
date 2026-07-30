import React, { useState, useEffect } from "react";
import {
  Target,
  CheckCircle2,
  BookOpen,
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
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export type BandLevel = "B1" | "B2" | "C1" | "C2";

export interface StandardCriteriaGuideProps {
  taskType: "task1" | "task2";
  promptText?: string;
  essayText?: string;
}

// Essay types definition
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

export const StandardCriteriaGuide: React.FC<StandardCriteriaGuideProps> = ({
  taskType,
  promptText = "",
  essayText = "",
}) => {
  const [selectedBand, setSelectedBand] = useState<BandLevel>("C1");

  // State for detected / chosen essay type
  const [task1EssayType, setTask1EssayType] = useState<Task1Type>("line_dynamic");
  const [task2EssayType, setTask2EssayType] = useState<Task2Type>("agree_disagree");

  // Auto detect essay type based on prompt & essay
  useEffect(() => {
    const combined = (promptText + " " + essayText).toLowerCase();

    if (taskType === "task1") {
      if (combined.includes("process") || combined.includes("diagram") || combined.includes("step") || combined.includes("stage") || combined.includes("how to")) {
        setTask1EssayType("process_diagram");
      } else if (combined.includes("map") || combined.includes("village") || combined.includes("town") || combined.includes("development of") || combined.includes("infrastructure")) {
        setTask1EssayType("map_diagram");
      } else if (combined.includes("pie") || combined.includes("proportion") || combined.includes("share")) {
        setTask1EssayType("pie_chart");
      } else if (combined.includes("table")) {
        setTask1EssayType("table_data");
      } else if (combined.includes("bar") || combined.includes("column")) {
        setTask1EssayType("bar_chart");
      } else if (combined.includes("line") || combined.includes("over the period") || combined.includes("between") || combined.includes("trend")) {
        setTask1EssayType("line_dynamic");
      } else if (combined.includes("chart") && combined.includes("table")) {
        setTask1EssayType("mixed_charts");
      } else {
        setTask1EssayType("line_dynamic");
      }
    } else {
      if (combined.includes("agree or disagree") || combined.includes("to what extent") || combined.includes("do you agree")) {
        setTask2EssayType("agree_disagree");
      } else if (combined.includes("discuss both") || combined.includes("both views")) {
        setTask2EssayType("discuss_both");
      } else if (combined.includes("advantage") || combined.includes("benefit") || combined.includes("drawback") || combined.includes("disadvantage")) {
        setTask2EssayType("adv_disadv");
      } else if (combined.includes("solution") || combined.includes("cause") || combined.includes("problem") || combined.includes("reason") || combined.includes("measures")) {
        setTask2EssayType("problem_solution");
      } else if (combined.includes("why") || combined.includes("what can be done") || combined.includes("two questions") || combined.includes("?")) {
        setTask2EssayType("two_part");
      } else {
        setTask2EssayType("agree_disagree");
      }
    }
  }, [taskType, promptText, essayText]);

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
    B1: { name: "B1 (5.0+)", target: "Cơ Bản / Đủ Số Từ", color: "bg-amber-100 text-amber-900 border-amber-300", desc: "Đạt yêu cầu tối thiểu, bố cục rõ ràng, từ vựng/ngữ pháp đơn giản nhưng đúng trọng tâm." },
    B2: { name: "B2 (6.0+)", target: "Khá / Chuẩn Du Học", color: "bg-blue-100 text-blue-900 border-blue-300", desc: "Bố cục mạch lạc, có Overview/Thesis rõ ràng, từ vựng học thuật khá, ít lỗi nghiêm trọng." },
    C1: { name: "C1 (7.0+)", target: "Giỏi / Chuẩn Chuyên Nghiệp", color: "bg-indigo-100 text-indigo-900 border-indigo-300", desc: "Phân tích sâu sắc, nhóm dữ liệu thông minh, cấu trúc câu phức đa dạng, từ vựng tự nhiên." },
    C2: { name: "C2 (7.5+)", target: "Xuất Sắc / Bậc Thầy Writing", color: "bg-emerald-100 text-emerald-900 border-emerald-300", desc: "Diễn đạt tinh tế nhuần nhuyễn, hoàn toàn không có lỗ hổng logic, phong cách chuẩn bản ngữ." },
  };

  // Build the specific guidance blueprint based on Task Type, Essay Type, and Band Level
  const getBlueprint = () => {
    if (taskType === "task1") {
      if (selectedBand === "B1") {
        return {
          intro: {
            text: "Viết 1 câu paraphrase lại đề bài bằng cách thay 2-3 từ đồng nghĩa đơn giản (show -> gives information about, between 2000 and 2010 -> from 2000 to 2010).",
            example: "The chart gives information about the number of visitors to three museums from 2000 to 2010.",
          },
          overview: {
            text: "Nêu 1 đặc điểm nổi bật nhất (xu hướng chung tăng/giảm hoặc yếu tố cao nhất). BẮT BUỘC bắt đầu bằng từ 'Overall,'.",
            example: "Overall, it can be seen that the figure for Museum A increased, while Museum B experienced a decrease.",
          },
          body1: {
            text: "Mô tả số liệu chính ở mốc điểm đầu tiên và sự thay đổi ban đầu. Dùng từ nối thời gian đơn giản (In [Year], First, Then).",
            example: "In 2000, the figure for Museum A was 50,000, and then it rose to 80,000 in 2005.",
          },
          body2: {
            text: "Mô tả các đối tượng/số liệu còn lại và mốc kết thúc. Dùng cấu trúc chuyển ý cơ bản (Looking at X, In contrast).",
            example: "Looking at Museum B, it started at 30,000 in 2000 and dropped gradually to 10,000 at the end of the period.",
          },
          ta: "Đưa ra được dữ liệu chính nhưng có thể còn liệt kê số liệu thô mà chưa so sánh sâu.",
          cc: "Có chia 4 đoạn rõ ràng (Intro, Overview, Body 1, Body 2), dùng từ liên kết cơ bản.",
          lr: "Dùng từ vựng mô tả tăng giảm cơ bản (increase, decrease, go up, go down, rise, fall).",
          gra: "Sử dụng chủ yếu câu đơn và câu ghép cơ bản với 'and', 'but'. Chú ý chia đúng thì quá khứ.",
        };
      } else if (selectedBand === "B2") {
        return {
          intro: {
            text: "Viết 1-2 câu paraphrase chính xác đề bài. Thay đổi từ vựng và cấu trúc câu (dùng danh từ hóa 'The proportion of...' hoặc 'The graph illustrates...').",
            example: "The line graph illustrates changes in the percentage of households with internet access across three countries from 2005 to 2020.",
          },
          overview: {
            text: "Nêu rõ 2 đặc điểm cốt lõi: (1) Xu hướng chính của các đối tượng; (2) Yếu tố chiếm vị trí cao nhất/thấp nhất. Tuyệt đối KHÔNG đưa số liệu vào Overview.",
            example: "Overall, internet access in Country X experienced an upward trend, whereas Country Y witnessed a reverse pattern, consistently recording the lowest figures.",
          },
          body1: {
            text: "Gom nhóm dữ liệu logic (các yếu tố tăng hoặc có số liệu lớn hơn). So sánh số liệu cụ thể giữa các năm bằng Mệnh đề Phân từ (Starting at X, it surged to...).",
            example: "Starting at 40% in 2005, the figure for Country X surged dramatically over the next decade to peak at 90% in 2015.",
          },
          body2: {
            text: "Mô tả nhóm dữ liệu còn lại. Sử dụng trạng từ chuyển đoạn tương phản (In contrast, On the other hand) và cấu trúc so sánh cụ thể.",
            example: "In contrast, Country Y saw a gradual decline over the fifteen-year period, falling steadily from 35% to a low of 15%.",
          },
          ta: "Bao quát toàn bộ các điểm dữ liệu chính, làm nổi bật các cột mốc quan trọng (peak, lowest point).",
          cc: "Sử dụng từ nối chuyển đoạn linh hoạt ('Turning to...', 'Regarding...', 'Respectively').",
          lr: "Đa dạng hóa từ vựng xu hướng (surge, plummet, fluctuate, remain stable, peak at).",
          gra: "Kết hợp câu phức, câu bị động và mệnh đề quan hệ ('which stood at...'). Chính xác cao về thì.",
        };
      } else if (selectedBand === "C1") {
        return {
          intro: {
            text: "Paraphrase mượt mà bằng từ vựng học thuật cấp độ C1. Sử dụng mệnh đề rút gọn hoặc cụm danh từ phân tích (*a detailed breakdown of / comparative data regarding*).",
            example: "The graph provides a detailed breakdown of internet adoption rates across three European nations over a 15-year timeframe starting from 2005.",
          },
          overview: {
            text: "Nêu 2 câu tổng quan sắc bén, làm rõ bức tranh toàn cảnh (macro-trends), mối tương quan và điểm đảo chiều chính. Dùng cấu trúc nhấn mạnh 'Overall, what stands out from the chart is...'.",
            example: "Overall, what stands out from the chart is a pronounced expansion in Country X, which eventually eclipsed Country Y as the dominant leader in connectivity.",
          },
          body1: {
            text: "Nhóm dữ liệu theo phân tích xu hướng/phân tầng số liệu. Lồng ghép so sánh tỉ lệ (*Commencing at X%, figure Y underwent... twice as much as...*).",
            example: "Commencing at 20% in 2005, the proportion of connected households in Country X underwent wild volatility before settling at an all-time high of 85%.",
          },
          body2: {
            text: "Mô tả biến động phức tạp bằng danh từ hóa chỉ xu hướng (*maintained a steady downward trajectory / reached a nadir of...*) và phép thế (*the former/the latter*).",
            example: "By stark contrast, Country Y maintained a steady downward trajectory, suffering a drop of nearly half to reach its nadir of 12% in the final year.",
          },
          ta: "Bắt buộc có: mốc đầu/cuối, điểm đỉnh/đáy, và so sánh tỉ lệ giữa các đường. Nhóm dữ liệu thông minh theo xu hướng hoặc phân tầng số liệu, làm nổi bật các điểm ngoặt (turning points).",
          cc: "Mạch văn gắn kết tự nhiên bằng phép thế và tham chiếu (*the former/the latter, this figure, such growth*), hạn chế lặp lại từ nối thô đầu câu.",
          lr: "Từ vựng dồi dào, collocations chuẩn xác (*plateaued at, experienced a steep decline, a sharp margin, outstripped*).",
          gra: "Đa dạng cấu trúc câu phức: Mệnh đề phân từ (*Starting at..., before rising to...*), câu bị động nâng cao, hòa hợp thì và S-V chính xác.",
        };
      } else {
        // C2 (7.5+)
        return {
          intro: {
            text: "Mở bài xuất sắc, dùng từ vựng và ngữ khí báo cáo phân tích kinh tế vĩ mô (*depicts a comprehensive comparison regarding the temporal progression...*).",
            example: "The graph depicts a comprehensive comparison regarding the temporal progression of internet penetration rates across three European economies.",
          },
          overview: {
            text: "Overview đỉnh cao, tóm tắt trọn vẹn bản chất dữ liệu (macro trends & key anomalies) trong 2 câu cực kỳ súc tích với cấu trúc 'The data underscores a decisive structural shift...'.",
            example: "Overall, the data underscores a decisive structural shift towards widespread connectivity in Country X, juxtaposed with a progressive contraction in Y's market share.",
          },
          body1: {
            text: "Phân tích dữ liệu theo góc nhìn tổng hợp, dùng Mệnh đề Hoàn thành Phân từ (*Having initiated the period at..., X registered... culminating in...*).",
            example: "Having initiated the period at a modest 15%, Country X registered a sustained expansion over successive years, culminating in a peak of 92%.",
          },
          body2: {
            text: "Diễn đạt nhịp nhàng, dùng cấu trúc tương phản lồng ghép so sánh bậc cao (*Conversely, Y mirrored an opposing trend, suffering a contraction before...*).",
            example: "Conversely, Country Y mirrored an opposing trend, suffering an initial contraction before stabilizing at a baseline of 10% towards the end of the timeline.",
          },
          ta: "Đáp ứng tiêu chuẩn khảo thí cấp độ cao nhất: phân tích tổng hợp vĩ mô, làm rõ bức tranh toàn cảnh, làm nổi bật điểm chuyển biến cốt lõi.",
          cc: "Mạch văn trôi chảy tuyệt đối, gắn kết bằng tham chiếu tinh tế (the former/latter, this trend), chuyển ý không cần từ nối thô.",
          lr: "Từ vựng báo cáo phân tích kinh tế vĩ mô (depicts, temporal progression, decisive structural shift, juxtaposed, contraction).",
          gra: "Cấu trúc ngữ pháp đa dạng và chuẩn xác tuyệt đối (Mệnh đề hoàn thành phân từ, câu bị động, đảo ngữ, nhượng bộ).",
        };
      }
    } else {
      // Task 2
      if (selectedBand === "B1") {
        return {
          intro: {
            text: "Viết 2 câu đơn giản: (1) Nêu lại đề bài bằng từ ngữ của mình (*Nowadays, many people think that...*); (2) Đưa quan điểm (*In my opinion, I agree with this statement...*).",
            example: "Nowadays, many people believe that university education should be free for all students. In my opinion, I agree with this statement for two main reasons.",
          },
          body1: {
            text: "Mở đầu bằng câu chủ đề đơn giản (*First of all, one main reason is that...*). Đưa ra 1 lý do và giải thích ngắn gọn.",
            example: "First of all, free university allows poor students to study without worrying about money, which gives everyone an equal chance.",
          },
          body2: {
            text: "Đưa ra lý do thứ hai (*Secondly, another point is that...*) kết hợp với 1 ví dụ thực tế đơn giản (*For example,...*).",
            example: "Secondly, when more people go to university, the country gets more skilled workers. For instance, doctors and engineers help develop the nation.",
          },
          conclusion: {
            text: "Viết 1 câu tóm tắt lại quan điểm chính. Bắt đầu bằng từ 'In conclusion,' hoặc 'To sum up,' và khẳng định lại ý kiến của mình.",
            example: "In conclusion, I firmly believe that university education should be free because it helps poor students and develops the economy.",
          },
          ta: "Trả lời được câu hỏi đề bài nhưng luận điểm còn đơn giản, chưa phân tích sâu hoặc ví dụ còn chung chung.",
          cc: "Có chia 4 đoạn rõ ràng (Intro, Body 1, Body 2, Conclusion), dùng các từ nối quen thuộc (First, Second, Also, In conclusion).",
          lr: "Từ vựng đủ dùng cho chủ đề, có thể lặp lại một số từ trong đề bài.",
          gra: "Chủ yếu dùng câu đơn và câu ghép cơ bản. Cần chú ý tránh lỗi sai thì và hoà hợp chủ ngữ - động từ.",
        };
      } else if (selectedBand === "B2") {
        return {
          intro: {
            text: "Paraphrase đề bài tự nhiên (*It is widely believed that...*). Đưa ra quan điểm rõ ràng (Thesis Statement) (*From my perspective, I firmly support...*).",
            example: "It is widely believed that higher education should be fully funded by the state. From my perspective, I firmly support this view due to several economic and social benefits.",
          },
          body1: {
            text: "Câu chủ đề rõ ràng (Topic Sentence). Dùng mô hình PEEL (Point -> Explanation -> Example) với *To begin with, one compelling argument is that...*.",
            example: "To begin with, one compelling argument in favor of free tuition is that it fosters social equity. For instance, talented students from low-income families can pursue higher degrees without financial stress.",
          },
          body2: {
            text: "Phát triển luận điểm thứ 2 củng cố góc nhìn hoặc phân tích mặt đối lập. Dùng *Furthermore, from a broader perspective...*.",
            example: "Furthermore, a highly educated workforce directly accelerates economic productivity. Consequently, governments investing in tuition reap long-term tax revenues from high-earning graduates.",
          },
          conclusion: {
            text: "Khẳng định lại lập trường một cách rõ ràng và tóm lược 2 lý do cốt lõi bằng từ vựng đồng nghĩa (*In conclusion, it is clear that...*). Tránh đưa thêm ý mới.",
            example: "In conclusion, I maintain that government-funded higher education is vital, as it enhances social equity and drives national economic growth.",
          },
          ta: "Trả lời đầy đủ tất cả các phần của đề bài. Các luận điểm chính được làm rõ và hỗ trợ bởi ví dụ cụ thể.",
          cc: "Mạch lạc tốt giữa các đoạn văn và câu văn. Sử dụng từ nối đa dạng (Furthermore, Consequently, However, In conclusion).",
          lr: "Sử dụng nhiều từ vựng thuộc chủ đề (Topic-specific vocabulary) và collocations chuẩn xác.",
          gra: "Kết hợp linh hoạt câu đơn, câu ghép và câu phức (Conditional sentences, Relative clauses). Ít lỗi ngữ pháp.",
        };
      } else if (selectedBand === "C1") {
        return {
          intro: {
            text: "Paraphrase ấn tượng bằng ngôn ngữ học thuật (*There is an ongoing debate regarding whether...*). Thesis statement thể hiện lập trường sắc bén (*While there are valid concerns, I hold a strong conviction that...*).",
            example: "There is an ongoing debate regarding whether tertiary education should be made universally free. While critics cite financial burdens on taxpayers, I hold a strong conviction that the long-term societal returns far outweigh the initial costs.",
          },
          body1: {
            text: "Topic Sentence mang tính tổng quát cao. Luận điểm được chứng minh bằng lập luận chặt chẽ (*Chief among the arguments is... This issue is further compounded by...*).",
            example: "Chief among the arguments in favor of universal higher education is the eradication of systemic inequality. When academic merit supersedes socioeconomic background, talent allocation across strategic industries becomes optimal.",
          },
          body2: {
            text: "Phản biện phản bác (Counter-argument & Rebuttal) hoặc Phân tích hệ quả vĩ mô (*Notwithstanding concerns regarding fiscal sustainability, evidence suggests...*).",
            example: "Notwithstanding concerns regarding fiscal sustainability, the economic returns generated by a knowledge-driven economy invariably eclipse the requisite public expenditure.",
          },
          conclusion: {
            text: "Tóm tắt tổng quan lập trường bằng cấu trúc nhượng bộ (*In conclusion, while there are valid concerns regarding..., I am convinced that...*). Đưa ra nhận định hoặc khuyến nghị vĩ mô.",
            example: "In conclusion, while state subsidies for higher education require substantial public funding, the long-term benefits in fostering social mobility render it an indispensable investment.",
          },
          ta: "Trả lời trực tiếp & đầy đủ các vế đề bài. Lập trường nhất quán từ đầu đến kết bài. Phát triển luận điểm bằng ví dụ khái quát vĩ mô thay vì ví dụ cá nhân phiến diện.",
          cc: "Liên kết tư tưởng tự nhiên bằng tham chiếu (*this issue, these measures, the former/latter*) và mệnh đề nhượng bộ (*Notwithstanding X, Y remains...*).",
          lr: "Từ vựng học thuật chiều sâu (*systemic inequality, meritocracy, fiscal sustainability, democratizes opportunity*), collocations chuẩn xác.",
          gra: "Sử dụng thành thục cấu trúc câu phức, mệnh đề nhượng bộ, câu bị động nâng cao và danh từ hóa. Độ chính xác cao.",
        };
      } else {
        // C2 (7.5+)
        return {
          intro: {
            text: "Đặt câu hỏi triết học/xã hội vĩ mô (*The question of whether... has long precipitated intense discourse. I unequivocally align with the assertion that...*).",
            example: "The question of whether higher education ought to be treated as a fundamental public good or a private commodity has long precipitated intense discourse. I unequivocally align with the assertion that state-subsidized higher education is indispensable for sustainable progress.",
          },
          body1: {
            text: "Phân tích đa diện (kinh tế, tâm lý, xã hội, vĩ mô). Dùng cấu trúc *Central to this rationale is the imperative need for...*.",
            example: "Central to this rationale is the imperative need to dismantle socioeconomic stratifications. Free university access ensures that intellectual capital is cultivated regardless of familial wealth, thereby maximizing human potential.",
          },
          body2: {
            text: "Tháo gỡ mọi lập luận đối lập một cách thượng thừa (*In addressing the counter-narrative regarding public debt, it becomes evident that...*).",
            example: "In addressing the counter-narrative regarding fiscal strain, it becomes evident that public expenditure on education is not a sunk cost, but rather a high-yield investment yielding massive intellectual dividends.",
          },
          conclusion: {
            text: "Kết bài đanh thép, khẳng định tầm vóc vĩ mô của vấn đề bằng ngôn ngữ thượng thừa (*In conclusion, despite the financial constraints associated with..., state-subsidized education remains...*). Tóm gọn triết lý giải pháp.",
            example: "In conclusion, far from being an unsustainable fiscal burden, state-funded higher education is a pivotal catalyst for social meritocracy and economic prosperity. Governments should therefore prioritize education as a fundamental long-term strategy.",
          },
          ta: "Trả lời trọn vẹn MỌI vế của đề bài. Lập trường nhất quán xuyên suốt. Phân tích sâu theo mô hình đa tầng: *Căn nguyên (Root cause) -> Tác động (Kinh tế/Xã hội) -> Hệ quả dài hạn*. Tránh dùng ví dụ cá nhân phiến diện.",
          cc: "Trôi chảy tuyệt đối nhờ: (1) Mạch logic phát triển theo chuỗi Nguyên nhân - Hệ quả (*cause-effect chain*); (2) Tham chiếu anaphora (*this imperative, such measures, these underlying factors*); (3) Cấu trúc nhượng bộ & phản biện (*Notwithstanding..., In addressing the counter-narrative...*).",
          lr: "Từ vựng chuyên sâu & collocations tự nhiên 7.5+: *systemic inequality, meritocracy, fiscal expenditure, socio-economic stratification, precipitate intense discourse, dismantle barriers, yield dividends*. Ngữ khí trang trọng, mượt mà.",
          gra: "Các cấu trúc bắt buộc 7.5+: (1) Đảo ngữ (*Only when... can social equity be achieved*); (2) Câu chẻ (*It is the lack of... that...*); (3) Mệnh đề nhượng bộ & giả định (*Were this policy implemented..., Should governments fail...*); (4) Phối hợp nhịp nhàng các câu đơn/ghép/phức và ngắt câu chuẩn mực.",
        };
      }
    }
  };

  const blueprint = getBlueprint();

  return (
    <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-200 space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-blue-800/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-[11px] font-bold uppercase tracking-wider">
            <Target className="w-3.5 h-3.5" />
            <span>Tiêu Chí Mẫu &amp; Dàn Bài Chuẩn Khảo Thí</span>
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
            <span>Chi Lược &amp; Tiêu Chí Cho IELTS {taskType === "task1" ? "Task 1" : "Task 2"}</span>
          </h3>
          <p className="text-xs text-blue-200">
            Chọn Band điểm mục tiêu bên dưới để xem chi tiết tiêu chí khảo thí &amp; hướng dẫn triển khai dàn bài cho từng dạng bài cụ thể.
          </p>
        </div>

        {/* Essay Type Badge */}
        <div className="bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-white/15 flex items-center space-x-3 shrink-0">
          <div className="p-2 bg-yellow-400 text-blue-950 rounded-lg font-bold">
            {taskType === "task1" ? (
              <BarChart2 className="w-5 h-5" />
            ) : (
              <CheckSquare className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="text-[10px] text-blue-300 uppercase font-bold tracking-wider">Dạng Bài Đã Nhận Diện</div>
            <div className="text-xs font-extrabold text-yellow-300">
              {taskType === "task1"
                ? task1TypeLabels[task1EssayType].name
                : task2TypeLabels[task2EssayType].name}
            </div>
          </div>
        </div>
      </div>

      {/* Target Band Switcher Buttons (B1, B2, C1, C2) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
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
                  <span className={`text-xs font-black uppercase px-2 py-0.5 rounded-md ${
                    isSelected ? "bg-yellow-400 text-blue-950" : "bg-slate-200 text-slate-800"
                  }`}>
                    {band}
                  </span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-yellow-400" />}
                </div>
                <div className="mt-2">
                  <div className={`text-xs font-bold ${isSelected ? "text-white" : "text-slate-900"}`}>
                    {badge.name}
                  </div>
                  <div className={`text-[10px] ${isSelected ? "text-blue-200" : "text-slate-500"}`}>
                    {badge.target}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Band Short Description */}
        <div className={`p-3 rounded-xl border text-xs font-medium flex items-start space-x-2.5 ${bandBadges[selectedBand].color}`}>
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">{bandBadges[selectedBand].name}:</strong> {bandBadges[selectedBand].desc}
          </div>
        </div>
      </div>

      {/* ESSAY BLUEPRINT & CRITERIA CHECKLIST DISPLAY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Structural Blueprint for Intro, Overview (Task 1), Body 1, Body 2, Conclusion (Task 2) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-blue-900 font-extrabold text-sm border-b border-slate-100 pb-3">
            <BookOpen className="w-5 h-5 text-blue-800" />
            <span>CẤU TRÚC DÀN BÀI CHUẨN (STRATEGY BLUEPRINT)</span>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Introduction */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-extrabold text-blue-900 uppercase tracking-wider block text-[11px]">
                📌 Mở Bài (Introduction):
              </span>
              <p className="text-slate-700 leading-relaxed font-medium">{blueprint.intro.text}</p>
              <div className="p-2.5 bg-blue-50/80 rounded-lg border border-blue-200 text-blue-950 flex flex-col space-y-1">
                <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-700" /> Cấu trúc &amp; Mẫu câu ví dụ:
                </span>
                <p className="font-serif italic text-xs leading-relaxed text-blue-900">"{blueprint.intro.example}"</p>
              </div>
            </div>

            {/* Overview (Task 1 only) */}
            {taskType === "task1" && blueprint.overview && (
              <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
                <span className="font-extrabold text-amber-900 uppercase tracking-wider block text-[11px]">
                  ⭐ Tổng Quan (Overview - Quan Trọng Nhất):
                </span>
                <p className="text-amber-950 leading-relaxed font-medium">{blueprint.overview.text}</p>
                <div className="p-2.5 bg-amber-100/70 rounded-lg border border-amber-300 text-amber-950 flex flex-col space-y-1">
                  <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-700" /> Cấu trúc &amp; Mẫu câu ví dụ:
                  </span>
                  <p className="font-serif italic text-xs leading-relaxed text-amber-950">"{blueprint.overview.example}"</p>
                </div>
              </div>
            )}

            {/* Body 1 */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-extrabold text-slate-800 uppercase tracking-wider block text-[11px]">
                ✍️ Thân Bài 1 (Body 1):
              </span>
              <p className="text-slate-700 leading-relaxed font-medium">{blueprint.body1.text}</p>
              <div className="p-2.5 bg-indigo-50/80 rounded-lg border border-indigo-200 text-indigo-950 flex flex-col space-y-1">
                <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-700" /> Cấu trúc &amp; Mẫu câu ví dụ:
                </span>
                <p className="font-serif italic text-xs leading-relaxed text-indigo-900">"{blueprint.body1.example}"</p>
              </div>
            </div>

            {/* Body 2 */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-extrabold text-slate-800 uppercase tracking-wider block text-[11px]">
                ✍️ Thân Bài 2 (Body 2):
              </span>
              <p className="text-slate-700 leading-relaxed font-medium">{blueprint.body2.text}</p>
              <div className="p-2.5 bg-slate-100/90 rounded-lg border border-slate-300 text-slate-900 flex flex-col space-y-1">
                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-slate-700" /> Cấu trúc &amp; Mẫu câu ví dụ:
                </span>
                <p className="font-serif italic text-xs leading-relaxed text-slate-900">"{blueprint.body2.example}"</p>
              </div>
            </div>

            {/* Conclusion (Task 2 only) */}
            {taskType === "task2" && blueprint.conclusion && (
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2">
                <span className="font-extrabold text-emerald-900 uppercase tracking-wider block text-[11px]">
                  🎯 Kết Bài (Conclusion):
                </span>
                <p className="text-emerald-950 leading-relaxed font-medium">{blueprint.conclusion.text}</p>
                <div className="p-2.5 bg-emerald-100/70 rounded-lg border border-emerald-300 text-emerald-950 flex flex-col space-y-1">
                  <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-700" /> Cấu trúc &amp; Mẫu câu ví dụ:
                  </span>
                  <p className="font-serif italic text-xs leading-relaxed text-emerald-950">"{blueprint.conclusion.example}"</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: 4 Criteria Requirements for Selected Band */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-indigo-900 font-extrabold text-sm border-b border-slate-100 pb-3">
            <CheckSquare className="w-5 h-5 text-indigo-800" />
            <span>YÊU CẦU 4 TIÊU CHÍ BAND {selectedBand} ({bandBadges[selectedBand].target})</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* TA / TR */}
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-blue-900 uppercase tracking-wider text-[11px]">
                  1. {taskType === "task1" ? "Task Achievement (TA)" : "Task Response (TR)"}
                </span>
                <span className="text-[10px] font-extrabold bg-blue-200 text-blue-900 px-2 py-0.5 rounded">
                  Độ Hoàn Thành
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed">{blueprint.ta}</p>
            </div>

            {/* CC */}
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-indigo-900 uppercase tracking-wider text-[11px]">
                  2. Coherence &amp; Cohesion (CC)
                </span>
                <span className="text-[10px] font-extrabold bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded">
                  Mạch Lạc &amp; Liên Kết
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed">{blueprint.cc}</p>
            </div>

            {/* LR */}
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-emerald-900 uppercase tracking-wider text-[11px]">
                  3. Lexical Resource (LR)
                </span>
                <span className="text-[10px] font-extrabold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                  Vốn Từ Vựng
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed">{blueprint.lr}</p>
            </div>

            {/* GRA */}
            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-purple-900 uppercase tracking-wider text-[11px]">
                  4. Grammatical Range &amp; Accuracy (GRA)
                </span>
                <span className="text-[10px] font-extrabold bg-purple-200 text-purple-900 px-2 py-0.5 rounded">
                  Ngữ Pháp &amp; Độ Chính Xác
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed">{blueprint.gra}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
