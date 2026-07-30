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
    </div>
  );
};
