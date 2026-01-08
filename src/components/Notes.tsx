import { FileText, Book, GraduationCap, ChevronRight, Search, Loader2, RefreshCcw } from "lucide-react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

export default function Notes() {
    const notes = useQuery((api as any).notes.getMyNotes);
    const processingNotes = useQuery((api as any).notes.getProcessingNotes);
    const syncNotes = useAction((api as any).notes.syncNotesForChapter);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredNotes = (notes as any[])?.filter((note: any) =>
        note?.chapterTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note?.bookTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note?.subject?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredProcessing = (processingNotes as any[])?.filter((note: any) =>
        note?.chapterTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note?.bookTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note?.subject?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedNote = (notes as any[])?.find((n: any) => n._id === selectedNoteId);

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen bg-[var(--theme-bg)]">
            <header className="mb-12">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 mb-4"
                >
                    <div className="p-3 rounded-2xl bg-purple-600/10 text-purple-600">
                        <GraduationCap className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-[var(--theme-text)]">Study Notes</h1>
                        <p className="text-[var(--theme-text-secondary)]">Your personalized AI-generated study guides</p>
                    </div>
                </motion.div>

                <div className="relative max-w-md mt-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--theme-text-secondary)] w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search your notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-2xl bg-[var(--theme-card-bg)] border border-[var(--theme-border)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all shadow-sm focus:shadow-md"
                    />
                </div>
            </header>

            <div className="grid lg:grid-cols-[1fr_2fr] gap-8">
                {/* Sidebar / List */}
                <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
                    {notes === undefined ? (
                        <div className="flex items-center justify-center p-12">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                        </div>
                    ) : (filteredNotes && filteredNotes.length > 0) || (filteredProcessing && filteredProcessing.length > 0) ? (
                        <>
                            {filteredProcessing?.map((note: any) => (
                                <div
                                    key={note.chapterId}
                                    className="w-full p-6 rounded-2xl text-left transition-all border bg-[var(--theme-card-bg)] text-[var(--theme-text)] border-purple-500/30"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-600/10 text-purple-600 flex items-center gap-2">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            AI Generating...
                                        </span>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                setIsSyncing(note.chapterId);
                                                try {
                                                    await syncNotes({ chapterId: note.chapterId });
                                                    toast.success("Note generation re-synced!");
                                                } catch (err) {
                                                    toast.error("Failed to re-sync notes.");
                                                } finally {
                                                    setIsSyncing(null);
                                                }
                                            }}
                                            disabled={isSyncing === note.chapterId}
                                            className="p-1 hover:bg-purple-600/20 rounded-full transition-colors text-purple-600 disabled:opacity-50"
                                            title="Retry/Sync Notes"
                                        >
                                            <RefreshCcw className={`w-4 h-4 ${isSyncing === note.chapterId ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>
                                    <h3 className="text-lg font-bold mb-1 line-clamp-2 text-[var(--theme-text)] opacity-70">
                                        {note.chapterTitle}
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm text-[var(--theme-text-secondary)] opacity-50">
                                        <Book className="w-4 h-4" />
                                        <span className="truncate">{note.bookTitle}</span>
                                    </div>
                                </div>
                            ))}
                            {filteredNotes.map((note) => (
                                <motion.button
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={note._id}
                                    onClick={() => setSelectedNoteId(note._id)}
                                    className={`w-full p-6 rounded-2xl text-left transition-all border ${selectedNoteId === note._id
                                        ? "bg-purple-600 text-white shadow-xl shadow-purple-500/20"
                                        : "bg-[var(--theme-card-bg)] text-[var(--theme-text)] border-[var(--theme-border)] hover:border-purple-500/50 hover:bg-[var(--theme-bg-secondary)]"
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${selectedNoteId === note._id ? "bg-white/20" : "bg-purple-600/10 text-purple-600"
                                            }`}>
                                            {note.subject}
                                        </span>
                                        <span className={`text-[10px] ${selectedNoteId === note._id ? "text-white/70" : "text-[var(--theme-text-secondary)]"}`}>
                                            {new Date(note.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold mb-1 line-clamp-2">{note.chapterTitle}</h3>
                                    <div className={`flex items-center gap-2 text-sm ${selectedNoteId === note._id ? "text-white/80" : "text-[var(--theme-text-secondary)]"}`}>
                                        <Book className="w-4 h-4" />
                                        <span className="truncate">{note.bookTitle}</span>
                                    </div>
                                </motion.button>
                            ))}
                        </>
                    ) : (
                        <div className="text-center p-12 rounded-3xl bg-[var(--theme-card-bg)] border border-dashed border-[var(--theme-border)]">
                            <FileText className="w-12 h-12 text-[var(--theme-text-secondary)] mx-auto mb-4 opacity-20" />
                            <p className="text-[var(--theme-text-secondary)] italic">No notes found.</p>
                        </div>
                    )}
                </div>

                {/* Note Content View */}
                <div className="bg-[var(--theme-card-bg)] border border-[var(--theme-border)] rounded-3xl overflow-hidden shadow-sm flex flex-col min-h-[600px]">
                    <AnimatePresence mode="wait">
                        {selectedNote ? (
                            <motion.div
                                key={selectedNote._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="flex flex-col h-full"
                            >
                                <div className="p-8 border-b border-[var(--theme-border)] bg-gradient-to-br from-purple-600/5 to-transparent">
                                    <div className="flex items-center gap-2 text-sm text-purple-600 font-bold mb-4">
                                        <span>{selectedNote.subject}</span>
                                        <ChevronRight className="w-4 h-4" />
                                        <span>{selectedNote.chapterTitle}</span>
                                    </div>
                                    <h2 className="text-3xl font-bold text-[var(--theme-text)] mb-2">{selectedNote.chapterTitle}</h2>
                                    <p className="text-[var(--theme-text-secondary)]">From {selectedNote.bookTitle}</p>
                                </div>
                                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar prose prose-purple dark:prose-invert max-w-none">
                                    <ReactMarkdown>{selectedNote.content}</ReactMarkdown>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                <div className="w-24 h-24 rounded-full bg-purple-600/5 flex items-center justify-center mb-6">
                                    <FileText className="w-10 h-10 text-purple-600/40" />
                                </div>
                                <h3 className="text-xl font-bold text-[var(--theme-text)] mb-2">Select a note to view</h3>
                                <p className="text-[var(--theme-text-secondary)] max-w-xs mx-auto">
                                    Click on any chapter from the list to see its detailed study notes.
                                </p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--theme-border);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--theme-text-secondary);
        }
      `}</style>
        </div>
    );
}
