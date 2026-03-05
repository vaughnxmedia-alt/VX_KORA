import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ImagePlus, X, Loader2, Images } from "lucide-react";

interface GalleryUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  bucket?: string;
  maxImages?: number;
}

export const GalleryUploader = ({ 
  value = [], 
  onChange, 
  bucket = "blog-images",
  maxImages = 10
}: GalleryUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - value.length;
    if (files.length > remainingSlots) {
      toast({
        title: "Too many images",
        description: `You can only add ${remainingSlots} more image(s).`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith("image/")) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not an image file.`,
            variant: "destructive",
          });
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} is larger than 10MB.`,
            variant: "destructive",
          });
          continue;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `gallery/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      if (uploadedUrls.length > 0) {
        onChange([...value, ...uploadedUrls]);
        toast({
          title: "Images uploaded",
          description: `${uploadedUrls.length} image(s) uploaded successfully.`,
        });
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload images.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = (index: number) => {
    const newUrls = value.filter((_, i) => i !== index);
    onChange(newUrls);
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleUpload}
        className="hidden"
      />
      
      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {value.map((url, index) => (
            <div key={index} className="relative group aspect-square">
              <img
                src={url}
                alt={`Gallery ${index + 1}`}
                className="w-full h-full object-cover rounded-lg border"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemove(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      {value.length < maxImages && (
        <Button
          type="button"
          variant="outline"
          className="w-full h-20 border-dashed flex flex-col gap-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs">Uploading...</span>
            </>
          ) : (
            <>
              <Images className="h-5 w-5" />
              <span className="text-xs">Add Gallery Images ({value.length}/{maxImages})</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
};
