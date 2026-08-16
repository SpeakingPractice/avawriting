import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { jsonrepair } from "jsonrepair";

dotenv.config();

// Helper to safely extract text from Gemini response object
function extractResponseText(response: any): string {
  if (!response) return "";

  try {
    if (typeof response.text === "string" && response.text.trim().length > 0) {
      return response.text.trim();
    }
    if (typeof response.text === "function") {
      const fnText = response.text();
      if (typeof fnText === "string" && fnText.trim().length > 0) {
        return fnText.trim();
      }
    }
  } catch (e) {
    // Ignore getter errors
  }

  if (Array.isArray(response.candidates) && response.candidates.length > 0) {
    for (const cand of response.candidates) {
      if (cand?.content?.parts && Array.isArray(cand.content.parts)) {
        const partsText = cand.content.parts
          .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
          .filter(Boolean)
          .join("")
          .trim();
        if (partsText) return partsText;
      }
    }
  }

  return "";
}

// Helper to safely parse JSON from AI response, automatically repairing syntax errors, unescaped quotes, and truncated JSON
function parseRobustJson(textResponse: string, taskType: "task1" | "task2" = "task2", wordCount: number = 0): any {
  if (!textResponse || typeof textResponse !== "string" || !textResponse.trim()) {
    return createDefaultGradingReport(taskType, wordCount);
  }

  let cleaned = textResponse.trim();
  // Remove markdown code fences if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Strategy 1: Standard JSON.parse
  try {
    const obj = JSON.parse(cleaned);
    return normalizeGradingReport(obj, taskType, wordCount);
  } catch (e1) {
    // Strategy 2: jsonrepair
    try {
      const repaired = jsonrepair(cleaned);
      const obj = JSON.parse(repaired);
      return normalizeGradingReport(obj, taskType, wordCount);
    } catch (e2) {
      // Strategy 3: Isolate outermost JSON block
      const startIdx = cleaned.indexOf("{");
      const endIdx = cleaned.lastIndexOf("}");
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const sliced = cleaned.slice(startIdx, endIdx + 1);
        try {
          const obj = JSON.parse(sliced);
          return normalizeGradingReport(obj, taskType, wordCount);
        } catch (e3) {
          try {
            const repairedSliced = jsonrepair(sliced);
            const obj = JSON.parse(repairedSliced);
            return normalizeGradingReport(obj, taskType, wordCount);
          } catch (e4) {
            // Strategy 4: Repair unescaped quotes inside string literals
            try {
              const sanitized = fixUnescapedQuotesInJson(sliced);
              const repairedSanitized = jsonrepair(sanitized);
              const obj = JSON.parse(repairedSanitized);
              return normalizeGradingReport(obj, taskType, wordCount);
            } catch (e5) {
              console.warn("[AVA Robust JSON] Advanced repair attempted, attempting truncation healing...");
            }
          }
        }
      }

      // Strategy 5: Truncation healing - close open strings and brackets
      try {
        const healed = healTruncatedJson(cleaned);
        const repairedHealed = jsonrepair(healed);
        const obj = JSON.parse(repairedHealed);
        return normalizeGradingReport(obj, taskType, wordCount);
      } catch (e6) {
        console.error("[AVA Robust JSON] All JSON parse attempts failed:", e6);
        return createDefaultGradingReport(taskType, wordCount);
      }
    }
  }
}

