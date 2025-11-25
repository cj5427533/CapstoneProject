import * as React from "react";

export function FileDropzone({ files, setFiles }: { files: File[]; setFiles: (files: File[]) => void }) {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const onFiles = (list: FileList | File[]) => {
    const fileArray = Array.from(list as FileList);
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    const next: File[] = [];
    for (const f of fileArray) {
      if (f.size > maxSize) continue;
      if (!allowed.includes(f.type)) continue;
      next.push(f);
    }
    if (next.length) setFiles([...(files || []), ...next]);
  };

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <div
        className={[
          "border-2 rounded-lg p-6 text-center cursor-pointer transition-colors",
          "border-dashed",
          isDragging ? "border-primary bg-muted/50" : "border-border hover:border-primary/60 hover:bg-muted/50"
        ].join(" ")}
        onClick={() => inputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-label="파일 첨부 드롭존"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/jpg"
          className="hidden"
          onChange={(e) => { if (e.target.files) onFiles(e.target.files); e.currentTarget.value = ""; }}
        />
        <div className="text-sm text-muted-foreground">여기에 드래그하거나 클릭하여 파일을 선택하세요 (PNG/JPG, 최대 10MB)</div>
      </div>

      {files && files.length > 0 && (
        <div className="mt-4">
          <div className="text-sm text-muted-foreground mb-2">첨부된 파일 {files.length}개</div>
          <ul className="text-sm divide-y divide-border">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between py-1">
                <span className="truncate mr-2" title={f.name}>{f.name}</span>
                <span className="text-muted-foreground">{(f.size / 1024 / 1024).toFixed(2)}MB</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
