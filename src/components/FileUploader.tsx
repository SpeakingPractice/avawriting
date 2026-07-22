import React, { useRef, useState } from "react";
import mammoth from "mammoth";
import { Upload, FileText, AlertCircle, Loader2 } from "lucide-react";

interface FileUploaderProps {
  onTextExtracted: (text: string) => void;
  onError: (msg: string) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onTextExtracted,
  onError,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setIsLoading(true);
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "docx") {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        try {
          const result = await mammoth.extractRawText({ arrayBuffer });
          if (result.value && result.value.trim().length > 0) {
            onTextExtracted(result.value);
          } else {
            onError("Không thể trích xuất văn bản từ tệp Word này hoặc tệp trống.");
          }
        } catch (err: any) {
          console.error("Error reading docx with mammoth:", err);
          onError("Lỗi khi đọc tệp tin Word (.docx). Vui lòng thử lại hoặc sao chép văn bản.");
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (extension === "txt" || file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text && text.trim().length > 0) {
          onTextExtracted(text);
        } else {
          onError("Tệp tin văn bản trống.");
        }
        setIsLoading(false);
      };
      reader.onerror = () => {
        onError("Không thể đọc tệp tin văn bản.");
        setIsLoading(false);
      };
      reader.readAsText(file);
    } else if (extension === "doc") {
      onError("Hệ thống chỉ hỗ trợ trực tiếp tệp tin Word mới (.docx). Vui lòng lưu thành dạng .docx hoặc sao chép và dán trực tiếp.");
      setIsLoading(false);
    } else {
      onError("Định dạng tệp không được hỗ trợ. Hãy tải lên tệp .docx hoặc .txt.");
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={triggerFileSelect}
      className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
        isDragging
          ? "border-blue-500 bg-blue-50/50"
          : "border-slate-200 bg-slate-50/30 hover:bg-slate-50/80 hover:border-slate-300"
      }`}
      id="file-drop-zone"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".docx,.txt"
        className="hidden"
      />

      {isLoading ? (
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-600">Đang trích xuất văn bản...</p>
        </div>
      ) : (
        <>
          <div className="p-3 bg-white rounded-full shadow-sm border border-slate-100 text-blue-600 mb-2">
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-700">Tải lên tệp Word hoặc Văn bản</p>
          <p className="text-[10px] text-slate-400 mt-1 max-w-[220px]">
            Hỗ trợ định dạng <span className="font-semibold">.docx</span> hoặc <span className="font-semibold">.txt</span>. Kéo & thả tệp vào đây hoặc nhấn để chọn.
          </p>
        </>
      )}
    </div>
  );
};
