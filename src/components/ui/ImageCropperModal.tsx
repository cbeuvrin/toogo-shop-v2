import React, { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { getCroppedImg, CropArea } from "@/utils/cropImage";

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  aspectRatio: number; // e.g., 8/3 for banners, 1 for square
  onCropComplete: (croppedBlob: Blob) => void;
  title?: string;
}

export const ImageCropperModal = ({
  isOpen,
  onClose,
  imageSrc,
  aspectRatio,
  onCropComplete,
  title = "Recortar Imagen",
}: ImageCropperModalProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((zoomValue: number) => {
    setZoom(zoomValue);
  }, []);

  const onCropCompleteCallback = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleApplyCrop = async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedBlob);
      resetState();
      onClose();
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Get aspect ratio label for display
  const getAspectRatioLabel = () => {
    if (aspectRatio === 1) return "1:1 (Cuadrado)";
    if (Math.abs(aspectRatio - 8 / 3) < 0.01) return "8:3 (Banner)";
    if (Math.abs(aspectRatio - 16 / 9) < 0.01) return "16:9";
    return `${aspectRatio.toFixed(2)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] rounded-[30px] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center justify-between">
            {title}
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded">
              {getAspectRatioLabel()}
            </span>
          </DialogTitle>
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        <div className="px-4">
          {/* Cropper Container */}
          <div className="relative w-full h-[50vh] bg-muted rounded-lg overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropCompleteCallback}
              showGrid={true}
              style={{
                containerStyle: {
                  borderRadius: "8px",
                },
              }}
            />
          </div>

          {/* Controls */}
          <div className="mt-4 space-y-4">
            {/* Zoom Control */}
            <div className="flex items-center gap-4">
              <ZoomOut className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Slider
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0])}
                min={1}
                max={3}
                step={0.1}
                className="flex-1"
              />
              <ZoomIn className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground w-12 text-right">
                {zoom.toFixed(1)}x
              </span>
            </div>

            {/* Reset Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="w-full"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Restablecer posición
            </Button>

            {/* Help Text */}
            <p className="text-xs text-muted-foreground text-center">
              Arrastra la imagen para centrarla. Usa el slider para hacer zoom.
            </p>
          </div>
        </div>

        <DialogFooter className="p-4 pt-2 gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 rounded-[30px]"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleApplyCrop}
            disabled={isProcessing || !croppedAreaPixels}
            className="flex-1 rounded-[30px]"
          >
            {isProcessing ? "Procesando..." : "Aplicar Recorte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
