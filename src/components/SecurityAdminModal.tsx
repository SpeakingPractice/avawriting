import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  User,
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  X,
  Lock,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
  Sparkles,
  AlertCircle,
  Edit3,
  Users,
  Search,
} from "lucide-react";

export interface UserAccount {
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

interface SecurityAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: "admin" | "user";
  sessionToken: string;
  onLockApp: () => void;
}

export const SecurityAdminModal: React.FC<SecurityAdminModalProps> = ({
  isOpen,
  onClose,
  userRole,
  sessionToken,
  onLockApp,
}) => {
  const [adminUsername, setAdminUsername] = useState<string>("admin");
  const [adminPassword, setAdminPassword] = useState<string>("mydu240484");
  const [showAdminPassword, setShowAdminPassword] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Popup Modal for Creating / Editing Teacher Account
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [formUsername, setFormUsername] = useState<string>("");
  const [formPassword, setFormPassword] = useState<string>("");
  const [formName, setFormName] = useState<string>("");
  const [showFormPassword, setShowFormPassword] = useState<boolean>(false);

  // Copy state & Show password per card state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const loadFromLocalFallback = () => {
    const localAdminUser = localStorage.getItem("ava_local_admin_user") || "admin";
    const localAdminPass = localStorage.getItem("ava_local_admin_pass") || "mydu240484";
    const localAccountsStr = localStorage.getItem("ava_local_accounts");
    let localAccs: UserAccount[] = [];
    if (localAccountsStr) {
      try {
        localAccs = JSON.parse(localAccountsStr);
      } catch (err) {
        console.error("Local accounts parse error:", err);
      }
    }
    if (!localAccs || localAccs.length === 0 || (localAccs.length === 1 && localAccs[0].username === "student")) {
      localAccs = [
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
      localStorage.setItem("ava_local_accounts", JSON.stringify(localAccs));
    }
    const currentUsername = sessionStorage.getItem("ava_session_username") || "";
    const enriched = localAccs.map((a) => ({
      ...a,
      isOnline: a.username.toLowerCase() === currentUsername.toLowerCase(),
    }));
    setAdminUsername(localAdminUser);
    setAdminPassword(localAdminPass);
    setAccounts(enriched);
  };

  const fetchAdminData = async (silent = false) => {
    if (userRole !== "admin") return;
    if (!silent) setLoading(true);
    setError(null);
    const activeToken = sessionToken || sessionStorage.getItem("ava_session_token") || "";
    try {
      const res = await fetch("/api/auth/admin/get-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: activeToken }),
      });
      const data = await res.json();
      if (res.ok && data) {
        const uName = data.adminUsername || "admin";
        const uPass = data.adminPassword || "mydu240484";
        const accs = data.accounts || [];
        setAdminUsername(uName);
        setAdminPassword(uPass);
        setAccounts(accs);
        localStorage.setItem("ava_local_admin_user", uName);
        localStorage.setItem("ava_local_admin_pass", uPass);
        localStorage.setItem("ava_local_accounts", JSON.stringify(accs));
      } else {
        loadFromLocalFallback();
      }
    } catch (e) {
      console.error("fetchAdminData error, using local fallback:", e);
      loadFromLocalFallback();
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userRole === "admin") {
      fetchAdminData(false);
      // Auto-refresh online statuses periodically
      const interval = setInterval(() => {
        fetchAdminData(true);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, userRole]);

  if (!isOpen) return null;

  const handleSaveUserAccount = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUser = formUsername.trim();
    const cleanPass = formPassword.trim();
    const cleanName = formName.trim();

    if (!cleanUser) {
      setError("Vui lòng nhập Tên tài khoản (Account)!");
      return;
    }
    if (!cleanPass) {
      setError("Vui lòng nhập Mật khẩu (Password)!");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/auth/admin/save-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: sessionToken,
          id: editingAccountId || undefined,
          username: cleanUser,
          password: cleanPass,
          name: cleanName,
          active: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAccounts(data.accounts || []);
        localStorage.setItem("ava_local_accounts", JSON.stringify(data.accounts || []));
        setSuccessMsg(data.message || "Lưu tài khoản giáo viên thành công!");
        resetUserForm();
        setIsAccountModalOpen(false);
        setLoading(false);
        return;
      } else {
        setError(data.error || "Không thể lưu tài khoản giáo viên.");
      }
    } catch (e) {
      console.error("Save account error, using local fallback:", e);
    }

    // Local fallback
    let updatedAccs = [...accounts];
    if (editingAccountId) {
      const idx = updatedAccs.findIndex((a) => a.id === editingAccountId);
      if (idx !== -1) {
        updatedAccs[idx] = {
          ...updatedAccs[idx],
          username: cleanUser,
          password: cleanPass,
          name: cleanName,
          updatedAt: new Date().toISOString(),
        };
      }
    } else {
      const newAcc: UserAccount = {
        id: "acc_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        username: cleanUser,
        password: cleanPass,
        name: cleanName,
        role: "user",
        active: true,
        createdAt: new Date().toISOString(),
      };
      updatedAccs.unshift(newAcc);
    }

    setAccounts(updatedAccs);
    localStorage.setItem("ava_local_accounts", JSON.stringify(updatedAccs));
    setSuccessMsg(editingAccountId ? "Đã cập nhật tài khoản giáo viên!" : "Đã tạo tài khoản giáo viên mới!");
    resetUserForm();
    setIsAccountModalOpen(false);
    setLoading(false);
  };

  const resetUserForm = () => {
    setEditingAccountId(null);
    setFormUsername("");
    setFormPassword("");
    setFormName("");
    setShowFormPassword(false);
  };

  const openCreateAccountModal = () => {
    resetUserForm();
    // Generate a default 6-digit random password for convenience
    const randomPass = Math.floor(100000 + Math.random() * 900000).toString();
    setFormPassword(randomPass);
    setIsAccountModalOpen(true);
    setError(null);
  };

  const startEditAccount = (acc: UserAccount) => {
    setEditingAccountId(acc.id);
    setFormUsername(acc.username);
    setFormPassword(acc.password);
    setFormName(acc.name || "");
    setShowFormPassword(false);
    setError(null);
    setSuccessMsg(null);
    setIsAccountModalOpen(true);
  };

  const generateRandomPassword = () => {
    const randomPass = Math.floor(100000 + Math.random() * 900000).toString();
    setFormPassword(randomPass);
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tài khoản này?")) return;
    try {
      await fetch("/api/auth/admin/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: sessionToken, accountId }),
      });
    } catch (e) {
      console.error(e);
    }

    const updated = accounts.filter((a) => a.id !== accountId);
    setAccounts(updated);
    localStorage.setItem("ava_local_accounts", JSON.stringify(updated));
    setSuccessMsg("Đã xóa tài khoản thành công!");
  };

  const copyFormattedCredentials = (acc: UserAccount) => {
    const msg = `🎓 THÔNG TIN ĐĂNG NHẬP AVA IELTS - TRƯỜNG ANH NGỮ MỸ DU\n• Tài khoản: ${acc.username}\n• Mật khẩu: ${acc.password}${
      acc.name ? `\n• Họ tên/Ghi chú: ${acc.name}` : ""
    }\n👉 Đăng nhập và bắt đầu sử dụng hệ thống ngay!`;
    navigator.clipboard.writeText(msg);
    setCopiedId(`msg_${acc.id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredAccounts = accounts.filter((acc) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      acc.username.toLowerCase().includes(q) ||
      (acc.name && acc.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-[9990] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 my-8">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Quản Lý Tài Khoản &amp; Phân Quyền AVA</h2>
              <p className="text-xs text-slate-400">
                {userRole === "admin"
                  ? "Tài khoản Quản Trị Viên (Master Admin) • Toàn quyền quản trị"
                  : "Phiên đăng nhập người dùng"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
              <Sparkles className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {userRole !== "admin" ? (
            /* USER ROLE VIEW */
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <UserCheck className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Tài Khoản Đang Đăng Nhập</h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                Bạn đang sử dụng hệ thống với vai trò <strong>Người dùng</strong>. Mọi bài viết và lịch sử luyện tập của bạn được lưu an toàn trên phiên làm việc này.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={onLockApp}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
                >
                  <Lock className="w-4 h-4" />
                  <span>Đăng Xuất / Khóa Ứng Dụng</span>
                </button>
              </div>
            </div>
          ) : (
            /* ADMIN ROLE VIEW */
            <>
              {/* SECTION 1: ADMIN ACCOUNT INFO */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Key className="w-4 h-4 text-amber-600" />
                  <span>Tài Khoản Quản Trị Viên (Admin Account)</span>
                </div>

                <div className="flex flex-wrap items-center justify-between bg-white border border-slate-200 rounded-lg p-3 gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <span className="font-semibold text-slate-500">Tài khoản:</span>
                    <span className="font-bold font-mono text-sm bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded border border-blue-200">
                      {adminUsername}
                    </span>
                    <span className="text-slate-400 ml-1.5">• Quyền cao nhất (Master Admin)</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
                    <span className="font-semibold text-slate-500">Mật khẩu:</span>
                    <span className="font-mono font-bold text-slate-800 tracking-wider">
                      {showAdminPassword ? adminPassword : "••••••••••••"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded ml-1 cursor-pointer transition-colors"
                      title={showAdminPassword ? "Ẩn mật khẩu Admin" : "Xem mật khẩu Admin"}
                    >
                      {showAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 2: TEACHER ACCOUNTS LIST & ACTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 p-3.5 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm shrink-0 whitespace-nowrap">
                    <Users className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Danh Sách Tài Khoản Giáo Viên ({accounts.length})</span>
                  </div>

                  <div className="flex items-center justify-end gap-2 shrink-0">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm tài khoản, tên..."
                        className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 w-44 sm:w-56"
                      />
                    </div>
                    <button
                      onClick={() => fetchAdminData(false)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer shrink-0"
                      title="Làm mới danh sách"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={openCreateAccountModal}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tạo tài khoản</span>
                    </button>
                  </div>
                </div>

                {filteredAccounts.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <p>{searchTerm ? "Không tìm thấy tài khoản giáo viên phù hợp." : "Chưa có tài khoản giáo viên nào được tạo."}</p>
                    <button
                      onClick={openCreateAccountModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tạo tài khoản giáo viên đầu tiên</span>
                    </button>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {filteredAccounts.map((acc) => {
                      const isPassVisible = !!visiblePasswords[acc.id];
                      return (
                        <div
                          key={acc.id}
                          className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-white hover:bg-slate-50/50 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {acc.username}
                              </span>
                              <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                <span className="text-[11px] text-slate-500">Mật khẩu:</span>
                                <span className="font-mono font-bold text-slate-800">
                                  {isPassVisible ? acc.password : "••••••"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(acc.id)}
                                  className="p-0.5 text-slate-400 hover:text-slate-700 ml-1 cursor-pointer"
                                  title={isPassVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                >
                                  {isPassVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                              </div>
                              {acc.isOnline ? (
                                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-semibold text-[10px] rounded-full flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                  <span>Online</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 font-semibold text-[10px] rounded-full flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  <span>Offline</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2">
                              {acc.name && <span className="font-medium text-slate-800">{acc.name}</span>}
                              <span>• Tạo ngày: {new Date(acc.createdAt).toLocaleDateString("vi-VN")}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Copy Credentials for Teacher */}
                            <button
                              onClick={() => copyFormattedCredentials(acc)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-[11px] rounded flex items-center gap-1 cursor-pointer"
                              title="Sao chép toàn bộ thông tin tài khoản & mật khẩu để gửi giáo viên"
                            >
                              {copiedId === `msg_${acc.id}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-700 font-semibold">Đã chép</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Gửi Giáo Viên</span>
                                </>
                              )}
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => startEditAccount(acc)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                              title="Chỉnh sửa tài khoản"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteAccount(acc.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                              title="Xóa tài khoản"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between text-xs text-slate-500">
          <span>Hệ thống phân quyền &amp; tài khoản AVA Security v3.0</span>
          <button
            onClick={onLockApp}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Khóa Ứng Dụng</span>
          </button>
        </div>
      </div>

      {/* POPUP MODAL: CREATE / EDIT TEACHER ACCOUNT */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl border border-white/20 text-blue-300">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingAccountId ? "Chỉnh Sửa Tài Khoản Giáo Viên" : "Tạo Tài Khoản Giáo Viên Mới"}
                  </h3>
                  <p className="text-xs text-blue-200">
                    Cấp thông tin tài khoản và mật khẩu cho giáo viên đăng nhập
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAccountModalOpen(false);
                  resetUserForm();
                }}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveUserAccount} className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tài khoản (Username / Account) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="Ví dụ: ava11, giaovien01, gv_mydu..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Mật khẩu (Password) <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Tạo số ngẫu nhiên</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showFormPassword ? "text" : "password"}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Nhập mật khẩu (ví dụ: 123456)..."
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showFormPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Họ tên / Lớp học / Ghi chú (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: GV. Nguyễn Văn A - Lớp IELTS..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountModalOpen(false);
                    resetUserForm();
                  }}
                  className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading || !formUsername.trim() || !formPassword.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>{editingAccountId ? "Lưu Cập Nhật" : "Tạo Tài Khoản Giáo Viên"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
