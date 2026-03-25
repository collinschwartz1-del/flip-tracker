"use client";

import { useState, useRef } from "react";
import { compressImage } from "@/lib/image-utils";
import type { DealPhoto, PhotoType } from "@/lib/types";

interface PhotoGalleryProps {
  dealId: string;
  photos: DealPhoto[];
  onUpload: (file: File, type: PhotoType) => Promise<void>;
  onDelete: (photo: DealPhoto) => Promise<void>;
  uploading: boolean;
}

export function PhotoGallery({
  dealId,
  photos,
  onUpload,
  onDelete,
  uploading,
}: PhotoGalleryProps) {
  const [view, setView] = useState<"all" | "compare">("all");
  const [uploadType, setUploadType] = useState<PhotoType>("before");
  const [confirmDelete, setConfirmDelete] = useState<DealPhoto | null>(null);
  const [fullscreen, setFullscreen] = useState<DealPhoto | null>(null);
  const [compareIndex, setCompareIndex] = useState(0);
  const [compareShowAfter, setCompareShowAfter] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const beforePhotos = photos.filter((p) => p.photo_type === "before");
  const afterPhotos = photos.filter((p) => p.photo_type === "after");
  const hasComparison = beforePhotos.length > 0 && afterPhotos.length > 0;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    for (const file of Array.from(files)) {
      try {
        const compressed = await compressImage(file);
        await onUpload(compressed, uploadType);
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }

    // Reset input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = "";
  };

  const triggerUpload = (type: PhotoType) => {
    setUploadType(type);
    // Small delay to ensure state is set before file dialog opens
    setTimeout(() => fileRef.current?.click(), 50);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300">
          Photos ({photos.length})
        </h3>
        {hasComparison && (
          <button
            onClick={() => setView(view === "all" ? "compare" : "all")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              view === "compare"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-zinc-900 text-zinc-500 border border-zinc-800"
            }`}
          >
            {view === "compare" ? "Show All" : "Before / After"}
          </button>
        )}
      </div>

      {/* Upload buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => triggerUpload("before")}
          disabled={uploading}
          className="flex-1 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-medium text-zinc-300 flex items-center justify-center gap-2 active:bg-zinc-800 disabled:opacity-50"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-zinc-400"
          >
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 17a4 4 0 100-8 4 4 0 000 8z" />
          </svg>
          {uploading ? "Uploading..." : "+ Before"}
        </button>
        <button
          onClick={() => triggerUpload("after")}
          disabled={uploading}
          className="flex-1 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-medium text-zinc-300 flex items-center justify-center gap-2 active:bg-zinc-800 disabled:opacity-50"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-emerald-400"
          >
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 17a4 4 0 100-8 4 4 0 000 8z" />
          </svg>
          {uploading ? "Uploading..." : "+ After"}
        </button>
      </div>

      {/* Hidden file input (supports multiple + camera) */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* COMPARE VIEW */}
      {view === "compare" && hasComparison && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="relative aspect-[4/3]">
            <img
              src={
                compareShowAfter
                  ? afterPhotos[Math.min(compareIndex, afterPhotos.length - 1)]
                      ?.public_url
                  : beforePhotos[
                      Math.min(compareIndex, beforePhotos.length - 1)
                    ]?.public_url
              }
              alt={compareShowAfter ? "After" : "Before"}
              className="w-full h-full object-cover"
            />
            {/* Before/After label */}
            <div
              className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold ${
                compareShowAfter
                  ? "bg-emerald-500 text-white"
                  : "bg-zinc-700 text-zinc-200"
              }`}
            >
              {compareShowAfter ? "AFTER" : "BEFORE"}
            </div>
          </div>

          {/* Toggle bar */}
          <div className="flex">
            <button
              onClick={() => setCompareShowAfter(false)}
              className={`flex-1 py-3 text-xs font-bold text-center transition-colors ${
                !compareShowAfter
                  ? "bg-zinc-700 text-zinc-100"
                  : "bg-zinc-900 text-zinc-500"
              }`}
            >
              Before ({beforePhotos.length})
            </button>
            <button
              onClick={() => setCompareShowAfter(true)}
              className={`flex-1 py-3 text-xs font-bold text-center transition-colors ${
                compareShowAfter
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-900 text-zinc-500"
              }`}
            >
              After ({afterPhotos.length})
            </button>
          </div>

          {/* Photo nav dots */}
          {(compareShowAfter ? afterPhotos : beforePhotos).length > 1 && (
            <div className="flex justify-center gap-1.5 py-2 bg-zinc-900">
              {(compareShowAfter ? afterPhotos : beforePhotos).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCompareIndex(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === compareIndex ? "bg-amber-400" : "bg-zinc-700"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ALL PHOTOS VIEW */}
      {view === "all" && photos.length > 0 && (
        <div className="space-y-2">
          {/* Before photos */}
          {beforePhotos.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
                Before ({beforePhotos.length})
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {beforePhotos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <img
                      src={photo.public_url}
                      alt="Before"
                      className="w-full aspect-square object-cover rounded-lg cursor-pointer active:opacity-80"
                      onClick={() => setFullscreen(photo)}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(photo);
                      }}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                      >
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* After photos */}
          {afterPhotos.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-emerald-500 mb-1.5">
                After ({afterPhotos.length})
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {afterPhotos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <img
                      src={photo.public_url}
                      alt="After"
                      className="w-full aspect-square object-cover rounded-lg cursor-pointer active:opacity-80 ring-1 ring-emerald-500/30"
                      onClick={() => setFullscreen(photo)}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(photo);
                      }}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                      >
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {photos.length === 0 && (
        <p className="text-xs text-zinc-600 text-center py-4">
          No photos yet — tap a button above to add one
        </p>
      )}

      {/* Fullscreen viewer */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setFullscreen(null)}
        >
          <img
            src={fullscreen.public_url}
            alt=""
            className="max-w-full max-h-full object-contain"
          />
          <div
            className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold ${
              fullscreen.photo_type === "after"
                ? "bg-emerald-500 text-white"
                : "bg-zinc-700 text-zinc-200"
            }`}
          >
            {fullscreen.photo_type.toUpperCase()}
          </div>
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-zinc-800/80 rounded-full flex items-center justify-center"
            onClick={() => setFullscreen(null)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          {fullscreen.caption && (
            <p className="absolute bottom-4 left-4 right-4 text-center text-sm text-zinc-300 bg-black/60 rounded-lg py-2 px-4">
              {fullscreen.caption}
            </p>
          )}
          <p className="absolute bottom-14 left-4 right-4 text-center text-[10px] text-zinc-500">
            {fullscreen.uploaded_by?.split("@")[0]} ·{" "}
            {new Date(fullscreen.created_at).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-zinc-100 mb-2">
              Delete Photo?
            </h3>
            <p className="text-sm text-zinc-400 mb-6">
              This can&apos;t be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-medium text-sm border border-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await onDelete(confirmDelete);
                  setConfirmDelete(null);
                }}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
