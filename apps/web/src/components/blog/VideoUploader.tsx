import { useState, useRef } from "react";
import { uploadToS3, S3_VIDEO_FOLDERS } from "@/lib/s3Upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Video, Link, Upload, X, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface VideoUploaderProps {
  videoUrl: string;
  videoType: "embed" | "upload" | null;
  onVideoChange: (url: string, type: "embed" | "upload" | null) => void;
}

export const VideoUploader = ({ 
  videoUrl, 
  videoType, 
  onVideoChange 
}: VideoUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [embedUrl, setEmbedUrl] = useState(videoType === "embed" ? videoUrl : "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleEmbedChange = (url: string) => {
    setEmbedUrl(url);
    if (url.trim()) {
      // Validate YouTube or Vimeo URL
      const isYoutube = url.includes("youtube.com") || url.includes("youtu.be");
      const isVimeo = url.includes("vimeo.com");
      
      if (isYoutube || isVimeo) {
        onVideoChange(url, "embed");
      } else {
        toast({
          title: "Invalid URL",
          description: "Please enter a valid YouTube or Vimeo URL.",
          variant: "destructive",
        });
      }
    } else {
      onVideoChange("", null);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("video/") && file.type !== "video/mp4") {
      toast({
        title: "Invalid file type",
        description: "Please upload an MP4 video file.",
        variant: "destructive",
      });
      return;
    }

    // Same pipeline as content calendar: presigned PUT to AWS S3 (large files OK).
    const maxBytes = 800 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast({
        title: "File too large",
        description: "Please upload a video smaller than 800MB, or use a YouTube/Vimeo embed.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const publicUrl = await uploadToS3({
        file,
        folder: S3_VIDEO_FOLDERS.blog,
        fileType: "video",
      });

      onVideoChange(publicUrl, "upload");
      toast({
        title: "Video uploaded",
        description: "Your video has been uploaded successfully.",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload video.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    setEmbedUrl("");
    onVideoChange("", null);
  };

  const getEmbedPreview = (url: string) => {
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\s]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    
    return null;
  };

  return (
    <div className="space-y-3">
      <Tabs defaultValue={videoType === "upload" ? "upload" : "embed"} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="embed" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Embed Link
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Video
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="embed" className="space-y-3 mt-4">
          <div className="space-y-2">
            <Label htmlFor="embed_url">YouTube or Vimeo URL</Label>
            <Input
              id="embed_url"
              placeholder="https://youtube.com/watch?v=..."
              value={embedUrl}
              onChange={(e) => handleEmbedChange(e.target.value)}
            />
          </div>
          
          {videoType === "embed" && videoUrl && getEmbedPreview(videoUrl) && (
            <div className="relative">
              <div className="aspect-video rounded-lg overflow-hidden border">
                <iframe
                  src={getEmbedPreview(videoUrl)!}
                  className="w-full h-full"
                  allowFullScreen
                  title="Video preview"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="upload" className="space-y-3 mt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/*"
            onChange={handleUpload}
            className="hidden"
          />
          
          {videoType === "upload" && videoUrl ? (
            <div className="relative">
              <video
                src={videoUrl}
                controls
                className="w-full aspect-video rounded-lg border"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full h-32 border-dashed flex flex-col gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-sm">Uploading...</span>
                </>
              ) : (
                <>
                  <Video className="h-6 w-6" />
                  <span className="text-sm">Upload video to AWS S3 (max 800MB)</span>
                </>
              )}
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