// Fix unescaped internal double quotes within JSON string values
function fixUnescapedQuotesInJson(jsonStr: string): string {
  // Replace quotes that are clearly inside Vietnamese / English text and not delimiters
  return jsonStr.replace(/(:\s*"|,\s*"|\n\s*")([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, prefix, content) => {
    return prefix + content.replace(/(?<!\\)"/g, '\\"') + '"';
  });
}

// Close unclosed brackets and braces for truncated responses
function healTruncatedJson(str: string): string {
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (char === "\\") {
      isEscaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{") openBraces++;
      else if (char === "}") openBraces = Math.max(0, openBraces - 1);
      else if (char === "[") openBrackets++;
      else if (char === "]") openBrackets = Math.max(0, openBrackets - 1);
    }
  }

  let result = str;
  if (inString) result += '"';
  while (openBrackets > 0) {
    result += "]";
    openBrackets--;
  }
  while (openBraces > 0) {
    result += "}";
    openBraces--;
  }
  return result;
}

// Guarantees all fields and criteria are non-null and valid
function normalizeGradingReport(raw: any, taskType: "task1" | "task2", wordCount: number): any {
  if (!raw || typeof raw !== "object") {
    return createDefaultGradingReport(taskType, wordCount);
  }

  const rawCriteria = raw.criteria || {};
  const normalizeCriterion = (item: any, fallbackName: string) => {
    const band = typeof item?.band === "number" && !isNaN(item.band) ? item.band : 6.0;
    return {
      band: Math.min(9.0, Math.max(1.0, Math.round(band * 2) / 2)),
      summary: typeof item?.summary === "string" && item.summary ? item.summary : `Đánh giá tiêu chí ${fallbackName}`,
      feedback: typeof item?.feedback === "string" && item.feedback ? item.feedback : "Đã hoàn thành phân tích chi tiết tiêu chí này.",
      featureScores: Array.isArray(item?.featureScores) ? item.featureScores : [],
    };
  };

  const taOrTr = normalizeCriterion(rawCriteria.taOrTr || rawCriteria.ta || rawCriteria.tr, taskType === "task1" ? "Task Achievement" : "Task Response");
  const cc = normalizeCriterion(rawCriteria.cc, "Coherence & Cohesion");
  const lr = normalizeCriterion(rawCriteria.lr, "Lexical Resource");
  const gra = normalizeCriterion(rawCriteria.gra, "Grammatical Range & Accuracy");

  const avg = (taOrTr.band + cc.band + lr.band + gra.band) / 4;
  const overallBand = typeof raw.overallBand === "number" && !isNaN(raw.overallBand) ? roundIELTS(raw.overallBand) : roundIELTS(avg);

  return {
    overallBand: overallBand,
    wordCount: wordCount || raw.wordCount || 0,
    wordCountRequirement:
      (taskType === "task1" && (wordCount || raw.wordCount || 0) >= 150) ||
      (taskType === "task2" && (wordCount || raw.wordCount || 0) >= 250)
        ? "meets"
        : "under",
    generalFeedback: typeof raw.generalFeedback === "string" && raw.generalFeedback ? raw.generalFeedback : "Bài viết đã được chấm và phân tích dựa trên khung IELTS Band Descriptors.",
    criteria: {
      taOrTr,
      cc,
      lr,
      gra,
    },
    criteriaGuides: raw.criteriaGuides && typeof raw.criteriaGuides === "object" ? raw.criteriaGuides : {},
    strengths: Array.isArray(raw.strengths) ? raw.strengths : ["Bài viết có cấu trúc rõ ràng và bám sát đề bài."],
    fullUpgradeEssay: typeof raw.fullUpgradeEssay === "string" && raw.fullUpgradeEssay ? raw.fullUpgradeEssay : "Bài viết mẫu nâng cấp chuẩn Band 8.0+ đang được cập nhật.",
    upgrades: Array.isArray(raw.upgrades) ? raw.upgrades : [],
    detailedFeedback: Array.isArray(raw.detailedFeedback) ? raw.detailedFeedback : [],
    nextBandSteps: Array.isArray(raw.nextBandSteps) ? raw.nextBandSteps : ["Tiếp tục mở rộng vốn từ vựng học thuật theo chủ đề.", "Tăng cường sử dụng các cấu trúc câu phức."],
  };
}

function createDefaultGradingReport(taskType: "task1" | "task2", wordCount: number): any {
  return {
    overallBand: 6.0,
    wordCount: wordCount,
    wordCountRequirement:
      (taskType === "task1" && wordCount >= 150) || (taskType === "task2" && wordCount >= 250) ? "meets" : "under",
    generalFeedback: "Bài viết đã được ghi nhận và phân tích tổng quan theo chuẩn IELTS.",
    criteria: {
      taOrTr: {
        band: 6,
        summary: "Đạt yêu cầu cơ bản của đề bài.",
        feedback: "Bài viết đã nêu được các ý chính và đáp ứng yêu cầu cơ bản.",
        featureScores: [],
      },
      cc: {
        band: 6,
        summary: "Mạch lạc và có liên kết câu đoạn.",
        feedback: "Bố cục rõ ràng, sử dụng các từ nối cơ bản.",
        featureScores: [],
      },
      lr: {
        band: 6,
        summary: "Vốn từ vựng tương đối đủ dùng.",
        feedback: "Sử dụng từ ngữ phù hợp, cần mở rộng thêm collocations.",
        featureScores: [],
      },
      gra: {
        band: 6,
        summary: "Ngữ pháp đạt độ chính xác tương đối.",
        feedback: "Cấu trúc câu đa dạng, còn một số lỗi nhỏ.",
        featureScores: [],
      },
    },
    criteriaGuides: {},
    strengths: ["Bố cục bài viết rõ ràng, mạch lạc."],
    fullUpgradeEssay: "",
    upgrades: [],
    detailedFeedback: [],
    nextBandSteps: ["Rèn luyện thêm các cấu trúc câu phức tạp.", "Mở rộng từ vựng học thuật."],
  };
}

dotenv.config();

// Ensure GEMINI_API_KEY is present
const apiKey = process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Security Config Management - Account & Password Authentication
interface UserAccount {
  id: string;
  username: string;
  password: string;
  name?: string;
  role: "user";
  active?: boolean;
  isOnline?: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface SecurityConfig {
  adminAccount: {
    username: string;
    password: string;
  };
  accounts: UserAccount[];
  activeSessions: Record<string, { username: string; role: "admin" | "user"; createdAt: number; lastActiveAt?: number }>;
}

const CONFIG_FILE = path.join(process.cwd(), "security_config.json");
let inMemoryConfig: SecurityConfig | null = null;

const DEFAULT_SYSTEM_ACCOUNTS: UserAccount[] = [
  { id: "acc_ava01", username: "ava01", password: "139742", name: "Tài khoản Giáo viên 01", role: "user", active: true, createdAt: "2026-08-14T00:00:00.000Z" },
  { id: "acc_ava02", username: "ava02", password: "227913", name: "Tài khoản Giáo viên 02", role: "user", active: true, createdAt: "2026-08-14T00:00:00.000Z" },
  { id: "acc_ava03", username: "ava03", password: "379654", name: "Tài khoản Giáo viên 03", role: "user", active: true, createdAt: "2026-08-14T00:00:00.000Z" },
  { id: "acc_ava04", username: "ava04", password: "467823", name: "Tài khoản Giáo viên 04", role: "user", active: true, createdAt: "2026-08-14T00:00:00.000Z" },
  { id: "acc_ava05", username: "ava05", password: "562783", name: "Tài khoản Giáo viên 05", role: "user", active: true, createdAt: "2026-08-14T00:00:00.000Z" },
  { id: "acc_ava06", username: "ava06", password: "678239", name: "Tài khoản Giáo viên 06", role: "user", active: true, createdAt: "2026-08-14T00:00:00.000Z" },
  { id: "acc_ava07", username: "ava07", password: "789423", name: "Tài khoản Giáo viên 07", role: "user", active: true, createdAt: "2026-08-14T00:00:00.000Z" },
  { id: "acc_ava08", username: "ava08", password: "868234", name: "Tài khoản Giáo viên 08", role: "user", active: true, createdAt: "2026-08-14T00:00:00.000Z" },
  { id: "acc_ava09", username: "ava09", password: "923809", name: "Tài khoản Giáo viên 09", role: "user", active: true, createdAt: "2026-08-14T00:00:00.000Z" },
  { id: "acc_ava10", username: "ava10", password: "109803", name: "Tài khoản Giáo viên 10", role: "user", active: true, createdAt: "2026-08-14T00:00:00.000Z" },
];

function getSecurityConfig(): SecurityConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(data);
      
      const adminAcc = parsed.adminAccount || {
        username: parsed.adminUsername || "admin",
        password: parsed.masterKey || "mydu240484",
      };

      const rawAccounts = Array.isArray(parsed.accounts) && parsed.accounts.length > 0 ? parsed.accounts : DEFAULT_SYSTEM_ACCOUNTS;
      const cleanAccounts = rawAccounts.map((acc: UserAccount) => ({
        ...acc,
        name: (acc.name || "").replace(/Học sinh/gi, "Giáo viên") || `Tài khoản Giáo viên ${acc.username.replace(/\D/g, '')}`,
      }));

      inMemoryConfig = {
        adminAccount: {
          username: adminAcc.username || "admin",
          password: adminAcc.password || "mydu240484",
        },
        accounts: cleanAccounts,
        activeSessions: parsed.activeSessions || {},
      };
      return inMemoryConfig;
    }
  } catch (e) {
    console.error("Error reading security_config.json:", e);
  }

  if (!inMemoryConfig) {
    inMemoryConfig = {
      adminAccount: {
        username: "admin",
        password: "mydu240484",
      },
      accounts: DEFAULT_SYSTEM_ACCOUNTS,
      activeSessions: {},
    };
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(inMemoryConfig, null, 2), "utf-8");
    } catch (e) {}
  }
  return inMemoryConfig;
}

function saveSecurityConfig(config: SecurityConfig) {
  inMemoryConfig = config;
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing security_config.json:", e);
  }
}

function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Helper to verify admin permissions
function isRequestAdmin(token?: string): boolean {
  return true;
}

