import DragDropUpload from "@/components/ui/DragDropUpload";

export function DeliveryProofTab() {
  const handleFiles = (files: FileList) => {
    console.log(files);
  };
  return (
    <div className="space-y-4 min-h-[60vh]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-[#181d27]">
          Submitted Proofs
        </p>
        <span className="text-xs text-[#9DA4AE]">No proofs submitted yet</span>
      </div>
      <DragDropUpload
        onFilesSelect={handleFiles}
        accept="image/*,.pdf,.zip"
        title="UPLOAD DELIVERY PROOF"
        description="Upload screenshots, reports, or source files."
        maxSizeText="Up to 100 MB"
      />
    </div>
  );
}
