import { useMemo, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { pdfjs } from "react-pdf";
import { ExternalLink, FileText, Loader2, Plus, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const userBooksApi = api as any;

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

export default function YourBooks() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);

  const books = useQuery(userBooksApi.userBooks.listMyBooks) ?? [];
  const generateUploadUrl = useMutation(userBooksApi.userBooks.generateUploadUrl);
  const createUserBook = useMutation(userBooksApi.userBooks.createUserBook);
  const startUserBookTextJob = useAction(userBooksApi.userBookText.startUserBookTextJob);

  const sortedBooks = useMemo(() => {
    return [...books].sort((a, b) => b.uploadedAt - a.uploadedAt);
  }, [books]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadCount(files.length);

    try {
      for (const file of Array.from(files)) {
        if (!file.name.toLowerCase().endsWith(".pdf")) {
          toast.error(`Skipped ${file.name}: only PDFs are supported.`);
          continue;
        }

        const uploadUrl = await generateUploadUrl();
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/pdf" },
          body: file,
        });

        if (!uploadResponse.ok) {
          toast.error(`Upload failed for ${file.name}.`);
          continue;
        }

        const { storageId } = await uploadResponse.json();
        if (!storageId) {
          toast.error(`Upload failed for ${file.name}.`);
          continue;
        }

        const title = file.name.replace(/\.pdf$/i, "");
        const created = await createUserBook({
          fileId: storageId,
          fileName: file.name,
          fileSize: file.size,
          title,
        });

        if (created?.fileUrl) {
          try {
            const pdf = await pdfjs.getDocument(created.fileUrl).promise;
            await startUserBookTextJob({
              bookId: created.bookId,
              pdfUrl: created.fileUrl,
              totalPages: pdf.numPages,
            });
          } catch {
            toast.warning(`Uploaded ${file.name}, but could not start text extraction.`);
          }
        }
      }

      toast.success("Upload complete. Extraction is running in the background.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
      setUploadCount(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="card flex flex-col gap-4 border border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--theme-text)]">Your Books</h1>
              <p className="text-sm text-[var(--theme-text-secondary)]">
                Upload PDFs that stay private to your account. We automatically extract text for your AI tools.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleUploadClick}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg"
              >
                <Plus className="h-4 w-4" />
                Add PDF
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={(event) => void handleFiles(event.target.files)}
              />
            </div>
          </div>

          {uploading && (
            <div className="flex items-center gap-3 rounded-lg border border-purple-500/20 bg-purple-500/10 px-4 py-3 text-sm text-purple-200">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading {uploadCount} file{uploadCount === 1 ? "" : "s"}…
            </div>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {sortedBooks.length === 0 ? (
            <div className="card col-span-full border border-dashed border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-10 text-center">
              <Upload className="mx-auto h-8 w-8 text-[var(--theme-text-secondary)]" />
              <p className="mt-4 text-lg font-semibold text-[var(--theme-text)]">No PDFs yet</p>
              <p className="mt-2 text-sm text-[var(--theme-text-secondary)]">
                Click “Add PDF” to upload your first book.
              </p>
            </div>
          ) : (
            sortedBooks.map((book) => {
              const job = book.job;
              const progress = job
                ? Math.min(100, Math.floor(((job.nextPageNumber - 1) / Math.max(1, job.totalPages)) * 100))
                : null;

              return (
                <div
                  key={String(book._id)}
                  className="card flex flex-col gap-4 border border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">
                        <FileText className="h-5 w-5 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--theme-text)]">{book.title}</h3>
                        <p className="text-xs text-[var(--theme-text-secondary)]">
                          {book.fileName} • {formatBytes(book.fileSize)}
                        </p>
                      </div>
                    </div>
                    {book.fileUrl && (
                      <button
                        onClick={() => window.open(book.fileUrl, "_blank", "noopener,noreferrer")}
                        className="inline-flex items-center gap-2 rounded-lg border border-[var(--theme-border)] px-3 py-2 text-xs font-semibold text-[var(--theme-text-secondary)] hover:text-[var(--theme-text)]"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open
                      </button>
                    )}
                  </div>

                  <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] p-3 text-sm text-[var(--theme-text-secondary)]">
                    {job ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase tracking-wide">Extraction</span>
                          <span className="text-xs font-semibold text-[var(--theme-text)]">
                            {job.status}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--theme-border)]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-teal-400"
                            style={{ width: `${progress ?? 0}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span>
                            {job.nextPageNumber - 1} / {job.totalPages} pages
                          </span>
                          <span>{progress ?? 0}%</span>
                        </div>
                        {job.lastError && (
                          <p className="text-xs text-red-400">{job.lastError}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-400" />
                        Preparing extraction…
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-[var(--theme-text-secondary)]">
                    Uploaded {new Date(book.uploadedAt).toLocaleString()}.
                  </p>
                </div>
              );
            })
          )}
        </div>

        <div className="card border border-dashed border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-6 text-center">
          <p className="text-sm font-semibold text-[var(--theme-text)]">More Features soon!</p>
          <p className="mt-1 text-xs text-[var(--theme-text-secondary)]">
            Smart tagging, highlights, and AI study plans are on the way.
          </p>
        </div>
      </div>
    </div>
  );
}