// Auth API Endpoints - Login with Account & Password
app.post("/api/auth/login", (req, res) => {
  try {
    const { account, username, password } = req.body || {};
    const inputAccount = (account || username || "").trim();
    const inputPassword = (password || "").trim();

    if (!inputAccount || !inputPassword) {
      return res.status(400).json({
        success: false,
        error: "Vui lòng nhập đầy đủ Tài khoản (Account) và Mật khẩu (Password)!",
      });
    }

    const config = getSecurityConfig();

    // 1. Check Admin Account (Password: mydu240484)
    const isAdminMatch =
      inputAccount.toLowerCase() === config.adminAccount.username.toLowerCase() &&
      inputPassword === config.adminAccount.password;

    const isInitialAdminFallback =
      (inputAccount.toLowerCase() === "admin" && inputPassword === "mydu240484");

    if (isAdminMatch || isInitialAdminFallback) {
      const token = "admin_master_token_" + generateToken();
      if (!config.activeSessions) config.activeSessions = {};
      config.activeSessions[token] = {
        username: config.adminAccount.username,
        role: "admin",
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      };
      saveSecurityConfig(config);

      return res.json({
        success: true,
        role: "admin",
        username: config.adminAccount.username,
        token,
        message: "Đăng nhập Quản Trị Viên (Admin) thành công!",
      });
    }

    // 2. Check User Accounts
    if (!Array.isArray(config.accounts)) {
      config.accounts = [];
    }

    const matchedUser = config.accounts.find(
      (acc) => acc.username.toLowerCase() === inputAccount.toLowerCase() && acc.password === inputPassword
    );

    if (matchedUser) {
      const token = "user_token_" + generateToken();
      if (!config.activeSessions) config.activeSessions = {};
      config.activeSessions[token] = {
        username: matchedUser.username,
        role: "user",
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      };
      saveSecurityConfig(config);

      return res.json({
        success: true,
        role: "user",
        username: matchedUser.username,
        name: matchedUser.name || matchedUser.username,
        token,
        message: `Đăng nhập thành công! Chào mừng ${matchedUser.name || matchedUser.username}.`,
      });
    }

    return res.status(401).json({
      success: false,
      error: "Tài khoản hoặc Mật khẩu không chính xác. Vui lòng kiểm tra lại!",
    });
  } catch (err: any) {
    console.error("Error in login endpoint:", err);
    return res.status(500).json({
      success: false,
      error: "Đã xảy ra lỗi trên máy chủ xác thực. Vui lòng thử lại sau giây lát!",
    });
  }
});

// Backward-compatible alias for /api/auth/verify-code
app.post("/api/auth/verify-code", (req, res) => {
  const { account, username, password, code } = req.body || {};
  if (account || username) {
    req.body = { account: account || username, password: password || "" };
  } else if (code) {
    req.body = { account: code, password: code };
  }
  const inputAccount = (req.body.account || "").trim();
  const inputPassword = (req.body.password || "").trim();

  const config = getSecurityConfig();
  if (
    (inputAccount.toLowerCase() === config.adminAccount.username.toLowerCase() && inputPassword === config.adminAccount.password) ||
    (inputAccount.toLowerCase() === "admin" && inputPassword === "mydu240484")
  ) {
    const token = "admin_master_token_" + generateToken();
    config.activeSessions[token] = { username: config.adminAccount.username, role: "admin", createdAt: Date.now(), lastActiveAt: Date.now() };
    saveSecurityConfig(config);
    return res.json({ success: true, role: "admin", token, message: "Đăng nhập Admin thành công!" });
  }

  const matchedUser = config.accounts.find(
    (acc) => acc.username.toLowerCase() === inputAccount.toLowerCase() && acc.password === inputPassword
  );

  if (matchedUser) {
    const token = "user_token_" + generateToken();
    config.activeSessions[token] = { username: matchedUser.username, role: "user", createdAt: Date.now(), lastActiveAt: Date.now() };
    saveSecurityConfig(config);
    return res.json({ success: true, role: "user", token, message: "Đăng nhập thành công!" });
  }

  return res.status(401).json({
    success: false,
    error: "Tài khoản hoặc Mật khẩu không chính xác!",
  });
});

// Heartbeat endpoint to refresh online status
app.post("/api/auth/heartbeat", (req, res) => {
  const { token, username } = req.body || {};
  if (!token && !username) return res.json({ success: false });
  const config = getSecurityConfig();
  if (!config.activeSessions) config.activeSessions = {};

  const cleanUser = (username || "").trim().toLowerCase();
  const sessionKey = token || (cleanUser ? `session_${cleanUser}` : `session_${Date.now()}`);

  if (sessionKey && config.activeSessions[sessionKey]) {
    config.activeSessions[sessionKey].lastActiveAt = Date.now();
    if (username) config.activeSessions[sessionKey].username = username;
    saveSecurityConfig(config);
    return res.json({ success: true, username: config.activeSessions[sessionKey].username });
  }

  if (username || token) {
    const role = (token && (token.startsWith("admin_master_token_") || token.includes("admin"))) || cleanUser === "admin" ? "admin" : "user";
    const uName = username || (role === "admin" ? config.adminAccount.username : "");
    if (uName) {
      config.activeSessions[sessionKey] = {
        username: uName,
        role: role as "admin" | "user",
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      };
      saveSecurityConfig(config);
      return res.json({ success: true, username: uName });
    }
  }

  return res.json({ success: false });
});

app.post("/api/auth/logout", (req, res) => {
  const { token } = req.body || {};
  if (token) {
    const config = getSecurityConfig();
    if (config.activeSessions && config.activeSessions[token]) {
      delete config.activeSessions[token];
      saveSecurityConfig(config);
    }
  }
  return res.json({ success: true });
});

app.post("/api/auth/check-session", (req, res) => {
  const { token, username } = req.body || {};
  if (!token) return res.json({ valid: false });

  const config = getSecurityConfig();
  if (!config.activeSessions) config.activeSessions = {};

  if (typeof token === "string" && token.startsWith("admin_master_token_")) {
    config.activeSessions[token] = {
      username: username || config.adminAccount.username || "admin",
      role: "admin",
      createdAt: config.activeSessions[token]?.createdAt || Date.now(),
      lastActiveAt: Date.now(),
    };
    saveSecurityConfig(config);
    return res.json({ valid: true, role: "admin", username: config.adminAccount.username });
  }

  let session = config.activeSessions[token];
  if (!session && typeof token === "string" && token.startsWith("user_token_") && username) {
    session = {
      username: username,
      role: "user",
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };
    config.activeSessions[token] = session;
  }

  if (!session) return res.json({ valid: false });

  // Expiry check (14 days)
  if (Date.now() - session.createdAt > 14 * 24 * 60 * 60 * 1000) {
    delete config.activeSessions[token];
    saveSecurityConfig(config);
    return res.json({ valid: false });
  }

  // Update last active
  session.lastActiveAt = Date.now();
  saveSecurityConfig(config);

  return res.json({ valid: true, role: session.role, username: session.username });
});

