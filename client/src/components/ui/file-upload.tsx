import { useState, useRef } from "react";
import { Upload, File, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
  selectedFile?: File;
  accept?: string;
  maxSize?: number;
  className?: string;
}

export function FileUpload({
  onFileSelect,
  onFileClear,
  selectedFile,
  accept = ".txt",
  maxSize = 10 * 1024 * 1024, // 10MB
  className,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    if (file.size > maxSize) {
      alert(`File size must be less than ${maxSize / 1024 / 1024}MB`);
      return;
    }
    
    if (accept === ".txt" && !file.name.endsWith('.txt') && file.type !== 'text/plain') {
      alert('Only .txt files are allowed');
      return;
    }
    
    onFileSelect(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400",
          selectedFile && "bg-blue-50 border-blue-400"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        data-testid="file-upload-area"
      >
        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600 mb-1">
          Click to upload or drag and drop
        </p>
        <p className="text-xs text-gray-500">
          TXT files up to {maxSize / 1024 / 1024}MB
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleFileInput}
          data-testid="file-input"
        />
      </div>

      {selectedFile && (
        <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-md">
          <File className="h-4 w-4 text-blue-600 mr-2" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-900 truncate">
              {selectedFile.name}
            </p>
            <p className="text-xs text-blue-700">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFileClear();
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
            className="ml-2 text-blue-600 hover:text-blue-800"
            data-testid="button-clear-file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
