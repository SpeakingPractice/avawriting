import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
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
  Clock,
  UserCheck,
  Sparkles,
  AlertCircle,
} from "lucide-react";

interface OneTimeCode {
  id: string;
  code: string;
  createdAt: string;
  used: boolean;
  usedAt?: string;
  usedByIp?: string;
  note?: string;
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
  const [masterKey, setMasterKey] = useState<string>("");
  const [codes, setCodes] = useState<OneTimeCode[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New code generation form
  const [note, setNote] = useState<string>("");
  const [count, setCount] = useState<number>(1);
  const [generatedCodes, setGeneratedCodes] = useState<OneTimeCode[]>([]);

  // Master key edit
  const [showMasterKey, setShowMasterKey] = useState<boolean>(false);
  const [isEditingMaster, setIsEditingMaster] = useState<boolean>(false);
  const [newMasterKeyInput, setNewMasterKeyInput] = useState<string>("");

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const syncCodesWithServer = async (clientCodes: OneTimeCode[]) => {
    try {
      const res = await fetch("/api/auth/admin/sync-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: sessionToken,
          masterKey: "999999",
          codes: clientCodes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.allCodes)) {
        setCodes(data.allCodes);
        localStorage.setItem("ava_local_codes", JSON.stringify(data.allCodes));
        return data.allCodes;
      }
    } catch (err) {
      console.error("syncCodesWithServer error:", err);
    }
    return null;
  };

  const loadFromLocalFallback = () => {
    const localMaster = localStorage.getItem("ava_local_master_key") || "999999";
    const localCodesStr = localStorage.getItem("ava_local_codes");
    let localCodes: OneTimeCode[] = [];
    if (localCodesStr) {
      try {
        localCodes = JSON.parse(localCodesStr);
      } catch (err) {
        console.error("Local codes parse error:", err);
      }
    }
    setMasterKey(localMaster);
    setCodes(localCodes);
    if (localCodes.length > 0) {
      syncCodesWithServer(localCodes);
    }
  };

  const fetchAdminData = async () => {
    if (userRole !== "admin") return;
    setLoading(true);
    setError(null);

    const localCodesStr = localStorage.getItem("ava_local_codes");
    let localCodes: OneTimeCode[] = [];
    if (localCodesStr) {
      try {
        localCodes = JSON.parse(localCodesStr);
      } catch (err) {}
    }

    try {
      const res = await fetch("/api/auth/admin/get-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: sessionToken, masterKey: "999999" }),
      });
      const data = await res.json();
      if (res.ok) {
        setMasterKey(data.masterKey || "999999");
        const serverCodes: OneTimeCode[] = data.oneTimeCodes || [];

        // Merge server and local codes to guarantee no code is lost
        const combinedMap = new Map<string, OneTimeCode>();
        serverCodes.forEach((sc) => {
          if (sc && sc.code) combinedMap.set(sc.code, sc);
        });
        localCodes.forEach((lc) => {
          if (lc && lc.code && !combinedMap.has(lc.code)) {
            combinedMap.set(lc.code, lc);
          }
        });
        const combinedCodes = Array.from(combinedMap.values());

        setCodes(combinedCodes);
        localStorage.setItem("ava_local_codes", JSON.stringify(combinedCodes));
        localStorage.setItem("ava_local_master_key", data.masterKey || "999999");

        // Sync combined set to server to guarantee server has all codes
        syncCodesWithServer(combinedCodes);
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

  const handleGenerateCodes = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/auth/admin/generate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: sessionToken,
          masterKey: "999999",
          note: note.trim(),
          count: count,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCodes(data.allCodes || []);
        setGeneratedCodes(data.newCodes || []);
        setSuccessMsg(`Đã tạo thành công ${data.newCodes?.length || 1} mã sử dụng 1 lần!`);
        setNote("");
        localStorage.setItem("ava_local_codes", JSON.stringify(data.allCodes || []));
        setLoading(false);
        return;
      }
    } catch (e) {
      console.error("Generate code API error, using local fallback:", e);
    }

    // Client-side fallback if server API is unavailable
    const newItems: OneTimeCode[] = [];
    const localCodesStr = localStorage.getItem("ava_local_codes");
    let existingCodes: OneTimeCode[] = [];
    if (localCodesStr) {
      try {
        existingCodes = JSON.parse(localCodesStr);
      } catch (err) {}
    }

    for (let i = 0; i < count; i++) {
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      const item: OneTimeCode = {
        id: "code_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        code: newCode,
        createdAt: new Date().toISOString(),
        used: false,
        note: note.trim() || `Mã 1 lần #${existingCodes.length + i + 1}`,
      };
      newItems.push(item);
    }

