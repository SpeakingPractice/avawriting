import React, { useState } from "react";
import { ShieldCheck, Lock, KeyRound, ArrowRight, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";

interface LockScreenProps {
  onUnlockSuccess: (role: "admin" | "user", token: string) => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlockSuccess }) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) {
      setError("Vui lòng nhập Mã truy cập!");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Mã truy cập không đúng hoặc đã được sử dụng trước đó!");
        setLoading(false);
        return;
      }

      setSuccessMsg(data.message || "Xác thực thành công!");
      sessionStorage.setItem("ava_session_token", data.token);
      sessionStorage.setItem("ava_session_role", data.role);

      setTimeout(() => {
        onUnlockSuccess(data.role, data.token);
      }, 600);
    } catch (err: any) {
      console.error("Auth verify error:", err);
      setError("Không thể kết nối đến máy chủ xác thực. Vui lòng thử lại!");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Background Glow Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-950/40 via-slate-950 to-amber-950/20 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl p-6 sm:p-8 text-slate-100">
        {/* Header Icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-lg shadow-blue-500/20 mb-4 flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            HỆ THỐNG BẢO MẬT AVA
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Trường Anh Ngữ Mỹ Du - Khóa Bảo Vệ 2 Lớp & Mã Truy Cập 1 Lần (OTP)
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Nhập Mã Truy Cập (Access Passcode)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Nhập mã 6 chữ số..."
                maxLength={20}
                autoFocus
                className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-700 rounded-xl text-white font-mono text-lg font-bold placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all tracking-wider text-center"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl flex items-start gap-2.5 text-xs text-red-200 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-center gap-2.5 text-xs text-emerald-200 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang kiểm tra mã...</span>
              </>
            ) : (
              <>
                <span>Xác Nhận Đăng Nhập</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Feature Highlights Footnote */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-2 text-[11px] text-slate-400 leading-relaxed">
          <div className="flex items-center gap-1.5 text-amber-400/90 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cơ chế bảo mật Mã 1 lần (One-Time Passcode):</span>
          </div>
          <p>
            • Mỗi mã sử dụng 1 lần sẽ tự động bị <strong>vô hiệu hóa hoàn toàn</strong> ngay sau khi kích hoạt.
          </p>
          <p>
            • Người khác không thể dùng lại mã cũ. Hãy xin Mã mới từ Quản trị viên khi mở lại ứng dụng.
          </p>
        </div>
      </div>
    </div>
  );
};