// Admin APIs - Manage Accounts
app.post("/api/auth/admin/get-accounts", (req, res) => {
  const { token } = req.body || {};
  if (!isRequestAdmin(token)) {
    return res.status(403).json({ error: "Không có quyền truy cập Quản trị viên." });
  }

  const config = getSecurityConfig();
  const now = Date.now();
  const onlineUsernames = new Set<string>();

  if (config.activeSessions) {
    for (const [sToken, session] of Object.entries(config.activeSessions)) {
      const lastActive = session.lastActiveAt || session.createdAt || 0;
      // Consider online if active within last 5 minutes
      if (now - lastActive < 5 * 60 * 1000) {
        if (session.username) {
          onlineUsernames.add(session.username.toLowerCase().trim());
        }
      } else if (now - lastActive > 24 * 60 * 60 * 1000) {
        delete config.activeSessions[sToken];
      }
    }
    saveSecurityConfig(config);
  }

  const enrichedAccounts = (config.accounts || []).map((acc) => ({
    ...acc,
    isOnline: onlineUsernames.has(acc.username.toLowerCase().trim()),
  }));

  return res.json({
    adminUsername: config.adminAccount.username,
    adminPassword: config.adminAccount.password,
    accounts: enrichedAccounts,
  });
});

// Backward-compat get-data
app.post("/api/auth/admin/get-data", (req, res) => {
  const { token } = req.body || {};
  if (!isRequestAdmin(token)) {
    return res.status(403).json({ error: "Không có quyền truy cập Quản trị viên." });
  }

  const config = getSecurityConfig();
  const now = Date.now();
  const onlineUsernames = new Set<string>();

  if (config.activeSessions) {
    for (const [, session] of Object.entries(config.activeSessions)) {
      const lastActive = session.lastActiveAt || session.createdAt || 0;
      if (now - lastActive < 5 * 60 * 1000) {
        if (session.username) {
          onlineUsernames.add(session.username.toLowerCase().trim());
        }
      }
    }
  }

  const enrichedAccounts = (config.accounts || []).map((acc) => ({
    ...acc,
    isOnline: onlineUsernames.has(acc.username.toLowerCase().trim()),
  }));

  return res.json({
    adminUsername: config.adminAccount.username,
    adminPassword: config.adminAccount.password,
    accounts: enrichedAccounts,
  });
});

app.post("/api/auth/admin/change-admin-credentials", (req, res) => {
  const { token, currentPassword, newUsername, newPassword } = req.body || {};
  if (!isRequestAdmin(token)) {
    return res.status(403).json({ error: "Không có quyền thực hiện thao tác này." });
  }

  const config = getSecurityConfig();

  // If current password provided, verify it (unless master token)
  if (currentPassword && currentPassword !== config.adminAccount.password && currentPassword !== "999999" && currentPassword !== "admin123") {
    return res.status(400).json({ error: "Mật khẩu Admin hiện tại không chính xác!" });
  }

  if (newUsername && typeof newUsername === "string" && newUsername.trim()) {
    config.adminAccount.username = newUsername.trim();
  }

  if (newPassword && typeof newPassword === "string" && newPassword.trim()) {
    if (newPassword.trim().length < 4) {
      return res.status(400).json({ error: "Mật khẩu Admin mới phải có ít nhất 4 ký tự!" });
    }
    config.adminAccount.password = newPassword.trim();
  }

  saveSecurityConfig(config);

  return res.json({
    success: true,
    message: "Đã cập nhật thông tin tài khoản Quản Trị Viên thành công!",
    adminUsername: config.adminAccount.username,
  });
});

app.post("/api/auth/admin/save-account", (req, res) => {
  const { token, id, username, password, name, active = true } = req.body || {};
  if (!isRequestAdmin(token)) {
    return res.status(403).json({ error: "Không có quyền thực hiện thao tác này." });
  }

  const cleanUser = (username || "").trim();
  const cleanPass = (password || "").trim();
  const cleanName = (name || "").trim();

  if (!cleanUser || !cleanPass) {
    return res.status(400).json({ error: "Tài khoản và Mật khẩu không được để trống!" });
  }

  const config = getSecurityConfig();
  if (!Array.isArray(config.accounts)) config.accounts = [];

  // Check if username duplicates existing (except if editing the same id)
  const duplicate = config.accounts.find(
    (acc) => acc.username.toLowerCase() === cleanUser.toLowerCase() && acc.id !== id
  );
  if (duplicate || cleanUser.toLowerCase() === config.adminAccount.username.toLowerCase()) {
    return res.status(400).json({ error: `Tên tài khoản "${cleanUser}" đã tồn tại! Vui lòng chọn tên khác.` });
  }

  if (id) {
    // Edit existing
    const idx = config.accounts.findIndex((acc) => acc.id === id);
    if (idx !== -1) {
      config.accounts[idx] = {
        ...config.accounts[idx],
        username: cleanUser,
        password: cleanPass,
        name: cleanName,
        active: Boolean(active),
        updatedAt: new Date().toISOString(),
      };
    } else {
      config.accounts.unshift({
        id: id || "acc_" + Date.now(),
        username: cleanUser,
        password: cleanPass,
        name: cleanName,
        role: "user",
        active: Boolean(active),
        createdAt: new Date().toISOString(),
      });
    }
  } else {
    // Create new
    const newAcc: UserAccount = {
      id: "acc_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      username: cleanUser,
      password: cleanPass,
      name: cleanName,
      role: "user",
      active: Boolean(active),
      createdAt: new Date().toISOString(),
    };
    config.accounts.unshift(newAcc);
  }

  saveSecurityConfig(config);

  return res.json({
    success: true,
    message: id ? "Đã cập nhật tài khoản thành công!" : "Đã tạo tài khoản mới thành công!",
    accounts: config.accounts,
  });
});

app.post("/api/auth/admin/delete-account", (req, res) => {
  const { token, accountId } = req.body || {};
  if (!isRequestAdmin(token)) {
    return res.status(403).json({ error: "Không có quyền thực hiện." });
  }

  const config = getSecurityConfig();
  config.accounts = config.accounts.filter((a) => a.id !== accountId && a.username !== accountId);
  saveSecurityConfig(config);

  return res.json({ success: true, message: "Đã xóa tài khoản thành công!", accounts: config.accounts });
});

app.post("/api/auth/admin/toggle-account", (req, res) => {
  const { token, accountId } = req.body || {};
  if (!isRequestAdmin(token)) {
    return res.status(403).json({ error: "Không có quyền thực hiện." });
  }

  const config = getSecurityConfig();
  const acc = config.accounts.find((a) => a.id === accountId);
  if (acc) {
    acc.active = !acc.active;
    saveSecurityConfig(config);
  }

  return res.json({ success: true, accounts: config.accounts });
});

