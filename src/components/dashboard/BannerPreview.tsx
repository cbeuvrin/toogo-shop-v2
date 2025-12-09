import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, Tablet, Smartphone } from "lucide-react";

interface BannerPreviewProps {
  banner: {
    id: string;
    url: string;
  };
}

export const BannerPreview = ({ banner }: BannerPreviewProps) => {
  const [selectedDevice, setSelectedDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const getDeviceClasses = () => {
    switch (selectedDevice) {
      case "desktop":
        return "w-full aspect-[8/3]";
      case "tablet":
        return "w-[600px] aspect-[16/10] mx-auto";
      case "mobile":
        return "w-[300px] aspect-[16/9] mx-auto";
      default:
        return "w-full aspect-[8/3]";
    }
  };

  return (
    <div className="space-y-6">
      {/* Device Selector */}
      <div className="flex justify-center gap-2">
        <Button
          variant={selectedDevice === "desktop" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedDevice("desktop")}
          className="rounded-[30px]"
        >
          <Monitor className="w-4 h-4 mr-2" />
          Desktop
        </Button>
        <Button
          variant={selectedDevice === "tablet" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedDevice("tablet")}
          className="rounded-[30px]"
        >
          <Tablet className="w-4 h-4 mr-2" />
          Tablet
        </Button>
        <Button
          variant={selectedDevice === "mobile" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedDevice("mobile")}
          className="rounded-[30px]"
        >
          <Smartphone className="w-4 h-4 mr-2" />
          Móvil
        </Button>
      </div>

      {/* Banner Preview */}
      <div className="flex justify-center">
        <div className={`${getDeviceClasses()} relative overflow-hidden rounded-lg shadow-lg`}>
          <div
            className="w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: `url(${banner.url})`,
            }}
          />
        </div>
      </div>

      {/* Device Info */}
      <div className="text-center text-sm text-muted-foreground">
        Vista previa del banner en {selectedDevice === "desktop" ? "escritorio" : selectedDevice === "tablet" ? "tablet" : "móvil"}
      </div>
    </div>
  );
};