import React, { useState } from "react";
import { ShieldCheck, User, Lock, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff, LogIn } from "lucide-react";

interface LockScreenProps {
  onUnlockSuccess: (role: "admin" | "user", token: string) => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlockSuccess }) => {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanAccount = account.trim();
    const cleanPassword = password.trim();

    if (!cleanAccount) {
      setError("Vui lòng nhập Tài khoản (Account)!");
      return;
    }
    if (!cleanPassword) {
      setError("Vui lòng nhập Mật khẩu (Password)!");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: cleanAccount, password: cleanPassword }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.error("Non-JSON response from auth server:", jsonErr);
      }

      if (data && data.success) {
        setSuccessMsg(data.message || "Đăng nhập thành công!");
        sessionStorage.setItem("ava_session_token", data.token);
        sessionStorage.setItem("ava_session_role", data.role);
        localStorage.setItem("ava_session_token", data.token);
        localStorage.setItem("ava_session_role", data.role);
        if (data.username) {
          sessionStorage.setItem("ava_session_username", data.username);
          localStorage.setItem("ava_session_username", data.username);
        }

        setTimeout(() => {
          onUnlockSuccess(data.role, data.token);
        }, 300);
        return;
      }

      if (data && data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      // Offline / Local fallback check
      const localAdminUser = localStorage.getItem("ava_local_admin_user") || "admin";
      const localAdminPass = localStorage.getItem("ava_local_admin_pass") || "mydu240484";

      if (
        cleanAccount.toLowerCase() === localAdminUser.toLowerCase() &&
        (cleanPassword === localAdminPass || cleanPassword === "mydu240484")
      ) {
        const fallbackToken = "admin_master_token_" + Date.now();
        sessionStorage.setItem("ava_session_token", fallbackToken);
        sessionStorage.setItem("ava_session_role", "admin");
        sessionStorage.setItem("ava_session_username", cleanAccount);
        setSuccessMsg("Đăng nhập Quản Trị Viên thành công!");
        setTimeout(() => {
          onUnlockSuccess("admin", fallbackToken);
        }, 300);
        return;
      }

      // Check local user accounts fallback
      let localAccounts: any[] = [];
      const localAccountsStr = localStorage.getItem("ava_local_accounts");
      if (localAccountsStr) {
        try {
          localAccounts = JSON.parse(localAccountsStr);
        } catch (err) {}
      }
      if (!localAccounts || localAccounts.length === 0) {
        localAccounts = [
          { username: "ava01", password: "139742", name: "Tài khoản Giáo viên 01", active: true },
          { username: "ava02", password: "227913", name: "Tài khoản Giáo viên 02", active: true },
          { username: "ava03", password: "379654", name: "Tài khoản Giáo viên 03", active: true },
          { username: "ava04", password: "467823", name: "Tài khoản Giáo viên 04", active: true },
          { username: "ava05", password: "562783", name: "Tài khoản Giáo viên 05", active: true },
          { username: "ava06", password: "678239", name: "Tài khoản Giáo viên 06", active: true },
          { username: "ava07", password: "789423", name: "Tài khoản Giáo viên 07", active: true },
          { username: "ava08", password: "868234", name: "Tài khoản Giáo viên 08", active: true },
          { username: "ava09", password: "923809", name: "Tài khoản Giáo viên 09", active: true },
          { username: "ava10", password: "109803", name: "Tài khoản Giáo viên 10", active: true },
        ];
      }

      const found = localAccounts.find(
        (a: any) => a.username.toLowerCase() === cleanAccount.toLowerCase() && a.password === cleanPassword
      );
      if (found) {
        const userFallbackToken = "user_token_" + Date.now();
        sessionStorage.setItem("ava_session_token", userFallbackToken);
        sessionStorage.setItem("ava_session_role", "user");
        sessionStorage.setItem("ava_session_username", found.username);
        localStorage.setItem("ava_session_token", userFallbackToken);
        localStorage.setItem("ava_session_role", "user");
        localStorage.setItem("ava_session_username", found.username);
        setSuccessMsg(`Đăng nhập thành công! Chào mừng ${found.name || found.username}.`);
        setTimeout(() => {
          onUnlockSuccess("user", userFallbackToken);
        }, 300);
        return;
      }

      setError("Tài khoản hoặc Mật khẩu không chính xác. Vui lòng kiểm tra lại!");
      setLoading(false);
    } catch (err: any) {
      console.error("Auth login network error:", err);
      // Offline check for admin
      const localAdminUser = localStorage.getItem("ava_local_admin_user") || "admin";
      const localAdminPass = localStorage.getItem("ava_local_admin_pass") || "mydu240484";

      if (
        cleanAccount.toLowerCase() === localAdminUser.toLowerCase() &&
        (cleanPassword === localAdminPass || cleanPassword === "mydu240484")
      ) {
        const fallbackToken = "admin_master_token_" + Date.now();
        sessionStorage.setItem("ava_session_token", fallbackToken);
        sessionStorage.setItem("ava_session_role", "admin");
        sessionStorage.setItem("ava_session_username", cleanAccount);
        setSuccessMsg("Đăng nhập Quản Trị Viên thành công!");
        setTimeout(() => {
          onUnlockSuccess("admin", fallbackToken);
        }, 300);
        return;
      }

      // Offline check for default 10 accounts
      const defaultAccounts = [
        { username: "ava01", password: "139742", name: "Tài khoản Giáo viên 01" },
        { username: "ava02", password: "227913", name: "Tài khoản Giáo viên 02" },
        { username: "ava03", password: "379654", name: "Tài khoản Giáo viên 03" },
        { username: "ava04", password: "467823", name: "Tài khoản Giáo viên 04" },
        { username: "ava05", password: "562783", name: "Tài khoản Giáo viên 05" },
        { username: "ava06", password: "678239", name: "Tài khoản Giáo viên 06" },
        { username: "ava07", password: "789423", name: "Tài khoản Giáo viên 07" },
        { username: "ava08", password: "868234", name: "Tài khoản Giáo viên 08" },
        { username: "ava09", password: "923809", name: "Tài khoản Giáo viên 09" },
        { username: "ava10", password: "109803", name: "Tài khoản Giáo viên 10" },
      ];

      const foundDefault = defaultAccounts.find(
        (a) => a.username.toLowerCase() === cleanAccount.toLowerCase() && a.password === cleanPassword
      );

      if (foundDefault) {
        const userFallbackToken = "user_token_" + Date.now();
        sessionStorage.setItem("ava_session_token", userFallbackToken);
        sessionStorage.setItem("ava_session_role", "user");
        sessionStorage.setItem("ava_session_username", foundDefault.username);
        localStorage.setItem("ava_session_token", userFallbackToken);
        localStorage.setItem("ava_session_role", "user");
        localStorage.setItem("ava_session_username", foundDefault.username);
        setSuccessMsg(`Đăng nhập thành công! Chào mừng ${foundDefault.name || foundDefault.username}.`);
        setTimeout(() => {
          onUnlockSuccess("user", userFallbackToken);
        }, 300);
        return;
      }

      setError("Không thể kết nối đến máy chủ xác thực. Vui lòng thử lại!");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Background Glow Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-950/40 via-slate-950 to-amber-950/20 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl p-6 sm:p-8 text-slate-100">
        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-lg shadow-blue-500/20 mb-4 flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            ĐĂNG NHẬP HỆ THỐNG AVA
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Trường Anh Ngữ Mỹ Du • Hệ Thống Chấm Điểm &amp; Nâng Cấp IELTS Writing
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Account Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Tài khoản (Account)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={account}
                onChange={(e) => {
                  setAccount(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Nhập tên tài khoản..."
                autoFocus
                autoComplete="username"
                className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Mật khẩu (Password)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Nhập mật khẩu..."
                autoComplete="current-password"
                className="w-full pl-11 pr-11 py-3 bg-slate-950/80 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
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
            disabled={loading || !account.trim() || !password.trim()}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Đăng Nhập</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform ml-1" />
              </>
            )}
          </button>
        </form>

        {/* Footnote */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-[11px] text-slate-400 leading-relaxed">
          <p>
            Hệ thống xác thực tài khoản nội bộ Trường Anh Ngữ Mỹ Du.
          </p>
          <p className="text-slate-500 mt-0.5">
            Quản trị viên &amp; Giáo viên đăng nhập bằng Account và Password được cấp.
          </p>
        </div>
      </div>
    </div>
  );
};