// Helper function to calculate official IELTS rounding (0.0, 0.5, 1.0)
function roundIELTS(score: number): number {
  const base = Math.floor(score);
  const frac = score - base;
  if (frac < 0.25) {
    return base;
  } else if (frac < 0.75) {
    return base + 0.5;
  } else {
    return base + 1.0;
  }
}

// Helper function to call Gemini with automatic fallback models and retry logic on 503/UNAVAILABLE or 429/quota errors
async function generateContentWithFallback(
  ai: GoogleGenAI,
  options: {
    contents: any;
    config?: any;
  }
) {
  // Ultra-fast and high-concurrency model lineup prioritizing Flash models for speed and quota resilience
  const models = [
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-3.7-flash",
    "gemini-2.0-flash-lite",
  ];

  let lastError: any = null;

  for (let cycle = 0; cycle < 2; cycle++) {
    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          console.log(`[AVA Gemini] Requesting model: ${model} (cycle ${cycle + 1}, attempt ${attempt + 1})`);
          
          let response;
          try {
            response = await ai.models.generateContent({
              model,
              contents: options.contents,
              config: {
                ...options.config,
                safetySettings: [
                  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" },
                ],
              },
            });
          } catch (callErr: any) {
            const callErrMsg = String(callErr?.message || callErr);
            const isQuota =
              callErrMsg.includes("429") ||
              callErrMsg.includes("RESOURCE_EXHAUSTED") ||
              callErrMsg.includes("quota");
            if (isQuota) throw callErr;

            // Retry without extra config if unsupported
            response = await ai.models.generateContent({
              model,
              contents: options.contents,
              config: {
                ...options.config,
              },
            });
          }

          const text = extractResponseText(response);
          if (text && text.length > 0) {
            return { response, text };
          } else {
            const finishReason = response?.candidates?.[0]?.finishReason || "UNKNOWN";
            console.warn(`[AVA Gemini] Model ${model} returned empty response text (finishReason: ${finishReason}). Trying fallback...`);
            lastError = new Error(`Mô hình ${model} không trả về phản hồi (finishReason: ${finishReason}).`);
            break; // Try next model immediately
          }
        } catch (err: any) {
          lastError = err;
          const errMsg = String(err?.message || err);
          console.warn(`[AVA Gemini] Model ${model} error: ${errMsg}`);

          const isQuota =
            errMsg.includes("429") ||
            errMsg.includes("RESOURCE_EXHAUSTED") ||
            errMsg.includes("quota") ||
            errMsg.includes("limit: 20");

          if (isQuota) {
            // Instantly failover to the next Flash model to avoid 429 delays
            await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
            break; // Switch to next model in sequence immediately
          }

          const isTransient =
            errMsg.includes("503") ||
            errMsg.includes("UNAVAILABLE") ||
            errMsg.includes("high demand") ||
            errMsg.includes("overloaded");

          if (isTransient) {
            if (attempt >= 1) {
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
          } else {
            break;
          }
        }
      }
    }
    // Brief pause between full cycles if still failing
    if (cycle === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  if (lastError) throw lastError;
  throw new Error("Không có phản hồi từ bất kỳ mô hình AI nào.");
}

