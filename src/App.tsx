import React, { useState, useEffect } from "react";
import { GradingReport, EssayHistoryItem } from "./types";
import { ScoreGauge } from "./components/ScoreGauge";
import { ReviewHistory } from "./components/ReviewHistory";
import { FileUploader } from "./components/FileUploader";
import { ReportDashboard } from "./components/ReportDashboard";
import { LockScreen } from "./components/LockScreen";
import { SecurityAdminModal } from "./components/SecurityAdminModal";
import { validateGeminiApiKeyClient, gradeEssayClient } from "./lib/geminiClient";
import { TaskExportData } from "./lib/exportDoc";
import {
  Sparkles,
  Flame,
  Award,
  BookOpen,
  Calendar,
  Layers,
  Send,
  Loader2,
  BookOpenCheck,
  PlusCircle,
  AlertCircle,
  RefreshCw,
  Key,
  Image,
  GraduationCap,
  ShieldCheck,
  Lock,
} from "lucide-react";

const DEFAULT_MYDU_LOGO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160"><circle cx="80" cy="80" r="76" fill="%231b365d" stroke="%23FDFA55" stroke-width="7"/><circle cx="80" cy="80" r="70" fill="%230284c7"/><circle cx="80" cy="80" r="69" fill="%230284c7" stroke="%23FDFA55" stroke-width="2"/><path d="M 38 82 C 18 56, 38 24, 60 16 C 43 26, 31 56, 38 82 Z" fill="%23ffffff" opacity="0.95"/><g fill="%23FDFA55"><path d="M 64 23.5 l 1.3 2.7 h 2.9 l -2.3 2.2 l 0.9 2.9 l -2.8 -1.8 l -2.8 1.8 l 0.9 -2.9 l -2.3 -2.2 h 2.9 z"/><path d="M 74 23.5 l 1.3 2.7 h 2.9 l -2.3 2.2 l 0.9 2.9 l -2.8 -1.8 l -2.8 1.8 l 0.9 -2.9 l -2.3 -2.2 h 2.9 z"/><path d="M 84 23.5 l 1.3 2.7 h 2.9 l -2.3 2.2 l 0.9 2.9 l -2.8 -1.8 l -2.8 1.8 l 0.9 -2.9 l -2.3 -2.2 h 2.9 z"/><path d="M 94 23.5 l 1.3 2.7 h 2.9 l -2.3 2.2 l 0.9 2.9 l -2.8 -1.8 l -2.8 1.8 l 0.9 -2.9 l -2.3 -2.2 h 2.9 z"/><path d="M 104 23.5 l 1.3 2.7 h 2.9 l -2.3 2.2 l 0.9 2.9 l -2.8 -1.8 l -2.8 1.8 l 0.9 -2.9 l -2.3 -2.2 h 2.9 z"/></g><g><path d="M 66 42 L 79 82 H 68.5 L 66.5 73.5 H 60 L 58 82 H 51.5 Z M 63.2 60 H 63.3 L 63.25 50.5 Z" fill="%23FDFA55" stroke="%23FDFA55" stroke-width="1.8" stroke-linejoin="round"/><path d="M 102 42 L 115 82 H 104.5 L 102.5 73.5 H 96 L 94 82 H 87.5 Z M 99.2 60 H 99.3 L 99.25 50.5 Z" fill="%23FDFA55" stroke="%23FDFA55" stroke-width="1.8" stroke-linejoin="round"/><path d="M 69.5 42 L 84 82 L 98.5 42" fill="none" stroke="%23ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></g><rect x="20" y="88" width="120" height="18" rx="3" fill="%230284c7"/><text x="80" y="102" font-family="'Arial Black', 'Impact', system-ui, sans-serif" font-weight="900" font-size="11" fill="%23ffffff" text-anchor="middle" letter-spacing="0.2">ANH NGỮ MỸ DU</text><path d="M 28 106 C 50 148, 110 148, 132 106 C 118 142, 42 142, 28 106 Z" fill="%23FDFA55"/><circle cx="120" cy="118" r="15" fill="%232563eb" stroke="%23ffffff" stroke-width="2.5"/><path d="M 112 118 L 117 123 L 128 112" fill="none" stroke="%23ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export default function App() {
  const [essay, setEssay] = useState<string>("");
  const [taskType, setTaskType] = useState<"task1" | "task2" | "combo">("task2");
  const [prompt, setPrompt] = useState<string>("");
  const [task2Prompt, setTask2Prompt] = useState<string>("");
  const [task2Essay, setTask2Essay] = useState<string>("");
  const [task1Image, setTask1Image] = useState<string | null>(null);
  const [report, setReport] = useState<GradingReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<EssayHistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | undefined>(undefined);
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return localStorage.getItem("ava_custom_api_key") || "";
  });
  const [isKeyValid, setIsKeyValid] = useState<boolean | null>(() => {
    const cached = localStorage.getItem("ava_custom_api_key_valid");
    return cached ? cached === "true" : null;
  });
  const [isValidatingKey, setIsValidatingKey] = useState<boolean>(false);
  const [keyValidationMsg, setKeyValidationMsg] = useState<string | null>(null);
  const [forceShowConfig, setForceShowConfig] = useState<boolean>(false);
  const [showApiKeySection, setShowApiKeySection] = useState<boolean>(false);
  const [isDraggingTask1Image, setIsDraggingTask1Image] = useState<boolean>(false);
  const [studentClass, setStudentClass] = useState<string>("");
  const [teacherName, setTeacherName] = useState<string>("");
  const [studentName, setStudentName] = useState<string>("");
  const [customLogo, setCustomLogo] = useState<string>(() => {
    return localStorage.getItem("mydu_custom_logo") || DEFAULT_MYDU_LOGO;
  });
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  // Security Auth States
  const [sessionToken, setSessionToken] = useState<string>(() => sessionStorage.getItem("ava_session_token") || "");
  const [sessionRole, setSessionRole] = useState<"admin" | "user">(
    () => (sessionStorage.getItem("ava_session_role") as "admin" | "user") || "user"
  );
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => !!sessionStorage.getItem("ava_session_token"));
  const [showSecurityModal, setShowSecurityModal] = useState<boolean>(false);

  useEffect(() => {
    const token = sessionStorage.getItem("ava_session_token") || localStorage.getItem("ava_session_token");
    const username = sessionStorage.getItem("ava_session_username") || localStorage.getItem("ava_session_username") || "";
    if (token) {
      setSessionToken(token);
      fetch("/api/auth/check-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, username }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.valid) {
            setIsUnlocked(true);
            setSessionRole(data.role || "user");
            setSessionToken(token);
            if (data.username) {
              sessionStorage.setItem("ava_session_username", data.username);
              localStorage.setItem("ava_session_username", data.username);
            }
          } else {
            sessionStorage.removeItem("ava_session_token");
            sessionStorage.removeItem("ava_session_role");
            sessionStorage.removeItem("ava_session_username");
            localStorage.removeItem("ava_session_token");
            localStorage.removeItem("ava_session_role");
            localStorage.removeItem("ava_session_username");
            setIsUnlocked(false);
            setSessionToken("");
          }
        })
        .catch(() => {
          // Keep active if offline/error
          setIsUnlocked(true);
          setSessionToken(token);
        });
    } else {
      setIsUnlocked(false);
    }
  }, []);

  // Heartbeat to keep session active/online
  useEffect(() => {
    const token = sessionToken || sessionStorage.getItem("ava_session_token") || localStorage.getItem("ava_session_token");
    if (!isUnlocked || !token) return;
    const sendHeartbeat = () => {
      const activeTok = sessionToken || sessionStorage.getItem("ava_session_token") || localStorage.getItem("ava_session_token");
      const activeUser = sessionStorage.getItem("ava_session_username") || localStorage.getItem("ava_session_username") || "";
      if (!activeTok) return;
      fetch("/api/auth/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: activeTok, username: activeUser }),
      }).catch(() => {});
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 10000);
    return () => clearInterval(interval);
  }, [isUnlocked, sessionToken]);

  const handleUnlockSuccess = (role: "admin" | "user", token: string) => {
    setSessionRole(role);
    setSessionToken(token);
    setIsUnlocked(true);
  };

  const handleLockApp = () => {
    const token = sessionToken || sessionStorage.getItem("ava_session_token");
    if (token) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }).catch(() => {});
    }
    sessionStorage.removeItem("ava_session_token");
    sessionStorage.removeItem("ava_session_role");
    sessionStorage.removeItem("ava_session_username");
    setIsUnlocked(false);
    setSessionToken("");
    setShowSecurityModal(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Vui lòng chọn tệp định dạng hình ảnh (PNG, JPG, WEBP, GIF...).");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Kích thước tệp hình ảnh không được vượt quá 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setCustomLogo(result);
        localStorage.setItem("mydu_custom_logo", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const processTask1ImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn tệp định dạng hình ảnh (PNG, JPG, WEBP, GIF...).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Kích thước tệp hình ảnh không được vượt quá 8MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setTask1Image(event.target?.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleTask1ImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processTask1ImageFile(file);
  };

  const handleApiKeyChange = (val: string) => {
    setCustomApiKey(val);
    localStorage.setItem("ava_custom_api_key", val);
    if (!val.trim()) {
      setIsKeyValid(null);
      setKeyValidationMsg(null);
      localStorage.removeItem("ava_custom_api_key_valid");
      setForceShowConfig(false);
    }
  };

  // Automatically check the API Key after user typing stops (debounce)
  useEffect(() => {
    if (!customApiKey.trim()) {
      setIsKeyValid(null);
      setKeyValidationMsg(null);
      localStorage.removeItem("ava_custom_api_key_valid");
      return;
    }

    if (customApiKey.trim().length < 15) {
      setIsKeyValid(false);
      setKeyValidationMsg("Độ dài API Key quá ngắn.");
      localStorage.setItem("ava_custom_api_key_valid", "false");
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsValidatingKey(true);
      setKeyValidationMsg("Đang tự động xác thực API Key...");
      try {
        const res = await fetch("/api/validate-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customApiKey }),
        });
        
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json();
          if (data.valid) {
            setIsKeyValid(true);
            setKeyValidationMsg("Kết nối thành công! API Key của bạn hoạt động hoàn hảo.");
            localStorage.setItem("ava_custom_api_key_valid", "true");
          } else {
            setIsKeyValid(false);
            setKeyValidationMsg(data.error || "Khóa API không hợp lệ hoặc đã hết hạn.");
            localStorage.setItem("ava_custom_api_key_valid", "false");
          }
        } else {
          // If server returns HTML (e.g. static Vercel host without backend API), validate directly on client
          const clientRes = await validateGeminiApiKeyClient(customApiKey);
          if (clientRes.valid) {
            setIsKeyValid(true);
            setKeyValidationMsg("Kết nối thành công! API Key cá nhân của bạn đã được xác thực trực tiếp.");
            localStorage.setItem("ava_custom_api_key_valid", "true");
          } else {
            setIsKeyValid(false);
            setKeyValidationMsg(clientRes.error || "Khóa API không hợp lệ hoặc đã hết hạn.");
            localStorage.setItem("ava_custom_api_key_valid", "false");
          }
        }
      } catch (err) {
        // Fall back to client-side validation if backend endpoint is unreachable
        try {
          const clientRes = await validateGeminiApiKeyClient(customApiKey);
          if (clientRes.valid) {
            setIsKeyValid(true);
            setKeyValidationMsg("Kết nối thành công! API Key cá nhân của bạn hoạt động hoàn hảo (Client Direct).");
            localStorage.setItem("ava_custom_api_key_valid", "true");
          } else {
            setIsKeyValid(false);
            setKeyValidationMsg(clientRes.error || "Mã API Key không hợp lệ.");
            localStorage.setItem("ava_custom_api_key_valid", "false");
          }
        } catch (clientErr) {
          setIsKeyValid(false);
          setKeyValidationMsg("Lỗi kết nối khi kiểm tra API Key.");
          localStorage.setItem("ava_custom_api_key_valid", "false");
        }
      } finally {
        setIsValidatingKey(false);
      }
    }, 1200);

    return () => clearTimeout(delayDebounceFn);
  }, [customApiKey]);

  // Load history from localStorage
  useEffect(() => {
    const cached = localStorage.getItem("ava_essay_history");
    if (cached) {
      try {
        setHistory(JSON.parse(cached));
      } catch (e) {
        console.error("Failed to parse cached history:", e);
      }
    }
  }, []);

  // Save history to localStorage
  const saveHistoryToCache = (newHistory: EssayHistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem("ava_essay_history", JSON.stringify(newHistory));
  };

  // Word count helper
  const wordsArray = essay.trim().split(/\s+/).filter(Boolean);
  const wordCount = wordsArray.length;

  const task2WordsArray = task2Essay.trim().split(/\s+/).filter(Boolean);
  const task2WordCount = task2WordsArray.length;

  // Requirements description based on task type
  const targetWordCount = taskType === "task1" ? 150 : 250;
  const wordCountProgress = Math.min((wordCount / targetWordCount) * 100, 100);

  // Helper for single grading request
  const fetchSingleGrading = async (
    targetType: "task1" | "task2",
    essayText: string,
    promptText: string,
    imgData: string | null
  ): Promise<GradingReport> => {
    try {
      const response = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          essay: essayText, 
          taskType: targetType, 
          prompt: promptText, 
          customApiKey,
          image: targetType === "task1" ? imgData : null,
        }),
      });

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const jsonResult = await response.json();
        if (!response.ok) {
          throw new Error(jsonResult.error || "Có lỗi xảy ra trong quá trình chấm bài.");
        }
        return jsonResult;
      } else if (customApiKey.trim()) {
        return await gradeEssayClient({
          essay: essayText,
          taskType: targetType,
          prompt: promptText,
          apiKey: customApiKey.trim(),
          image: targetType === "task1" ? imgData : null,
        });
      } else {
        throw new Error("Không thể kết nối API backend (/api/grade). Vui lòng nhập API Key cá nhân ở ô 'CẤU HÌNH API KEY CÁ NHÂN' phía trên!");
      }
    } catch (fetchErr: any) {
      if (customApiKey.trim()) {
        return await gradeEssayClient({
          essay: essayText,
          taskType: targetType,
          prompt: promptText,
          apiKey: customApiKey.trim(),
          image: targetType === "task1" ? imgData : null,
        });
      } else {
        throw fetchErr;
      }
    }
  };

  // Core handler to submit essay for AI grading
  const handleGradeEssay = async () => {
    if (taskType === "combo") {
      if (!essay.trim() || !task2Essay.trim()) {
        setError("Vui lòng điền nội dung bài viết cho cả Task 1 và Task 2 trước khi chấm.");
        return;
      }
    } else {
      if (!essay.trim()) {
        setError("Vui lòng điền nội dung bài viết trước khi chấm.");
        return;
      }
    }

    setLoading(true);
    setError(null);
    setReport(null);

    // Dynamic loading screen step sequence
    const steps = taskType === "combo" ? [
      "Hệ thống AVA đang tiếp nhận bài làm Task 1 & Task 2...",
      "Đang quét hình ảnh và phân tích dữ liệu biểu đồ Task 1...",
      "Đang kiểm tra độ dài bài viết và cấu trúc câu 2 Task...",
      "Đang phân tích vốn từ vựng (Lexical Resource) từng bài...",
      "Đang kiểm tra độ đa dạng ngữ pháp (GRA) & tính liên kết (CC)...",
      "Đang đối sánh khắt khe với Band Descriptors 2023...",
      "AVA đang tổng hợp 2 báo cáo chi tiết và tính điểm Overall Band..."
    ] : [
      "Hệ thống AVA đang tiếp nhận bài viết...",
      "Đang quét độ dài bài viết và cấu trúc câu...",
      "Đang phân tích vốn từ vựng (Lexical Resource)...",
      "Đang kiểm tra độ đa dạng cấu trúc ngữ pháp (GRA)...",
      "Đang đánh giá tính mạch lạc và liên kết (CC)...",
      "Đang so khớp với các tiêu chuẩn Band Descriptors 2023...",
      "AVA đang tổng hợp chứng nhận và lập báo cáo chi tiết..."
    ];

    let currentStepIdx = 0;
    setLoadingStep(steps[currentStepIdx]);

    const interval = setInterval(() => {
      if (currentStepIdx < steps.length - 1) {
        currentStepIdx++;
        setLoadingStep(steps[currentStepIdx]);
      }
    }, 600);

    try {
      if (taskType === "combo") {
        setLoadingStep("AVA đang chấm Task 1 (Academic Writing)...");
        const res1 = await fetchSingleGrading("task1", essay, prompt, task1Image);

        setLoadingStep("Đã xong Task 1! Đang chấm tiếp Task 2 (Academic Essay)...");
        await new Promise((resolve) => setTimeout(resolve, 800));
        const res2 = await fetchSingleGrading("task2", task2Essay, task2Prompt, null);

        clearInterval(interval);

        const historyItem1: EssayHistoryItem = {
          id: (Date.now() - 10).toString(),
          date: new Date().toISOString(),
          essay,
          taskType: "task1",
          prompt,
          report: res1,
          image: task1Image,
        };

        const historyItem2: EssayHistoryItem = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          essay: task2Essay,
          taskType: "task2",
          prompt: task2Prompt,
          report: res2,
          image: null,
        };

        const updatedHistory = [historyItem2, historyItem1, ...history];
        saveHistoryToCache(updatedHistory);
        setActiveHistoryId(historyItem2.id);
        setReport(res2);
      } else {
        const data = await fetchSingleGrading(
          taskType,
          essay,
          prompt,
          taskType === "task1" ? task1Image : null
        );

        clearInterval(interval);

        setReport(data);

        const historyItem: EssayHistoryItem = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          essay,
          taskType,
          prompt,
          report: data,
          image: taskType === "task1" ? task1Image : null,
        };

        const updatedHistory = [historyItem, ...history];
        saveHistoryToCache(updatedHistory);
        setActiveHistoryId(historyItem.id);
      }
    } catch (err: any) {
      clearInterval(interval);
      console.error("Grading error caught:", err);
      
      let rawMsg = typeof err === "string" ? err : err?.message || String(err);
      
      // Clean JSON string error if present
      if (rawMsg.trim().startsWith("{") && rawMsg.includes("error")) {
        try {
          const parsed = JSON.parse(rawMsg);
          if (parsed?.error) {
            if (typeof parsed.error === "string") rawMsg = parsed.error;
            else if (typeof parsed.error?.message === "string") rawMsg = parsed.error.message;
          }
        } catch (e) {
          // ignore
        }
      }

      let userFriendlyMsg = rawMsg;
      if (
        rawMsg.includes("503") ||
        rawMsg.includes("UNAVAILABLE") ||
        rawMsg.includes("high demand") ||
        rawMsg.includes("overloaded")
      ) {
        userFriendlyMsg = "Máy chủ Google AI hiện đang cao tải tạm thời (Lỗi 503 High Demand). Hệ thống đã tự động thử nghiệm mô hình dự phòng, bạn vui lòng đợi 3-5 giây rồi nhấn 'Nộp bài & Bắt đầu chấm điểm' lại!";
      } else if (
        rawMsg.includes("429") ||
        rawMsg.includes("RESOURCE_EXHAUSTED") ||
        rawMsg.includes("rate_limit") ||
        rawMsg.includes("quota exceeded")
      ) {
        userFriendlyMsg = "Hệ thống đang tạm thời chạm giới hạn tần suất trong 1 phút (Rate Limit / 429). Bạn vui lòng đợi khoảng 5-10 giây rồi nhấn 'Nộp bài & Bắt đầu chấm điểm' lại!";
      }

      setError(userFriendlyMsg);

      if (customApiKey.trim()) {
        const lowerMsg = rawMsg.toLowerCase();
        if (
          lowerMsg.includes("invalid") ||
          lowerMsg.includes("không hợp lệ") ||
          lowerMsg.includes("không chính xác") ||
          lowerMsg.includes("api_key_invalid")
        ) {
          setIsKeyValid(false);
          setKeyValidationMsg("Mã API Key không đúng hoặc đã bị xóa trên Google AI Studio. Vui lòng kiểm tra lại khóa của bạn.");
          setForceShowConfig(true);
          localStorage.setItem("ava_custom_api_key_valid", "false");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle switching task type tabs
  const handleSwitchTaskType = (newType: "task1" | "task2" | "combo") => {
    if (newType === taskType) return;
    setTaskType(newType);
    setError(null);

    if (newType === "combo") {
      // If switching to combo, auto-populate from latest task 1 and task 2 in history if empty
      const latestT1 = history.find((h) => h.taskType === "task1");
      const latestT2 = history.find((h) => h.taskType === "task2");
      if (latestT1 && !essay.trim()) {
        setEssay(latestT1.essay);
        setPrompt(latestT1.prompt);
        if (latestT1.image) setTask1Image(latestT1.image);
      }
      if (latestT2 && !task2Essay.trim()) {
        setTask2Essay(latestT2.essay);
        setTask2Prompt(latestT2.prompt);
      }
    } else {
      // When selecting a specific task type (Task 1 or Task 2):
      const currentActiveItem = history.find((h) => h.id === activeHistoryId);
      if (currentActiveItem && currentActiveItem.taskType === newType) {
        return;
      }

      // Look for latest matching item in history
      const matchingItem = history.find((h) => h.taskType === newType);
      if (matchingItem) {
        setEssay(matchingItem.essay);
        setPrompt(matchingItem.prompt);
        setReport(matchingItem.report);
        if (matchingItem.image) {
          setTask1Image(matchingItem.image);
        } else if (newType === "task1") {
          setTask1Image(null);
        }
        setActiveHistoryId(matchingItem.id);
      } else {
        // If current report was for a different task, clear report to only display feedback for the chosen task
        if (report) {
          setReport(null);
          setActiveHistoryId(undefined);
        }
      }
    }
  };

  // Reset/Clear active inputs for a new attempt
  const handleNewAttempt = () => {
    setEssay("");
    setPrompt("");
    setTask2Essay("");
    setTask2Prompt("");
    setTask1Image(null);
    setReport(null);
    setActiveHistoryId(undefined);
    setError(null);
  };

  // Reload an item from the history
  const handleSelectHistory = (item: EssayHistoryItem) => {
    setEssay(item.essay);
    setTaskType(item.taskType);
    setPrompt(item.prompt);
    setReport(item.report);
    if (item.image) {
      setTask1Image(item.image);
    } else if (item.taskType === "task1") {
      setTask1Image(null);
    }
    setActiveHistoryId(item.id);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Delete an item from the history
  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = history.filter((item) => item.id !== id);
    saveHistoryToCache(filtered);
    if (activeHistoryId === id) {
      setReport(null);
      setActiveHistoryId(undefined);
    }
  };

  // Clear all history logs
  const handleClearHistory = () => {
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử chấm bài không? Thao tác này không thể khôi phục.")) {
      saveHistoryToCache([]);
      setReport(null);
      setActiveHistoryId(undefined);
    }
  };

  // Handle trigger for revision flow
  const handleRevisionTrigger = (revisedText: string) => {
    setEssay(revisedText);
    setReport(null);
    setActiveHistoryId(undefined);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-16" id="app-root">
      {/* Upper Navigation & Branding Header */}
      <header className="bg-blue-900 text-white border-b-4 border-[#FDFA55] shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and title */}
            <div className="flex items-center space-x-3">
              {/* Fixed Official Mỹ Du Avatar Badge */}
              <div
                className="relative cursor-pointer group"
                onClick={() => logoInputRef.current?.click()}
                title="Logo Trường Anh Ngữ Mỹ Du (Bấm để đổi nếu cần)"
              >
                <input
                  type="file"
                  ref={logoInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <div className="relative">
                  <img
                    src={customLogo || DEFAULT_MYDU_LOGO}
                    alt="Logo Trường Anh Ngữ Mỹ Du"
                    className="w-10 h-10 rounded-full object-cover shadow-md border-2 border-[#FDFA55] group-hover:scale-105 group-hover:border-[#FDFA55] transition-all bg-blue-950 shrink-0"
                  />
                </div>
              </div>

              {/* Title & Slogan */}
              <div className="cursor-pointer" onClick={handleNewAttempt}>
                <h1 className="text-lg font-bold tracking-tight uppercase font-display flex items-center space-x-2">
                  <span>BẬC THẦY WRITING IELTS</span>
                </h1>
                <p className="text-xs text-[#FDFA55] font-medium tracking-wide">
                  Dare to dream, think &amp; do 🍃
                </p>
              </div>
            </div>

            {/* School Info & Security Badge */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSecurityModal(true)}
                className="px-3 py-1.5 bg-blue-900/60 hover:bg-blue-900 border border-blue-400/30 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Quản lý Tài khoản & Phân quyền"
              >
                <ShieldCheck className="w-4 h-4 text-[#FDFA55]" />
                <span className="hidden xs:inline">Tài khoản</span>
              </button>

              <div className="hidden sm:flex flex-col items-end text-right">
              <div className="text-sm font-bold uppercase tracking-wider text-white">TRƯỜNG ANH NGỮ MỸ DU</div>
              <div className="text-xs font-medium text-[#FDFA55] flex items-center gap-2 mt-0.5">
                <span>📍 51, Đường 2, Phước Long, HCM</span>
                <span className="flex items-center gap-1">
                  {/* Colored Desk Telephone Icon with Buttons */}
                  <svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Phone Base */}
                    <path d="M3 10C3 8.34315 4.34315 7 6 7H18C19.6569 7 21 8.34315 21 10V18C21 19.6569 19.6569 21 18 21H6C4.34315 21 3 19.6569 3 18V10Z" fill="#DC2626" />
                    <path d="M5 11C5 9.89543 5.89543 9 7 9H17C18.1046 9 19 9.89543 19 11V18C19 19.1046 18.1046 20 17 20H7C5.89543 20 5 19.1046 5 18V11Z" fill="#991B1B" />
                    {/* Keypad Display Box */}
                    <rect x="7" y="11.5" width="10" height="6.5" rx="1" fill="#0F172A" />
                    {/* Buttons Row 1 */}
                    <rect x="8.2" y="12.4" width="2" height="1.3" rx="0.3" fill="#FFFFFF" />
                    <rect x="11" y="12.4" width="2" height="1.3" rx="0.3" fill="#FFFFFF" />
                    <rect x="13.8" y="12.4" width="2" height="1.3" rx="0.3" fill="#FFFFFF" />
                    {/* Buttons Row 2 */}
                    <rect x="8.2" y="14.1" width="2" height="1.3" rx="0.3" fill="#FFFFFF" />
                    <rect x="11" y="14.1" width="2" height="1.3" rx="0.3" fill="#FFFFFF" />
                    <rect x="13.8" y="14.1" width="2" height="1.3" rx="0.3" fill="#FFFFFF" />
                    {/* Buttons Row 3 */}
                    <rect x="8.2" y="15.8" width="2" height="1.3" rx="0.3" fill="#EF4444" />
                    <rect x="11" y="15.8" width="2" height="1.3" rx="0.3" fill="#FFFFFF" />
                    <rect x="13.8" y="15.8" width="2" height="1.3" rx="0.3" fill="#10B981" />
                    {/* Handset Receiver on Cradle */}
                    <path d="M2 7.5C2 6.11929 3.11929 5 4.5 5H19.5C20.8807 5 22 6.11929 22 7.5V8.5C22 9.32843 21.3284 10 20.5 10H18.5C17.6716 10 17 9.32843 17 8.5V7H7V8.5C7 9.32843 6.32843 10 5.5 10H3.5C2.67157 10 2 9.32843 2 8.5V7.5Z" fill="#FDFA55" />
                    <path d="M3.5 5.5C3.5 4.67157 4.17157 4 5 4H19C19.8284 4 20.5 4.67157 20.5 5.5V6.5H3.5V5.5Z" fill="#FDFA55" />
                  </svg>
                  <span>0919309322</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Collapsible API Key Configuration Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6 transition-all" id="api-key-accordion">
          {/* Header Toggle Bar */}
          <div
            onClick={() => setShowApiKeySection(!showApiKeySection)}
            className="px-4 py-3 bg-slate-50/80 hover:bg-slate-100/80 flex items-center justify-between cursor-pointer select-none transition-colors border-b border-transparent data-[open=true]:border-slate-200"
            data-open={showApiKeySection}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-900 shrink-0">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Cấu hình API Key Cá Nhân (Tùy chọn)
                </span>
                {customApiKey ? (
                  <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Đang bật khóa riêng
                  </span>
                ) : (
                  <span className="ml-2 text-[11px] text-slate-500 font-normal hidden sm:inline">
                    (Mặc định sử dụng máy chủ trường Mỹ Du)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 hover:text-blue-700">
              <span>{showApiKeySection ? "Thu gọn" : "Mở cấu hình"}</span>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${showApiKeySection ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Collapsible Content */}
          {showApiKeySection && (
            <div className="p-4 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fadeIn border-t border-slate-100">
              <div className="max-w-md">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Khóa Gemini API riêng của bạn
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Nhập khóa <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline text-blue-800 hover:text-blue-600 font-medium">Gemini API Key cá nhân</a> nếu bạn muốn dùng hạn ngạch riêng độc lập.
                </p>
              </div>

              <div className="flex-1 max-w-sm w-full">
                <div className="relative">
                  <input
                    type="password"
                    value={customApiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="Nhập khóa API Key (AIzaSy...)"
                    className="w-full text-xs bg-slate-50 text-slate-800 border border-slate-300 rounded-lg pl-3 pr-16 py-2.5 focus:ring-1 focus:ring-blue-900 focus:border-blue-900 outline-none transition-all placeholder:text-slate-400 font-mono"
                  />
                  {customApiKey && (
                    <button 
                      onClick={() => handleApiKeyChange("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500 hover:text-rose-700 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                      title="Xóa khóa API"
                    >
                      Xóa
                    </button>
                  )}
                </div>

                {/* Validation Status Message */}
                {customApiKey.trim().length > 0 && (
                  <div className="mt-1.5 text-[11px] font-medium flex items-center gap-1.5">
                    {isValidatingKey ? (
                      <span className="text-blue-600 animate-pulse flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                        Đang tự động xác minh khóa...
                      </span>
                    ) : isKeyValid === true ? (
                      <span className="text-emerald-600 font-semibold">✓ {keyValidationMsg}</span>
                    ) : isKeyValid === false ? (
                      <span className="text-rose-600 font-semibold">✗ {keyValidationMsg}</span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT PANEL: INPUT PANEL & SETTINGS (Lg: cols-5) */}
          <section className="lg:col-span-5 space-y-6" id="input-section">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              
              {/* Header Title inside panel & Thông Tin Bài Viết */}
              <div className="border-b border-slate-100 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BookOpenCheck className="w-5 h-5 text-blue-700" />
                    <h2 className="font-extrabold text-sm uppercase tracking-tight text-slate-800 font-display">
                      Soạn thảo bài viết
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleNewAttempt}
                    className="text-xs text-slate-500 hover:text-blue-800 font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                    title="Xóa trắng để làm bài viết mới"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-blue-700" />
                    <span>Bài viết mới</span>
                  </button>
                </div>

                {/* THÔNG TIN BÀI VIẾT BLOCK */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center space-x-1.5 text-xs font-extrabold uppercase text-blue-900 tracking-wider">
                    <GraduationCap className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>Thông Tin Bài Viết</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        1. Lớp:
                      </label>
                      <input
                        type="text"
                        value={studentClass}
                        onChange={(e) => setStudentClass(e.target.value)}
                        placeholder="Nhập lớp..."
                        className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 focus:border-blue-700 outline-none text-slate-800 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        2. GV Hướng Dẫn:
                      </label>
                      <input
                        type="text"
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        placeholder="Nhập tên GV..."
                        className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 focus:border-blue-700 outline-none text-slate-800 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        3. Họ và tên:
                      </label>
                      <input
                        type="text"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="Nhập tên học sinh..."
                        className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 focus:border-blue-700 outline-none text-slate-800 font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Type Toggle */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Dạng bài thi IELTS (Task Type):
                </label>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleSwitchTaskType("task1")}
                    className={`py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      taskType === "task1"
                        ? "bg-white text-blue-900 shadow-xs border border-slate-200/80"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Task 1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchTaskType("task2")}
                    className={`py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      taskType === "task2"
                        ? "bg-white text-blue-900 shadow-xs border border-slate-200/80"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Task 2
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchTaskType("combo")}
                    className={`py-2 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer ${
                      taskType === "combo"
                        ? "bg-amber-400 text-blue-950 shadow-xs border border-amber-300"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Task 1 + 2
                  </button>
                </div>
              </div>

              {taskType === "combo" ? (
                /* DUAL TASK COMBO MODE INPUTS */
                <div className="space-y-6 animate-fadeIn">
                  {/* PHẦN 1: TASK 1 */}
                  <div className="space-y-4 border-b border-slate-200 pb-5">
                    <div className="flex items-center space-x-2 text-blue-900 font-extrabold text-xs uppercase tracking-wider bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                      <span>📊 PHẦN 1: IELTS WRITING TASK 1</span>
                    </div>

                    {/* Task 1 Prompt */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Đề bài Task 1:
                      </label>
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ví dụ: The charts below show the percentage of household access to internet..."
                        rows={2}
                        className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all scrollbar-thin"
                      />
                    </div>

                    {/* Task 1 Diagram Image */}
                    <div className="space-y-1.5" id="task1-image-upload-container">
                      <div className="flex justify-between items-center">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          Hình ảnh biểu đồ / sơ đồ Task 1:
                        </label>
                      </div>

                      {task1Image ? (
                        <div className="relative bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={task1Image}
                              alt="Task 1 diagram"
                              className="w-12 h-12 object-cover rounded-lg border border-slate-300 shadow-sm shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="block text-xs font-bold text-slate-800 truncate">
                                ✓ Đã chèn hình ảnh biểu đồ
                              </span>
                              <span className="text-[10px] text-emerald-600 font-medium block">
                                AVA sẽ soi chiếu hình ảnh khi chấm.
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTask1Image(null)}
                            className="px-2 py-1 text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
                          >
                            Xóa
                          </button>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingTask1Image(true);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            setIsDraggingTask1Image(false);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingTask1Image(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) processTask1ImageFile(file);
                          }}
                          className={`border-2 border-dashed rounded-xl p-3 text-center transition-all duration-200 flex flex-col items-center justify-center ${
                            isDraggingTask1Image
                              ? "border-blue-500 bg-blue-50/80 scale-[1.01]"
                              : "border-slate-200 hover:border-blue-500 bg-slate-50/50"
                          }`}
                        >
                          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                            <div className="flex items-center gap-1.5 text-slate-600 group-hover:text-blue-900">
                              <Image className="w-4 h-4 text-blue-700" />
                              <span className="text-xs font-bold text-slate-800">
                                {isDraggingTask1Image ? "Thả hình vào đây ngay" : "Thả hoặc chọn hình biểu đồ Task 1"}
                              </span>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleTask1ImageUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Task 1 Essay */}
                    <div className="space-y-1.5 relative">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          Nội dung bài viết Task 1:
                        </label>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            wordCount >= 150 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          {wordCount} / 150 từ
                        </span>
                      </div>
                      <textarea
                        value={essay}
                        onChange={(e) => setEssay(e.target.value)}
                        placeholder="Nhập hoặc dán bài viết IELTS Task 1 vào đây..."
                        rows={8}
                        className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-serif leading-relaxed transition-all scrollbar-thin"
                      />
                    </div>
                  </div>

                  {/* PHẦN 2: TASK 2 */}
                  <div className="space-y-4 pt-1">
                    <div className="flex items-center space-x-2 text-indigo-900 font-extrabold text-xs uppercase tracking-wider bg-indigo-50 p-2.5 rounded-xl border border-indigo-100">
                      <span>✍️ PHẦN 2: IELTS WRITING TASK 2</span>
                    </div>

                    {/* Task 2 Prompt */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Đề bài Task 2:
                      </label>
                      <textarea
                        value={task2Prompt}
                        onChange={(e) => setTask2Prompt(e.target.value)}
                        placeholder="Ví dụ: Some people believe that university education should be free..."
                        rows={2}
                        className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all scrollbar-thin"
                      />
                    </div>

                    {/* Task 2 Essay */}
                    <div className="space-y-1.5 relative">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          Nội dung bài viết Task 2:
                        </label>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            task2WordCount >= 250 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          {task2WordCount} / 250 từ
                        </span>
                      </div>
                      <textarea
                        value={task2Essay}
                        onChange={(e) => setTask2Essay(e.target.value)}
                        placeholder="Nhập hoặc dán bài viết IELTS Task 2 vào đây..."
                        rows={10}
                        className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-serif leading-relaxed transition-all scrollbar-thin"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* SINGLE TASK INPUTS (Task 1 or Task 2) */
                <>
                  {/* Original Question Prompt */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Đề bài gốc (Original Question):
                      </label>
                      <span className="text-[10px] text-slate-400 font-semibold">(Khuyên dùng)</span>
                    </div>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={
                        taskType === "task1"
                          ? "Ví dụ: The charts below show the percentage of household access to internet..."
                          : "Ví dụ: Some people believe that university education should be free..."
                      }
                      rows={2}
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all scrollbar-thin"
                    />
                  </div>

                  {/* Task 1 Diagram / Chart Image Input */}
                  {taskType === "task1" && (
                    <div className="space-y-2 animate-fadeIn" id="task1-image-upload-container">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Hình ảnh biểu đồ / sơ đồ Task 1:
                        </label>
                        <span className="text-[10px] text-blue-700 font-bold">(Giúp AI chấm Task 1 chuẩn nhất)</span>
                      </div>

                      {task1Image ? (
                        <div className="relative bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={task1Image}
                              alt="Task 1 diagram"
                              className="w-14 h-14 object-cover rounded-lg border border-slate-300 shadow-sm shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="block text-xs font-bold text-slate-800 truncate">
                                ✓ Đã chèn hình ảnh biểu đồ Task 1
                              </span>
                              <span className="text-[11px] text-emerald-600 font-medium block">
                                AVA sẽ trực tiếp soi chiếu hình ảnh này khi chấm bài.
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTask1Image(null)}
                            className="px-2.5 py-1 text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
                          >
                            Xóa ảnh
                          </button>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingTask1Image(true);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            setIsDraggingTask1Image(false);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingTask1Image(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) processTask1ImageFile(file);
                          }}
                          className={`border-2 border-dashed rounded-xl p-4 text-center transition-all duration-200 flex flex-col items-center justify-center ${
                            isDraggingTask1Image
                              ? "border-blue-500 bg-blue-50/80 scale-[1.01] shadow-md"
                              : "border-slate-200 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/20"
                          }`}
                        >
                          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                            <div className="flex items-center gap-2 text-slate-600 group-hover:text-blue-900 transition-colors">
                              <Image className="w-5 h-5 text-blue-700" />
                              <span className="text-xs font-bold text-slate-800">
                                {isDraggingTask1Image
                                  ? "Thả tệp hình ảnh vào đây ngay"
                                  : "Thả hoặc chọn hình ảnh biểu đồ / sơ đồ Task 1"}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1">
                              Kéo &amp; thả tệp PNG, JPG, WEBP vào đây hoặc bấm để chọn tệp (Tối đa 8MB)
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleTask1ImageUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Drag-and-drop Word Extractor */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Hoặc tải tệp bài viết từ máy tính:
                    </label>
                    <FileUploader
                      onTextExtracted={(text) => {
                        setEssay(text);
                        setError(null);
                      }}
                      onError={(msg) => setError(msg)}
                    />
                  </div>

                  {/* Essay Text Area */}
                  <div className="space-y-2 relative">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Nội dung bài viết (Your Essay):
                      </label>
                      
                      {/* Dynamic Word Progress Counter */}
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          wordCount >= targetWordCount
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-600 animate-pulse"
                        }`}
                      >
                        {wordCount} / {targetWordCount} từ
                      </span>
                    </div>

                    <textarea
                      value={essay}
                      onChange={(e) => setEssay(e.target.value)}
                      placeholder="Nhập hoặc dán nội dung bài viết IELTS Academic của bạn vào đây..."
                      rows={14}
                      className="w-full text-xs p-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-serif leading-relaxed transition-all scrollbar-thin"
                    />

                    {/* Progress bar line under textarea */}
                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden absolute bottom-1.5 left-0">
                      <div
                        className={`h-full transition-all duration-300 ${
                          wordCount >= targetWordCount ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${wordCountProgress}%` }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Error indicator */}
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl flex items-start space-x-2.5 text-rose-800 text-xs leading-relaxed animate-fadeIn">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action grading button */}
              <button
                onClick={handleGradeEssay}
                disabled={loading}
                className={`w-full py-4 px-6 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center space-x-2 ${
                  loading
                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                    : "bg-blue-900 hover:bg-blue-850 text-white shadow-blue-900/10 hover:shadow-lg active:scale-[0.99] cursor-pointer"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    <span>Hệ Thống AVA Đang Chấm Bài...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-amber-300" />
                    <span>Nộp bài & Bắt đầu chấm điểm</span>
                  </>
                )}
              </button>

            </div>

            {/* Previous Essay Review History Logs */}
            <ReviewHistory
              history={history}
              onSelect={handleSelectHistory}
              onDelete={handleDeleteHistory}
              onClearAll={handleClearHistory}
              activeId={activeHistoryId}
            />
          </section>

          {/* RIGHT PANEL: REPORT VIEWER / LOADING SCREEN / PLACEHOLDER (Lg: cols-7) */}
          <section className="lg:col-span-7" id="output-section">
            
            {loading ? (
              // Stunning, comprehensive Loading state
              <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center shadow-xl space-y-6 flex flex-col items-center justify-center min-h-[500px] animate-fadeIn">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-blue-700 animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Award className="w-6 h-6 text-amber-500" />
                  </div>
                </div>

                <div className="space-y-2 max-w-sm">
                  <h3 className="font-extrabold text-base text-slate-800 tracking-tight font-display">
                    Đang khảo thí bài viết của bạn
                  </h3>
                  <p className="text-xs text-slate-500 font-medium animate-pulse min-h-[32px] flex items-center justify-center">
                    {loadingStep}
                  </p>
                </div>

                {/* Simulated professional progress checkpoints */}
                <div className="w-full max-w-xs space-y-2 pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-semibold text-left">
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span>[OK] Khai báo tệp tin & Khởi tạo phiên khảo thí</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span>[OK] Kiểm tra và đối sánh số từ: {wordCount} từ</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                    <span>[PENDING] Chạy phân tích thuật toán ngữ pháp và từ vựng</span>
                  </div>
                </div>
              </div>
            ) : report ? (
              // Loaded certificate report dashboard
              (() => {
                const activeTaskData: TaskExportData = {
                  taskType,
                  promptText: prompt,
                  originalEssay: essay,
                  report,
                  task1Image: taskType === "task1" ? task1Image : null,
                  studentClass,
                  teacherName,
                  studentName,
                };

                let availableTasks: TaskExportData[] = [];
                if (taskType === "combo") {
                  const latestTask1Item = history.find((item) => item.taskType === "task1");
                  const latestTask2Item = history.find((item) => item.taskType === "task2");

                  const t1Data: TaskExportData | null = latestTask1Item
                    ? {
                        taskType: "task1",
                        promptText: latestTask1Item.prompt,
                        originalEssay: latestTask1Item.essay,
                        report: latestTask1Item.report,
                        task1Image: latestTask1Item.image || task1Image,
                        studentClass,
                        teacherName,
                        studentName,
                      }
                    : null;

                  const t2Data: TaskExportData | null = latestTask2Item
                    ? {
                        taskType: "task2",
                        promptText: latestTask2Item.prompt,
                        originalEssay: latestTask2Item.essay,
                        report: latestTask2Item.report,
                        task1Image: null,
                        studentClass,
                        teacherName,
                        studentName,
                      }
                    : null;

                  if (t1Data) availableTasks.push(t1Data);
                  if (t2Data) availableTasks.push(t2Data);
                  if (availableTasks.length === 0) {
                    availableTasks = [activeTaskData];
                  }
                } else {
                  // Explicit single task: only include the active task!
                  availableTasks = [activeTaskData];
                }

                return (
                  <ReportDashboard
                    report={report}
                    onRevision={handleRevisionTrigger}
                    originalEssay={essay}
                    taskType={taskType}
                    promptText={prompt}
                    allAvailableTasks={availableTasks}
                    task1Image={task1Image}
                    studentClass={studentClass}
                    teacherName={teacherName}
                    studentName={studentName}
                  />
                );
              })()
            ) : (
              // Clean, aesthetic Placeholder explaining the system benefit
              <div className="bg-gradient-to-b from-white to-slate-50/50 border border-slate-200 rounded-2xl p-8 sm:p-12 shadow-xl min-h-[600px] flex flex-col items-center justify-center text-center">
                
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 mb-6 shadow-sm">
                  <BookOpenCheck className="w-8 h-8" />
                </div>

                <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-800 font-display">
                  Sẵn sàng nâng tầm kỹ năng Writing Academic?
                </h3>
                <p className="text-xs text-slate-500 max-w-md mt-2 leading-relaxed">
                  Hệ thống AVA mang đến trải nghiệm chấm thi thử chuẩn xác như một giám khảo cao cấp thực tế. Hoàn thành bài viết của bạn bên trái và nộp bài để nhận báo cáo phân tích toàn diện.
                </p>

                {/* Features highlighted beautifully */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mt-8 text-left">
                  <div className="p-4 bg-white rounded-xl border border-slate-100 flex items-start space-x-3 shadow-sm">
                    <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold mt-0.5">01</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Chuẩn Thang Band Descriptors</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Chấm điểm độc lập 4 tiêu chí khắt khe theo đúng văn bản mô tả băng điểm cập nhật 2023.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-slate-100 flex items-start space-x-3 shadow-sm">
                    <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold mt-0.5">02</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Sửa lỗi trực quan</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Trích dẫn trực tiếp các câu văn yếu trong bài viết của bạn và đề xuất phiên bản nâng cấp hoàn hảo.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-slate-100 flex items-start space-x-3 shadow-sm">
                    <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold mt-0.5">03</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Bài mẫu độc quyền</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Cung cấp bài mẫu nâng cấp hoàn chỉnh đạt chuẩn Band 8.5+ dựa trên ý tưởng bài viết gốc của bạn.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-slate-100 flex items-start space-x-3 shadow-sm">
                    <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold mt-0.5">04</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Vòng lặp sửa đổi</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Giúp bạn tinh chỉnh bài viết nhiều vòng bằng cách dễ dàng đưa văn bản nâng cấp trở lại khu vực nháp.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </section>

        </div>
      </main>

      {/* Security Lock Screen Gate */}
      {!isUnlocked && <LockScreen onUnlockSuccess={handleUnlockSuccess} />}

      {/* Security Admin & User Accounts Modal */}
      <SecurityAdminModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        userRole={sessionRole}
        sessionToken={sessionToken}
        onLockApp={handleLockApp}
      />
    </div>
  );
}
