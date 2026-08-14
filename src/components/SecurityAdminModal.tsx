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
  ToggleLeft,
  ToggleRight,
  Users,
  Search,
} from "lucide-react";

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  name?: string;
  role: "user";
  active: boolean;
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
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Admin Account Edit state
  const [isEditingAdmin, setIsEditingAdmin] = useState<boolean>(false);
  const [newAdminUser, setNewAdminUser] = useState<string>("");
  const [currentAdminPass, setCurrentAdminPass] = useState<string>("");
  const [newAdminPass, setNewAdminPass] = useState<string>("");

  // User Account Create / Edit Form state
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
        { id: "acc_ava01", username: "ava01", password: "139742", name: "Tài khoản Học sinh 01", role: "user", active: true, createdAt: "2026-08-14T00:00:00.000Z" },
        { id: "acc_ava02", username: "ava02", password: "227913", name: "Tài khoản Học sinh 02", role: "user", active: true, createdAt: "2026-08-14T00:00:00.000Z" },
        { id: "acc_ava03", username: "ava03", password: "379654", name: "Tài khoản Học sinh 03", role: "user", active: true, createdAt: "2026-08-14T00:00:00.000Z" },
        { id: "acc_ava04", username: "ava04", password: "467823", name: "Tài khoản Học sinh 04", role: "user", active: true, createdAt: "2026-08-14T00:00:00.000Z" },
        { id: "acc_ava05", username: "ava05", password: "562783", name: "Tài khoản Học sinh 05", role: "user", active: true, createdAt: "2026-08-14T00:00:00.000Z" },
        { id: "acc_ava06", username: "ava06", password: "678239", name: "Tài khoản Học sinh 06", role: "user", active: true, createdAt: "2026-08-14T00:00:00.000Z" },
        { id: "acc_ava07", username: "ava07", password: "789423", name: "Tài khoản Học sinh 07", role: "user", active: true, createdAt: "2026-08-14T00:00:00.000Z" },
        { id: "acc_ava08", username: "ava08", password: "868234", name: "Tài khoản Học sinh 08", role: "user", active: true, createdAt: "2026-08-14T00:00:00.000Z" },
        { id: "acc_ava09", username: "ava09", password: "923809", name: "Tài khoản Học sinh 09", role: "user", active: true, createdAt: "2026-08-14T00:00:00.000Z" },
        { id: "acc_ava10", username: "ava10", password: "109803", name: "Tài khoản Học sinh 10", role: "user", active: true, createdAt: "2026-08-14T00:00:00.000Z" },
      ];
      localStorage.setItem("ava_local_accounts", JSON.stringify(localAccs));
    }
    setAdminUsername(localAdminUser);
    setAccounts(localAccs);
  };

  const fetchAdminData = async () => {
    if (userRole !== "admin") return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/admin/get-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: sessionToken }),
      });
      const data = await res.json();
      if (res.ok && data) {
        const uName = data.adminUsername || "admin";
        const accs = data.accounts || [];
        setAdminUsername(uName);
        setAccounts(accs);
        localStorage.setItem("ava_local_admin_user", uName);
        localStorage.setItem("ava_local_accounts", JSON.stringify(accs));
      } else {
        loadFromLocalFallback();
      }
    } catch (e) {
      console.error("fetchAdminData error, using local fallback:", e);
      loadFromLocalFallback();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userRole === "admin") {
      fetchAdminData();
    }
  }, [isOpen, userRole]);

  if (!isOpen) return null;

  const handleSaveAdminCredentials = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newAdminUser.trim()) {
      setError("Tài khoản Quản Trị Viên không được để trống!");
      return;
    }
    if (newAdminPass.trim() && newAdminPass.trim().length < 4) {
      setError("Mật khẩu Quản Trị Viên mới phải có ít nhất 4 ký tự!");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/admin/change-admin-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: sessionToken,
          currentPassword: currentAdminPass.trim(),
          newUsername: newAdminUser.trim(),
          newPassword: newAdminPass.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminUsername(data.adminUsername || newAdminUser.trim());
        localStorage.setItem("ava_local_admin_user", data.adminUsername || newAdminUser.trim());
        if (newAdminPass.trim()) {
          localStorage.setItem("ava_local_admin_pass", newAdminPass.trim());
        }
        setSuccessMsg("Đã cập nhật thông tin tài khoản Quản Trị Viên thành công!");
        setIsEditingAdmin(false);
        setCurrentAdminPass("");
        setNewAdminPass("");
      } else {
        setError(data.error || "Không thể cập nhật tài khoản Quản Trị.");
      }
    } catch (e) {
      // Local fallback
      setAdminUsername(newAdminUser.trim());
      localStorage.setItem("ava_local_admin_user", newAdminUser.trim());
      if (newAdminPass.trim()) {
        localStorage.setItem("ava_local_admin_pass", newAdminPass.trim());
      }
      setSuccessMsg("Đã cập nhật thông tin tài khoản Quản Trị Viên (Lưu cục bộ)!");
      setIsEditingAdmin(false);
      setCurrentAdminPass("");
      setNewAdminPass("");
    } finally {
      setLoading(false);
    }
  };

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
        setSuccessMsg(data.message || "Lưu tài khoản thành công!");
        resetUserForm();
        setLoading(false);
        return;
      } else {
        setError(data.error || "Không thể lưu tài khoản.");
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
    setSuccessMsg(editingAccountId ? "Đã cập nhật tài khoản!" : "Đã tạo tài khoản mới!");
    resetUserForm();
    setLoading(false);
  };

  const resetUserForm = () => {
    setEditingAccountId(null);
    setFormUsername("");
    setFormPassword("");
    setFormName("");
    setShowFormPassword(false);
  };

  const startEditAccount = (acc: UserAccount) => {
    setEditingAccountId(acc.id);
    setFormUsername(acc.username);
    setFormPassword(acc.password);
    setFormName(acc.name || "");
    setShowFormPassword(false);
    setError(null);
    setSuccessMsg(null);
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

  const handleToggleAccount = async (accountId: string) => {
    try {
      await fetch("/api/auth/admin/toggle-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: sessionToken, accountId }),
      });
    } catch (e) {
      console.error(e);
    }

    const updated = accounts.map((a) => (a.id === accountId ? { ...a, active: !a.active } : a));
    setAccounts(updated);
    localStorage.setItem("ava_local_accounts", JSON.stringify(updated));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyFormattedCredentials = (acc: UserAccount) => {
    const msg = `🎓 THÔNG TIN ĐĂNG NHẬP AVA IELTS - TRƯỜNG ANH NGỮ MỸ DU\n• Tài khoản: ${acc.username}\n• Mật khẩu: ${acc.password}${
      acc.name ? `\n• Họ tên/Lớp: ${acc.name}` : ""
    }\n👉 Đăng nhập và bắt đầu bài tập luyện viết ngay!`;
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
                  : "Phiên đăng nhập người dùng / học sinh"}
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
                Bạn đang sử dụng hệ thống với vai trò <strong>Học sinh / Người dùng</strong>. Mọi bài viết và lịch sử luyện tập của bạn được lưu an toàn trên phiên làm việc này.
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
              {/* SECTION 1: ADMIN ACCOUNT MANAGEMENT */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <Key className="w-4 h-4 text-amber-600" />
                    <span>Tài Khoản Quản Trị Viên (Admin Account)</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsEditingAdmin(!isEditingAdmin);
                      setNewAdminUser(adminUsername);
                      setCurrentAdminPass("");
                      setNewAdminPass("");
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                  >
                    {isEditingAdmin ? "Hủy chỉnh sửa" : "Đổi Account & Password Admin"}
                  </button>
                </div>

                {!isEditingAdmin ? (
                  <div className="flex flex-wrap items-center justify-between bg-white border border-slate-200 rounded-lg p-3 gap-2">
                    <div className="flex items-center gap-2 text-xs text-slate-700">
                      <span className="font-semibold text-slate-500">Tài khoản:</span>
                      <span className="font-bold font-mono text-sm bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded">
                        {adminUsername}
                      </span>
                      <span className="text-slate-400 ml-2">• Quyền cao nhất (Master Admin)</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      <span>Mật khẩu: </span>
                      <span className="font-mono font-semibold text-slate-700">••••••••</span>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSaveAdminCredentials} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Account Admin mới:
                        </label>
                        <input
                          type="text"
                          value={newAdminUser}
                          onChange={(e) => setNewAdminUser(e.target.value)}
                          placeholder="Nhập tên Account..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Password Admin mới:
                        </label>
                        <input
                          type="password"
                          value={newAdminPass}
                          onChange={(e) => setNewAdminPass(e.target.value)}
                          placeholder="Mật khẩu mới (>=4 ký tự)..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Password hiện tại (xác nhận):
                        </label>
                        <input
                          type="password"
                          value={currentAdminPass}
                          onChange={(e) => setCurrentAdminPass(e.target.value)}
                          placeholder="Mật khẩu hiện tại..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingAdmin(false)}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Lưu Thay Đổi Admin
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* SECTION 2: CREATE / EDIT USER ACCOUNT FORM */}
              <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-950 font-bold text-sm">
                    <User className="w-4 h-4 text-blue-600" />
                    <span>{editingAccountId ? "Chỉnh Sửa Tài Khoản Người Dùng" : "Tạo Tài Khoản Người Dùng Mới (Học Sinh / Giáo Viên)"}</span>
                  </div>
                  {editingAccountId && (
                    <button
                      onClick={resetUserForm}
                      className="text-xs text-slate-600 hover:text-slate-900 underline cursor-pointer"
                    >
                      Hủy chế độ sửa
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveUserAccount} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tài khoản (Account / Username) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formUsername}
                        onChange={(e) => setFormUsername(e.target.value)}
                        placeholder="Ví dụ: student01, nguyenana..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Mật khẩu (Password) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showFormPassword ? "text" : "password"}
                          value={formPassword}
                          onChange={(e) => setFormPassword(e.target.value)}
                          placeholder="Ví dụ: 123456..."
                          className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowFormPassword(!showFormPassword)}
                          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Họ tên / Ghi chú (Tùy chọn)
                      </label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Ví dụ: Nguyễn Văn A - Lớp IELTS Intensive"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    {editingAccountId && (
                      <button
                        type="button"
                        onClick={resetUserForm}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg text-xs hover:bg-slate-50 transition-all cursor-pointer"
                      >
                        Hủy
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={loading || !formUsername.trim() || !formPassword.trim()}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{editingAccountId ? "Lưu Cập Nhật Tài Khoản" : "Thêm Tài Khoản Mới Ngay"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* SECTION 3: USER ACCOUNTS LIST */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <Users className="w-4 h-4 text-slate-600" />
                    <span>Danh Sách Tài Khoản Người Dùng ({accounts.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm tài khoản, tên..."
                        className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      onClick={fetchAdminData}
                      className="p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 cursor-pointer"
                      title="Làm mới danh sách"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {filteredAccounts.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 border border-slate-200 rounded-xl">
                    {searchTerm ? "Không tìm thấy tài khoản phù hợp với từ khóa." : "Chưa có tài khoản người dùng nào được tạo. Hãy thêm tài khoản ở form phía trên!"}
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {filteredAccounts.map((acc) => {
                      const isPassVisible = !!visiblePasswords[acc.id];
                      return (
                        <div
                          key={acc.id}
                          className={`p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                            !acc.active ? "bg-slate-50/90 opacity-75" : "bg-white"
                          }`}
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
                              {acc.active ? (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold text-[10px] rounded-full">
                                  🟢 Đang hoạt động
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 font-semibold text-[10px] rounded-full">
                                  🔴 Tạm khóa
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2">
                              {acc.name && <span className="font-medium text-slate-800">{acc.name}</span>}
                              <span>• Tạo ngày: {new Date(acc.createdAt).toLocaleDateString("vi-VN")}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Copy Credentials for Student */}
                            <button
                              onClick={() => copyFormattedCredentials(acc)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-[11px] rounded flex items-center gap-1 cursor-pointer"
                              title="Sao chép toàn bộ thông tin tài khoản & mật khẩu để gửi học sinh"
                            >
                              {copiedId === `msg_${acc.id}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-700 font-semibold">Đã chép</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Gửi học sinh</span>
                                </>
                              )}
                            </button>

                            {/* Toggle Active Status */}
                            <button
                              onClick={() => handleToggleAccount(acc.id)}
                              className={`p-1.5 rounded cursor-pointer ${
                                acc.active
                                  ? "text-emerald-600 hover:bg-emerald-50"
                                  : "text-slate-400 hover:bg-slate-100"
                              }`}
                              title={acc.active ? "Tạm khóa tài khoản này" : "Kích hoạt lại tài khoản này"}
                            >
                              {acc.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
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
    </div>
  );
};