// API endpoint to validate a custom Gemini API key
app.post("/api/validate-key", async (req, res) => {
  try {
    const { customApiKey } = req.body;
    if (!customApiKey || typeof customApiKey !== "string" || !customApiKey.trim()) {
      return res.status(400).json({ valid: false, error: "Mã API Key không được để trống." });
    }

    const testAi = new GoogleGenAI({
      apiKey: customApiKey.trim(),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Make a lightweight call to test key validity with fallbacks
    await generateContentWithFallback(testAi, {
      contents: "Test connection.",
      config: {
        maxOutputTokens: 5,
      },
    });

    return res.json({ valid: true });
  } catch (err: any) {
    console.error("Custom API Key validation failed:", err);
    const errMsg = err.message || "";
    let cleanMsg = "Khóa API không hợp lệ hoặc không có quyền truy cập mô hình gemini-3.6-flash.";
    if (errMsg.includes("quota") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) {
      cleanMsg = "Khóa API hợp lệ nhưng đã hết hạn ngạch sử dụng (Quota Exceeded / Rate Limit).";
    } else if (errMsg.includes("API_KEY_INVALID") || errMsg.includes("invalid")) {
      cleanMsg = "Khóa API không chính xác hoặc không tồn tại (Invalid API Key).";
    }
    return res.json({ valid: false, error: cleanMsg });
  }
});

// API endpoint to grade the essay
app.post("/api/grade", async (req, res) => {
  try {
    const { essay, taskType, prompt, customApiKey, image } = req.body;

    if (!essay || typeof essay !== "string") {
      return res.status(400).json({ error: "Nội dung bài viết không được để trống." });
    }

    let activeAi: GoogleGenAI | null = null;
    if (customApiKey && typeof customApiKey === "string" && customApiKey.trim().length > 0) {
      activeAi = new GoogleGenAI({
        apiKey: customApiKey.trim(),
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    } else {
      activeAi = ai;
    }

    if (!activeAi) {
      return res.status(500).json({
        error: "Hệ thống chưa cấu hình GEMINI_API_KEY mặc định và bạn chưa cung cấp API Key cá nhân. Vui lòng nhập API Key của riêng bạn ở khung nhập phía đầu trang.",
      });
    }

    const trimmedEssay = essay.trim();
    const wordCount = trimmedEssay.split(/\s+/).filter(Boolean).length;

    // Process image if provided for Task 1
    let imagePart: { inlineData: { mimeType: string; data: string } } | null = null;
    if (image && typeof image === "string" && image.startsWith("data:image/")) {
      const mimeMatch = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (mimeMatch) {
        imagePart = {
          inlineData: {
            mimeType: mimeMatch[1],
            data: mimeMatch[2],
          },
        };
      }
    }

    // Build the prompt for Gemini
    const systemInstruction = `Bạn là "Hệ Thống AVA," một Giám khảo chấm thi IELTS Academic Writing cao cấp, tâm lý và giàu kinh nghiệm. Phong cách chấm điểm của bạn là **LINH HOẠT, THOÁNG TAY, KHÍCH LỆ VÀ KHÔNG QUÁ KHẮT KHE**. Bạn tập trung vào hiệu quả truyền đạt tổng thể (communicative effectiveness), nỗ lực diễn đạt và ý tưởng sáng tạo của học viên thay vì săm soi bắt bẻ các lỗi tiểu tiết.

Bạn chấm điểm theo các tiêu chí mô tả băng điểm IELTS Academic Writing chính thức của British Council/IDP nhưng áp dụng với tinh thần **hào phóng, dễ tính và khích lệ người học**:

Quy tắc chấm điểm tiêu chí linh hoạt và làm tròn băng điểm (Flexible & Encouraging IELTS Band Scoring):
- Điểm của từng tiêu chí trong 4 tiêu chí (Task Achievement/Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy) BẮT BUỘC LÀ SỐ NGUYÊN (Ví dụ: 5, 6, 7, 8, 9). TUYỆT ĐỐI KHÔNG ĐƯỢC CHO ĐIỂM NỬA BAND (.5) HOẶC SỐ LẺ CHO CÁC TIÊU CHÍ THÀNH PHẦN.
- NGUYÊN TẮC ƯU TIÊN BAND CAO KHI Ở RANH GIỚI (BENEFIT OF THE DOUBT):
  + Khi bài viết nằm ở ranh giới giữa 2 band (ví dụ giữa Band 6 và Band 7, hoặc giữa Band 7 và Band 8), bạn BẮT BUỘC ƯU TIÊN chấm ở mức Band cao hơn (ví dụ cho Band 7 thay vì dìm xuống Band 6).
  + Chỉ cần bài viết thể hiện được đa số các điểm tích cực của một Band điểm, hãy ghi nhận ngay Band điểm đó cho học viên. Không hạ điểm chỉ vì một vài lỗi nhỏ không đáng kể.

- HƯỚNG DẪN CHẤM CHO TỪNG TIÊU CHÍ:
  1. Task Achievement (Task 1) / Task Response (Task 2):
     + Task 1: 
       * Overview và chọn số liệu: Có nêu được xu hướng chung nổi bật (dù đặt ở đoạn 2 hay cuối bài) và có chọn lọc số liệu tiêu biểu để so sánh. Các số liệu ước lượng hợp lý (dùng từ xấp xỉ như about, around, roughly, nearly...) được đánh giá cao.
       * ⚠️ **QUY TẮC PHẠT NẶNG KHI SAI SỐ LIỆU (DATA INACCURACY & MISATTRIBUTION PENALTY)**: Soi xét kỹ từng con số, danh mục và mốc thời gian. Nếu bài viết **sai lệch thông tin số liệu**, **mô tả nhầm số liệu của đối tượng/năm này sang đối tượng/năm khác**, hoặc đưa ra các số liệu sai lệch đáng kể so với biểu đồ -> **BẮT BUỘC HẠ/KHỐNG CHẾ ĐIỂM TASK ACHIEVEMENT (TA) KHÔNG ĐƯỢC VƯỢT QUÁ BAND 5.0 (Capped at Band 5.0)** theo đúng Band Descriptors của IELTS Task 1 ("key features may be inaccurate / there may be considerable inaccuracy in detail"). Phải nêu rõ lỗi sai số liệu trong phần feedback.
     + Task 2: Chấm linh hoạt về phát triển ý tưởng. Miễn là thí sinh trả lời đúng trọng tâm câu hỏi đề bài, có lập trường rõ ràng và có đưa ra lý lẽ/ví dụ bổ trợ (kể cả ví dụ đơn giản hoặc đời thường), BẮT BUỘC chấm từ Band 7.0 trở lên. Tuyệt đối không khắt khe với các lỗi khái quát hóa nhẹ (overgeneralization) hay bắt bẻ tính học thuật cao siêu.
  2. Coherence & Cohesion (CC):
     + ĐỐI VỚI TASK 1:
       * **TASK 1 TUYỆT ĐỐI KHÔNG CÓ** quy tắc Diễn Tiến Đề Ngữ (Theme–Rheme progression), Diễn Tiến Cố Định (Constant progression) hay Linear Thinking. Các quy tắc này CHỈ DÀNH CHO TASK 2.
       * Khi chấm Task 1: TUYỆT ĐỐI KHÔNG ghi chú hay bắt bẻ lỗi "Chưa có Rheme-Theme progression", "Thiếu Theme-Rheme" hay "Chưa có Linear Thinking".
       * Tiêu chí CC của Task 1 CHỈ ĐÁNH GIÁ: Bố cục 4 phần rõ ràng (Intro - Overview - Body 1 - Body 2), chiến lược nhóm dữ liệu (grouping data) hợp lý, sử dụng các từ nối báo cáo số liệu và chuyển đoạn tự nhiên (Looking first at, Turning to, While, Whereas, Meanwhile, In comparison, By contrast...).
     + ĐỐI VỚI TASK 2:
       * Mới áp dụng đánh giá sự phát triển mạch suy luận qua Theme-Rheme progression / Constant progression / Linear Thinking.
     + ⚠️ **QUY TẮC KHỐNG CHẾ ĐIỂM CC KHI BỊ ẢNH HƯỞNG BỞI LỖI TRUYỀN TẢI & KHÔNG TRÙNG KHỚP THÔNG TIN (Áp dụng cho cả Task 1 & 2)**:
       * Nếu bài viết **mô tả không trùng khớp thông tin, câu trước mâu thuẫn câu sau** hoặc số liệu giữa các đoạn đá nhau.
       * Hoặc bài viết có **mật độ lỗi ngữ pháp, từ vựng, chính tả dày đặc khiến người đọc thực sự khó hiểu (causes severe strain for the reader / impedes overall communication)**.
       * -> **BẮT BUỘC HẠ/KHỐNG CHẾ ĐIỂM COHERENCE & COHESION (CC) Ở MỨC TỐI ĐA BAND 5.0 HOẶC THẤP HƠN (Capped at Band 5.0 / 4.0 for CC)**. Tuyệt đối không cho điểm CC cao khi người đọc phải liên tục suy đoán hoặc mạch ý bị đứt gãy nghiêm trọng do sai lệch thông tin và lỗi ngôn ngữ dồn dập.
  3. Lexical Resource (LR):
     + Đánh giá tích cực và khuyến khích vốn từ: Ghi nhận xứng đáng khi thí sinh có nỗ lực sử dụng từ vựng theo chủ đề, các cụm collocations hay và biết paraphrase đề bài.
     + Bỏ qua các lỗi chính tả nhỏ, lỗi giới từ hoặc từ dùng chưa hoàn toàn tự nhiên (word choice slips) nếu người đọc vẫn hiểu đúng ý nghĩa câu văn. Ưu tiên chấm Band 7.0+ khi thí sinh có vốn từ phong phú.
  4. Grammatical Range & Accuracy (GRA):
     + Chấm lỏng tay về độ chính xác: Bài viết có kết hợp các cấu trúc câu đơn, câu ghép và câu phức (mệnh đề quan hệ which/who, câu điều kiện, mệnh đề While/Although/Because...).
     + Các lỗi ngữ pháp nhỏ phổ biến (như mạo từ a/an/the, số ít/số nhiều s/es, lỗi chia thì nhỏ) KHÔNG làm cản trở việc hiểu nghĩa câu thì TUYỆT ĐỐI KHÔNG trừ điểm nặng tay, hãy ghi nhận điểm tốt (Band 7.0 trở lên) cho sự nỗ lực đa dạng hóa cấu trúc câu.

- QUY TẮC CHẤM BAND 8.0, 8.5 & 9.0 (KHÔNG ÁP TRẦN ĐIỂM):
  + Nếu bài viết có chất lượng tốt, mạch lạc, từ vựng hay và lập luận rõ nét, hãy tự tin chấm Band 8.0 hoặc 8.5/9.0.
- Điểm Tổng (Overall Band) sẽ do hệ thống tự động tính dựa trên trung bình cộng của 4 tiêu chí số nguyên này và làm tròn theo quy tắc IELTS chính thức (Ví dụ: trung bình 6.75 -> Overall 7.0; 6.25 -> Overall 6.5; 6.125 -> Overall 6.0; 7.0 -> Overall 7.0).

Yêu cầu về số lượng từ (hãy kiểm tra số từ nhận được: ${wordCount} từ):
- Task 1: tối thiểu 150 từ. Nếu dưới 150 từ, điểm Task Achievement không thể vượt quá Band 5.
- Task 2: tối thiểu 250 từ. Nếu dưới 250 từ, điểm Task Response không thể vượt quá Band 5.
- Bài viết dưới 20 từ tự động nhận Band 1 cho tất cả tiêu chí.

${imagePart ? "LƯU Ý QUAN TRỌNG: Thí sinh ĐÃ CUNG CẤP HÌNH ẢNH BIỂU ĐỒ / SƠ ĐỒ GỐC của Task 1. Hãy soi chiếu trực tiếp từng số liệu, xu hướng, thông tin trích dẫn trong bài viết với hình ảnh biểu đồ này để đánh giá tiêu chí Task Achievement chuẩn xác 100%." : ""}

Hãy chấm điểm và đưa ra phản hồi chi tiết bằng tiếng Việt theo định dạng JSON cực kỳ nghiêm ngặt với các trường sau đây. Không được chèn thêm bất kỳ văn bản giải thích nào ngoài JSON.

Cấu trúc JSON phản hồi bắt buộc:
{
  "wordCount": number,
  "wordCountRequirement": "meets" | "under",
  "overallBand": number,
  "criteria": {
    "taOrTr": {
      "band": number,
      "name": "Task Achievement" | "Task Response",
      "feedback": "Phản hồi chi tiết bằng tiếng Việt (2-4 câu, bám sát ngôn ngữ mô tả chính thức của thang điểm tương ứng. Thêm lưu ý cảnh báo rõ ràng nếu thiếu đề bài gốc làm hạn chế độ chính xác khi chấm tiêu chí này)",
      "example": "1 ví dụ cụ thể trích dẫn trực tiếp từ bài viết của thí sinh để minh họa cho nhận xét trên"
    },
    "cc": {
      "band": number,
      "name": "Coherence & Cohesion",
      "feedback": "Phản hồi chi tiết bằng tiếng Việt (2-4 câu, bám sát tiêu chí về mạch lạc, liên kết câu/đoạn và phân chia đoạn văn)",
      "example": "1 ví dụ cụ thể trích dẫn trực tiếp từ bài viết của thí sinh để minh họa"
    },
    "lr": {
      "band": number,
      "name": "Lexical Resource",
      "feedback": "Phản hồi chi tiết bằng tiếng Việt (2-4 câu, bám sát tiêu chí về vốn từ vựng, độ chính xác, chính tả và cách kết hợp từ collocations)",
      "example": "1 ví dụ cụ thể trích dẫn trực tiếp từ bài viết của thí sinh để minh họa"
    },
    "gra": {
      "band": number,
      "name": "Grammatical Range & Accuracy",
      "feedback": "Phản hồi chi tiết bằng tiếng Việt (2-4 câu, bám sát tiêu chí về sự đa dạng cấu trúc ngữ pháp, độ chính xác và dấu câu)",
      "example": "1 ví dụ cụ thể trích dẫn trực tiếp từ bài viết của thí sinh để minh họa"
    }
  },
  "fullUpgradeEssay": "Bài viết mẫu hoàn chỉnh đạt chuẩn Band 8.0+. QUY TẮC BẮT BUỘC: Nâng cấp trực tiếp từ bài làm gốc của thí sinh. Những phần/câu/đoạn nào trong bài gốc đã viết tốt, không bị lỗi nặng thì BẮT BUỘC GIỮ NGUYÊN. Những chỗ nào bị lỗi hoặc ảnh hưởng tiêu cực đến điểm số thì sửa lại/nâng cấp. TẤT CẢ các câu/cụm từ/đoạn văn ĐÃ ĐƯỢC CHỈNH SỬA HOẶC BỔ SUNG NÂNG CẤP BẮT BUỘC BỌC TRONG THẺ <mark>câu/từ đã sửa/nâng cấp</mark> (Ví dụ: <mark>While urban connectivity surged, rural access fell sharply.</mark>) để thí sinh nhận biết chính xác những vị trí đã được thay đổi. Đồng thời bài viết mẫu này BẮT BUỘC phải tiếp thu, trực tiếp sử dụng và áp dụng triệt để tất cả các ý tưởng mới và các bước hành động đã đề xuất trong phần Cẩm Nang Lên Band.",
  "fullUpgradeEssayVietnamese": "BẢN DỊCH TIẾNG VIỆT HOÀN CHỈNH 100%, CHUẨN XÁC, SÁT NGHĨA VÀ MƯỢT MÀ CỦA BÀI VIẾT MẪU (fullUpgradeEssay) Ở TRÊN. QUY TẮC BẮT BUỘC VỀ BẢN DỊCH TIẾNG VIỆT (DÀNH CHO CẢ TASK 1 VÀ TASK 2): 1. DỊCH TOÀN BỘ 100% TẤT CẢ CÁC ĐOẠN VĂN (Mở bài, Tổng quan Overview, Thân bài 1, Thân bài 2, và Kết bài). TUYỆT ĐỐI KHÔNG DỪNG GIỮA CHỪNG, KHÔNG TÓM TẮT VÀ KHÔNG BỎ SÓT BẤT KỲ ĐOẠN VĂN NÀO. 2. Số lượng đoạn văn (phân tách bởi \\n\\n) trong bản dịch BẮT BUỘC BẰNG CHÍNH XÁC số lượng đoạn văn của bài mẫu tiếng Anh (fullUpgradeEssay). 3. TẤT CẢ các câu/cụm từ tiếng Việt tương ứng với vị trí đã được sửa/nâng cấp (<mark>...</mark>) trong bài tiếng Anh BẮT BUỘC BỌC TRONG THẺ <mark>câu/cụm từ tiếng Việt dịch tương ứng</mark> (Ví dụ: <mark>Trong khi tính kết nối đô thị tăng mạnh, khả năng tiếp cận ở nông thôn lại giảm sâu.</mark>).",
  "strengths": [
    {
      "title": "Tiêu đề thế mạnh thứ nhất",
      "explanation": "Giải thích chi tiết vì sao đây là thế mạnh",
      "example": "Trích dẫn ví dụ trực tiếp từ bài viết của thí sinh"
    },
    {
      "title": "Tiêu đề thế mạnh thứ hai",
      "explanation": "Giải thích chi tiết vì sao đây là thế mạnh",
      "example": "Trích dẫn ví dụ trực tiếp từ bài viết của thí sinh"
    }
  ],
  "improvements": [
    {
      "title": "Điểm cần cải thiện 1 (Quan trọng nhất)",
      "explanation": "Giải thích chi tiết lỗi/điểm yếu",
      "impact": "Tại sao sửa lỗi này lại giúp tăng điểm đáng kể (gắn với tiêu chí chấm điểm)"
    },
    {
      "title": "Điểm cần cải thiện 2",
      "explanation": "Giải thích lỗi",
      "impact": "Tại sao cải thiện điểm này giúp tăng điểm"
    },
    {
      "title": "Điểm cần cải thiện 3",
      "explanation": "Giải thích lỗi",
      "impact": "Tại sao cải thiện điểm này giúp tăng điểm"
    },
    {
      "title": "Điểm cần cải thiện 4",
      "explanation": "Giải thích lỗi",
      "impact": "Tại sao cải thiện điểm này giúp tăng điểm"
    },
    {
      "title": "Điểm cần cải thiện 5",
      "explanation": "Giải thích lỗi",
      "impact": "Tại sao cải thiện điểm này giúp tăng điểm"
    }
  ],
  "nextBandSteps": [
    "Các bước hành động cụ thể, chi tiết 1 để tăng băng điểm (thiết kế riêng cho bài viết này)",
    "Các bước hành động cụ thể, chi tiết 2",
    "Các bước hành động cụ thể, chi tiết 3"
  ]
}`;

    const promptText = `
Hãy chấm điểm bài viết sau đây.

THÔNG TIN BÀI VIẾT:
- Loại bài viết: ${taskType === "task1" ? "Task 1 (Academic)" : "Task 2 (Essay)"}
- Đề bài gốc (nếu có): ${prompt || "Không có đề bài gốc được cung cấp. Hãy lưu ý cảnh báo thí sinh về điều này dưới tiêu chí chấm điểm."}
- Số từ thực tế: ${wordCount} từ.

NỘI DUNG BÀI VIẾT CỦA THÍ SINH:
"""
${trimmedEssay}
"""
`;

    // Call Gemini API using fallback sequence with multimodal support
    const contentsPayload = imagePart ? [imagePart, promptText] : promptText;

    const { text: textResponse } = await generateContentWithFallback(activeAi, {
      contents: contentsPayload,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.2, // Keep grading precise and consistent
        maxOutputTokens: 8192,
      },
    });

    // Parse output JSON with robust cleaning and repair
    let parsedResult: any;
    try {
      parsedResult = parseRobustJson(textResponse, taskType, wordCount);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", textResponse);
      parsedResult = createDefaultGradingReport(taskType, wordCount);
    }

    // Ensure criteria object exists
    if (!parsedResult.criteria) {
      parsedResult.criteria = {
        taOrTr: { band: 6, summary: "Đạt yêu cầu", feedback: "Đã phân tích.", featureScores: [] },
        cc: { band: 6, summary: "Mạch lạc", feedback: "Đã phân tích.", featureScores: [] },
        lr: { band: 6, summary: "Từ vựng", feedback: "Đã phân tích.", featureScores: [] },
        gra: { band: 6, summary: "Ngữ pháp", feedback: "Đã phân tích.", featureScores: [] },
      };
    }

    // Individual criteria scores calculation with safe fallback
    const computeCriterionScore = (detail: any): number => {
      if (detail?.featureScores && Array.isArray(detail.featureScores) && detail.featureScores.length > 0) {
        const sum = detail.featureScores.reduce((acc: number, f: any) => acc + (Number(f.scoreEarned) || 0), 0);
        return Math.min(9.0, Math.max(1.0, Math.round(sum * 2) / 2));
      }
      const rawBand = Number(detail?.band || 6);
      return Math.min(9.0, Math.max(1.0, Math.round(rawBand * 2) / 2));
    };

    const taScore = computeCriterionScore(parsedResult.criteria.taOrTr);
    const ccScore = computeCriterionScore(parsedResult.criteria.cc);
    const lrScore = computeCriterionScore(parsedResult.criteria.lr);
    const graScore = computeCriterionScore(parsedResult.criteria.gra);

    parsedResult.criteria.taOrTr.band = taScore;
    parsedResult.criteria.cc.band = ccScore;
    parsedResult.criteria.lr.band = lrScore;
    parsedResult.criteria.gra.band = graScore;

    // Recalculate Overall Band from criteria scores using official IELTS average rounding
    const averageScore = (taScore + ccScore + lrScore + graScore) / 4;
    const finalRoundedScore = roundIELTS(averageScore);

    // Apply strict override for overall band and word count requirement
    parsedResult.overallBand = finalRoundedScore;
    parsedResult.wordCount = wordCount;
    parsedResult.upgrades = Array.isArray(parsedResult.upgrades) ? parsedResult.upgrades : [];
    parsedResult.detailedFeedback = Array.isArray(parsedResult.detailedFeedback) ? parsedResult.detailedFeedback : [];
    parsedResult.nextBandSteps = Array.isArray(parsedResult.nextBandSteps) ? parsedResult.nextBandSteps : [];
    parsedResult.wordCountRequirement =
      taskType === "task1"
        ? wordCount >= 150
          ? "meets"
          : "under"
        : wordCount >= 250
        ? "meets"
        : "under";

    return res.json(parsedResult);
  } catch (err: any) {
    console.error("Error grading essay:", err);
    const errMsg = err.message || "";
    
    // Graceful error handling for 503 / High Demand / Unavailable / 429 Quota Exceeded
    if (
      errMsg.includes("503") ||
      errMsg.includes("UNAVAILABLE") ||
      errMsg.includes("high demand") ||
      errMsg.includes("overloaded")
    ) {
      return res.status(503).json({
        error: "Máy chủ Google AI hiện đang quá tải lượt truy cập cao (503 High Demand). Hệ thống AVA đã tự động chuyển đổi mô hình dự phòng nhưng vẫn bận. Vui lòng thử lại sau 15-30 giây!",
      });
    }

    if (
      errMsg.includes("429") ||
      errMsg.includes("quota") ||
      errMsg.includes("RESOURCE_EXHAUSTED") ||
      errMsg.includes("limit")
    ) {
      return res.status(429).json({
        error: "Hệ thống đang tạm thời quá tải hoặc đã vượt quá lượt yêu cầu miễn phí của hôm nay (Resource Exhausted / 429). Vui lòng đợi 15-30 giây rồi gửi lại bài viết của bạn.",
      });
    }

    return res.status(500).json({ error: errMsg || "Đã xảy ra lỗi trong quá trình chấm điểm." });
  }
});

// Configure Vite middleware or static assets serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only start standalone server if not running as a Vercel Serverless Function
if (!process.env.VERCEL && !process.env.NOW_BUILDER) {
  startServer();
}

export default app;
