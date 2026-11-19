"use client";

import React, { useEffect, useRef, useState } from "react";
import ModalClose from "@/components/common/ModalClose";
import Image from "next/image";
import PageHeader from "@/components/common/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { useAlert } from "@/context/AlertContext";
import { mediaService } from "@/services/mediaService";
import { resolveImageUrl } from "@/utils/mediaUrl";
import Icon from "@/components/icons/Icon";
import OrganisationDetailsForm from "@/components/settings/OrganisationDetailsForm";
import LogoCropDialog from "@/components/settings/LogoCropDialog";

// The design allows JPG and PNG only (Figma 222:34175: "Only JPG & PNG allowed")
const ACCEPTED = "image/png,image/jpeg";
const ACCEPTED_TYPES = ["image/png", "image/jpeg"];

/**
 * Organiser "Logo Settings" (Figma Organiser page, frame 222:34175). A chosen logo is cropped before it is uploaded through
 * the media service (ORGANIZATION_LOGO), then saved on the organiser's profile with Update.
 */
export default function LogoSettingsPage() {
  const { user, updateProfile } = useAuth();
  const { showAlert } = useAlert();
  const savedKey = typeof user?.profile?.logoKey === "string" ? (user.profile.logoKey as string) : null;
  // undefined = unchanged; null = restore to default; string = newly uploaded, not yet saved
  const [staged, setStaged] = useState<string | null | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [cropSelection, setCropSelection] = useState<{ file: File; source: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const source = cropSelection?.source;
    return () => {
      if (source) URL.revokeObjectURL(source);
    };
  }, [cropSelection?.source]);

  const shownKey = staged === undefined ? savedKey : staged;
  const shownUrl = resolveImageUrl(shownKey);
  const dirty = staged !== undefined && staged !== savedKey;

  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPreviewOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [previewOpen]);

  const selectFile = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      showAlert("Only JPG and PNG images can be used as the logo.", "error");
      if (input.current) input.current.value = "";
      return;
    }

    if (input.current) input.current.value = "";
    setCropSelection({ file, source: URL.createObjectURL(file) });
  };

  const uploadCropped = async (file: File) => {
    setUploading(true);
    try {
      const res = await mediaService.uploadImage(file, "ORGANIZATION_LOGO");
      if (res.success && res.data?.key) {
        setStaged(res.data.key);
        return { success: true };
      }

      const error = res.message || "The logo could not be uploaded. Please try again.";
      showAlert(error, "error");
      return { success: false, message: error };
    } catch {
      const error = "The logo could not be uploaded. Please try again.";
      showAlert(error, "error");
      return { success: false, message: error };
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    // The profile is replaced as a whole on the server, so keep everything else on it (e.g. the organisation name)
    const { logoKey: _previous, ...rest } = (user?.profile || {}) as Record<string, unknown>;
    void _previous;
    const res = await updateProfile({ profile: staged ? { ...rest, logoKey: staged } : rest });
    setSaving(false);
    if (res.success) {
      setStaged(undefined);
      showAlert(staged ? "Organiser logo updated." : "Organiser logo restored to default.", "success");
    } else {
      showAlert(res.message || "The logo could not be saved. Please try again.", "error");
    }
  };

  return (
    <div className="w-full min-h-full bg-white">
      <PageHeader title="Logo Settings" />
      <div className="px-4 sm:px-6 pt-8 pb-24 w-full space-y-5">
        <h2 className="text-base font-medium text-[#15191C]">Organiser Logo</h2>

        <section className="border border-[#D2D2D2] rounded-lg px-5 pt-5 pb-[25px] flex flex-col gap-3.5" aria-label="Organiser logo">
          <p className="flex items-start gap-1 px-2 text-xs font-medium text-[#6B6B6B]">
            <Icon name="events/alert-grey" width={16} height={14} className="mt-px shrink-0" />
            <span>
              This logo will show up in the footer of your QR Invitation card as organizer logo.{" "}
              <button type="button" onClick={() => setPreviewOpen(true)} disabled={!shownUrl} className="text-[#C44200] underline cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
                Preview
              </button>
              .
            </span>
          </p>

          <input ref={input} type="file" accept={ACCEPTED} className="hidden" onChange={(e) => selectFile(e.target.files?.[0])} />
          <button
            type="button"
            disabled={uploading || saving}
            onClick={() => input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); selectFile(e.dataTransfer.files?.[0]); }}
            aria-label={shownUrl ? "Replace the organiser logo" : "Upload an organiser logo"}
            className={`relative w-full max-w-[541px] h-[109px] rounded-lg border p-4 flex items-center justify-center cursor-pointer disabled:cursor-wait ${
              dragOver ? "border-[#FF651D] bg-orange-50/40" : "border-[#D2D2D2] hover:bg-[#EEF3FF]"
            }`}
          >
            {uploading ? (
              <span className="text-xs font-medium text-[#15191C]/70">Uploading…</span>
            ) : shownUrl ? (
              <>
                <span className="relative block w-[240px] h-[50px] max-w-full">
                  <Image src={shownUrl} alt="Organiser logo" fill unoptimized sizes="240px" className="object-contain" />
                </span>
                <span className="absolute bottom-2 text-[10px] font-medium text-[#6B6B6B]">Click to replace and crop</span>
              </>
            ) : (
              <span className="text-xs font-medium text-[#15191C]/70">Choose a photo to edit and crop, or drag and drop it here</span>
            )}
          </button>

          <div className="space-y-1 text-xs font-medium">
            <p className="text-[#6B6B6B]">Best Image Dimension: 240x50. Only JPG &amp; PNG allowed. Select or drag a photo to crop and reposition before upload.</p>
            <p className="text-[#6B6B6B]">
              Organizer Logo:{" "}
              <button type="button" onClick={() => { setStaged(null); }} disabled={!shownKey || saving} className="text-[#C44200] underline cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
                Reset to default
              </button>
            </p>
          </div>

          <div className="pt-3">
            <button type="button" onClick={save} disabled={!dirty || saving || uploading} className="h-[46px] px-6 rounded-lg bg-[#C65318] hover:bg-[#A83800] text-base font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? "Updating…" : "Update"}
            </button>
          </div>
        </section>

        <OrganisationDetailsForm />
      </div>

      {previewOpen && shownUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="logo-preview-title" onClick={() => setPreviewOpen(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-sm space-y-4 overflow-y-auto max-h-[calc(100dvh-2rem)] relative" onClick={(e) => e.stopPropagation()}>
            <ModalClose onClick={() => setPreviewOpen(false)} />
            <h3 id="logo-preview-title" className="pr-8 text-base font-medium text-[#15191C]">Organiser logo preview</h3>
            <div className="border border-[#E0E0E0] rounded-md py-6 flex justify-center bg-[#FAFAFA]">
              <span className="relative block w-[240px] h-[50px]">
                <Image src={shownUrl} alt="Organiser logo at its 240×50 size" fill unoptimized sizes="240px" className="object-contain" />
              </span>
            </div>
            <p className="text-xs text-[#6B6B6B]">Shown at the 240×50 size it is meant for.{dirty ? " Not saved yet — select Update to keep it." : ""}</p>
          </div>
        </div>
      )}

      {cropSelection && (
        <LogoCropDialog
          key={cropSelection.source}
          file={cropSelection.file}
          source={cropSelection.source}
          onClose={() => setCropSelection(null)}
          onCrop={uploadCropped}
        />
      )}
    </div>
  );
}