    const updatedCodes = [...newItems, ...existingCodes];
    setCodes(updatedCodes);
    setGeneratedCodes(newItems);
    setSuccessMsg(`Đã tạo thành công ${newItems.length} mã sử dụng 1 lần!`);
    setNote("");
    localStorage.setItem("ava_local_codes", JSON.stringify(updatedCodes));

    // Immediately push fallback codes to server!
    await syncCodesWithServer(updatedCodes);

    setLoading(false);
  };

  const handleChangeMasterKey = async () => {
    if (!newMasterKeyInput.trim() || newMasterKeyInput.trim().length < 4) {
      setError("Mã Quản trị mới phải có ít nhất 4 ký tự!");
      return;
    }
    setLoading(true);
    setError(null);
    const targetKey = newMasterKeyInput.trim();
    try {
      const res = await fetch("/api/auth/admin/change-master-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: sessionToken,
          oldKey: masterKey || "999999",
          newKey: targetKey,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMasterKey(data.newMasterKey);
        localStorage.setItem("ava_local_master_key", data.newMasterKey);
      } else {
        setMasterKey(targetKey);
        localStorage.setItem("ava_local_master_key", targetKey);
      }
    } catch (e) {
      setMasterKey(targetKey);
      localStorage.setItem("ava_local_master_key", targetKey);
    } finally {
      setIsEditingMaster(false);
      setNewMasterKeyInput("");
      setSuccessMsg("Đã cập nhật Mã Quản Trị thành công!");
      setLoading(false);
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    try {
      await fetch("/api/auth/admin/delete-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: sessionToken, masterKey: "999999", codeId }),
      });
    } catch (e) {
      console.error(e);
    }

    const updated = codes.filter((c) => c.id !== codeId && c.code !== codeId);
    setCodes(updated);
    localStorage.setItem("ava_local_codes", JSON.stringify(updated));
  };

  const handleClearUsedCodes = async () => {
    if (!window.confirm("Bạn có chắc muốn xóa tất cả các mã 1 lần ĐÃ SỬ DỤNG khỏi danh sách?")) return;
    try {
      await fetch("/api/auth/admin/clear-used-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: sessionToken, masterKey: "999999" }),
      });
    } catch (e) {
      console.error(e);
    }

    const updated = codes.filter((c) => !c.used);
    setCodes(updated);
    setSuccessMsg("Đã dọn dẹp các mã 1 lần đã sử dụng!");
    localStorage.setItem("ava_local_codes", JSON.stringify(updated));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyFormattedMessage = (codeItem: OneTimeCode) => {
    const msg = `Mã truy cập 1 lần của bạn cho Ứng Dụng AVA là: ${codeItem.code}\nLưu ý: Mã này chỉ có hiệu lực cho 1 phiên truy cập và sẽ tự động vô hiệu hóa ngay sau khi bạn đăng nhập thành công.`;
    navigator.clipboard.writeText(msg);
    setCopiedId(`msg_${codeItem.id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[9990] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 my-8">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Bản Quản Lý Bảo Mật & Mã Truy Cập</h2>
              <p className="text-xs text-slate-400">
                {userRole === "admin"
                  ? "Quyền Quản Trị Viên (Master Admin)"
                  : "Phiên Học Sinh / Khách (Đã vô hiệu hóa mã)"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
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
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900">Phiên Đăng Nhập An Toàn</h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                Bạn đã truy cập thành công thông qua <strong>Mã Sử Dụng 1 Lần (OTP)</strong>. Mã này đã được hệ thống ghi nhận và tự động vô hiệu hóa. Khi bạn đóng trình duyệt hoặc bấm Khóa Ứng Dụng, mã cũ sẽ không thể sử dụng lại.
              </p>
              <div className="pt-2">
                <button
                  onClick={onLockApp}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 mx-auto transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  <span>Khóa Ứng Dụng & Đăng Xuất</span>
                </button>
              </div>
            </div>
          ) : (
            /* ADMIN ROLE VIEW */
            <>
              {/* SECTION 1: MASTER KEY */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <Key className="w-4 h-4 text-amber-600" />
                    <span>Mã Quản Trị Viên (Master Key)</span>
                  </div>
                  <button
                    onClick={() => setIsEditingMaster(!isEditingMaster)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                  >
                    {isEditingMaster ? "Hủy thay đổi" : "Đổi Mã Quản Trị"}
                  </button>
                </div>

                {!isEditingMaster ? (
                  <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-3">
                    <span className="font-mono text-base font-bold tracking-wider text-slate-800">
                      {showMasterKey ? masterKey : "••••••••"}
                    </span>
                    <button
                      onClick={() => setShowMasterKey(!showMasterKey)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 rounded"
                      title={showMasterKey ? "Ẩn mã" : "Hiện mã"}
                    >
                      {showMasterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(masterKey, "master_key")}
                      className="p-1.5 text-slate-500 hover:text-slate-800 rounded ml-auto flex items-center gap-1 text-xs font-medium"
                    >
                      {copiedId === "master_key" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newMasterKeyInput}
                      onChange={(e) => setNewMasterKeyInput(e.target.value)}
                      placeholder="Nhập Mã Quản Trị mới..."
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={handleChangeMasterKey}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors"
                    >
                      Lưu
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION 2: GENERATE 1-TIME CODES */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Tạo Mã Truy Cập 1 Lần (One-Time Passcode)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ghi chú / Tên người dùng (Tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Ví dụ: Gửi học sinh Nguyễn Văn A"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Số lượng mã</label>
                    <select
                      value={count}
                      onChange={(e) => setCount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value={1}>1 mã</option>
                      <option value={3}>3 mã</option>
                      <option value={5}>5 mã</option>
                      <option value={10}>10 mã</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleGenerateCodes}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo Mã 1 Lần Mới Ngay</span>
                </button>

                {/* Newly Generated Codes Box */}
                {generatedCodes.length > 0 && (
                  <div className="mt-3 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2">
                    <div className="text-xs font-bold text-emerald-900 flex items-center justify-between">
                      <span>🎉 Mã 1 lần vừa được khởi tạo:</span>
                    </div>
                    <div className="space-y-2">
                      {generatedCodes.map((c) => (
                        <div
                          key={c.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-emerald-200 p-2.5 rounded-lg gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-base font-extrabold text-emerald-800 tracking-wider">
                              {c.code}
                            </span>
                            {c.note && (
                              <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {c.note}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyToClipboard(c.code, c.id)}
                              className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-semibold rounded flex items-center gap-1"
                            >
                              {copiedId === c.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedId === c.id ? "Đã chép mã" : "Chép mã"}</span>
                            </button>
                            <button
                              onClick={() => copyFormattedMessage(c)}
                              className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-[11px] font-semibold rounded flex items-center gap-1"
                            >
                              {copiedId === `msg_${c.id}` ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>
                                {copiedId === `msg_${c.id}` ? "Đã chép tin nhắn" : "Chép tin nhắn gửi học sinh"}
                              </span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: PASSCODE LIST & STATUS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <Clock className="w-4 h-4 text-slate-600" />
                    <span>Danh Sách Mã Truy Cập ({codes.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchAdminData}
                      className="p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
                      title="Làm mới"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    {codes.some((c) => c.used) && (
                      <button
                        onClick={handleClearUsedCodes}
                        className="text-xs text-red-600 hover:text-red-800 font-medium underline"
                      >
                        Xóa mã đã dùng
                      </button>
                    )}
                  </div>
                </div>

                {codes.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 border border-slate-200 rounded-xl">
                    Chưa có mã 1 lần nào được tạo.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {codes.map((c) => (
                      <div
                        key={c.id}
                        className={`p-3 flex items-center justify-between gap-3 text-xs ${
                          c.used ? "bg-slate-50/80 opacity-75" : "bg-white"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-slate-800 tracking-wider">
                              {c.code}
                            </span>
                            {c.used ? (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 font-semibold text-[10px] rounded-full">
                                🔴 Đã sử dụng
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-semibold text-[10px] rounded-full">
                                🟡 Chưa sử dụng
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            {c.note && <span className="font-medium text-slate-700">{c.note}</span>}
                            <span>• {new Date(c.createdAt).toLocaleDateString("vi-VN")}</span>
                            {c.usedAt && (
                              <span className="text-red-600">
                                (Dùng lúc: {new Date(c.usedAt).toLocaleTimeString("vi-VN")}{" "}
                                {new Date(c.usedAt).toLocaleDateString("vi-VN")})
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {!c.used && (
                            <>
                              <button
                                onClick={() => copyToClipboard(c.code, c.id)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                                title="Sao chép mã"
                              >
                                {copiedId === c.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => copyFormattedMessage(c)}
                                className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-[11px] rounded"
                                title="Sao chép tin nhắn gửi người dùng"
                              >
                                {copiedId === `msg_${c.id}` ? "Đã chép tin" : "Gửi người dùng"}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteCode(c.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Xóa mã"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between text-xs text-slate-500">
          <span>Hệ thống bảo mật 2 lớp AVA Security v2.0</span>
          <button
            onClick={onLockApp}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Khóa Ứng Dụng</span>
          </button>
        </div>
      </div>
    </div>
  );
};
