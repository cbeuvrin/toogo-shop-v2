import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Checkbox } from './checkbox';
import { Input } from './input';
import { Label } from './label';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { toast } from 'sonner';
import { Upload, Sparkles, RotateCcw, Zap, Bot, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageProcessorProps {
  onImageProcessed: (file: File) => void;
  initialImage?: string;
  className?: string;
}

export const ImageProcessor: React.FC<ImageProcessorProps> = ({ onImageProcessed, initialImage, className }) => {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string>(initialImage || '');
  const [processedPreview, setProcessedPreview] = useState<string>('');
  const [removeBackground, setRemoveBackground] = useState(false);
  const [addWhiteBackground, setAddWhiteBackground] = useState(false);
  const [addShadow, setAddShadow] = useState(false);
  const [method, setMethod] = useState<'local' | 'removebg' | 'gemini'>('gemini');
  const [apiKey, setApiKey] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const { processImage, isProcessing } = useImageProcessor();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setOriginalFile(file);
      setOriginalPreview(URL.createObjectURL(file));
      setProcessedPreview('');
    }
  };

  const handleProcess = async () => {
    if (!originalFile) return;

    if (method === 'removebg' && removeBackground && !apiKey) {
      toast.error('Se requiere API key para Remove.bg');
      return;
    }

    try {
      const processedBlob = await processImage(originalFile, {
        removeBackground,
        addWhiteBackground,
        addShadow,
        method,
        apiKey: method === 'removebg' ? apiKey : undefined,
        customPrompt: method === 'gemini' ? customPrompt : undefined,
      });

      const processedFile = new File([processedBlob], originalFile.name, {
        type: 'image/png',
        lastModified: Date.now(),
      });

      const processedUrl = URL.createObjectURL(processedBlob);
      setProcessedPreview(processedUrl);
      
      onImageProcessed(processedFile);
      toast.success(`Imagen procesada exitosamente con ${method === 'removebg' ? 'Remove.bg API' : 'IA Local'}`);
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error(`Error al procesar la imagen: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleReset = () => {
    setOriginalFile(null);
    setOriginalPreview(initialImage || '');
    setProcessedPreview('');
    setRemoveBackground(false);
    setAddWhiteBackground(false);
    setAddShadow(false);
    setMethod('local');
    setApiKey('');
  };

  return (
    <div className={cn("w-full max-w-4xl mx-auto", className)}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Background Remover
          </CardTitle>
          <p className="text-muted-foreground">
            Professional background removal for product photos
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => document.getElementById('image-upload')?.click()}
              className="h-20 border-dashed"
            >
              <Upload className="h-6 w-6 mr-2" />
              {originalFile ? 'Cambiar Imagen' : 'Subir Imagen'}
            </Button>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {originalFile && (
            <div className="space-y-6">
              {/* Method Selection */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Processing Method</Label>
                <RadioGroup
                  value={method}
                  onValueChange={(value: 'local' | 'removebg' | 'gemini') => setMethod(value)}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="gemini" id="gemini" className="mt-1" />
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="gemini" className="font-medium text-primary cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Gemini AI (Recommended)
                        </div>
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        🌟 Superior quality • Custom prompts • Best for e-commerce
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="removebg" id="removebg" className="mt-1" />
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="removebg" className="font-medium cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Remove.bg API
                        </div>
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        ✨ Professional quality • 50 free images/month
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="local" id="local" className="mt-1" />
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="local" className="font-medium cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4" />
                          Local AI (Experimental)
                        </div>
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        ⚠️ Free • Lower quality • Testing only
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Custom Prompt for Gemini */}
              {method === 'gemini' && (
                <div className="space-y-3">
                  <Label htmlFor="custom-prompt" className="text-base font-medium">Custom Prompt (Optional)</Label>
                  <div className="space-y-2">
                    <textarea
                      id="custom-prompt"
                      placeholder="e.g., Remove background, add clean white backdrop with subtle shadow for product photography"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      className="w-full p-3 border rounded-lg bg-background min-h-[80px] resize-none"
                    />
                    <p className="text-sm text-muted-foreground">
                      Gemini AI provides superior quality with natural language instructions. Leave empty for default prompt.
                    </p>
                  </div>
                </div>
              )}

              {/* API Key Input for Remove.bg */}
              {method === 'removebg' && (
                <div className="space-y-3">
                  <Label htmlFor="api-key" className="text-base font-medium">Remove.bg API Key</Label>
                  <div className="space-y-2">
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="Enter your Remove.bg API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className={cn(
                        "transition-colors",
                        apiKey ? "border-green-500 focus:border-green-600" : ""
                      )}
                    />
                    <div className="flex items-center justify-between text-sm">
                      <p className="text-muted-foreground">
                        Get your free API key at{" "}
                        <a 
                          href="https://www.remove.bg/users/sign_up" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-primary hover:underline font-medium"
                        >
                          remove.bg
                        </a>
                      </p>
                      {apiKey && (
                        <div className="flex items-center gap-1 text-green-600 text-xs">
                          <CheckCircle className="h-3 w-3" />
                          API Key entered
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Processing Options */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remove-bg"
                    checked={removeBackground}
                    onCheckedChange={(checked) => setRemoveBackground(checked === true)}
                  />
                  <label htmlFor="remove-bg" className="text-sm">
                    Remover fondo
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="white-bg"
                    checked={addWhiteBackground}
                    onCheckedChange={(checked) => setAddWhiteBackground(checked === true)}
                  />
                  <label htmlFor="white-bg" className="text-sm">
                    Agregar fondo blanco
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="add-shadow"
                    checked={addShadow}
                    onCheckedChange={(checked) => setAddShadow(checked === true)}
                  />
                  <label htmlFor="add-shadow" className="text-sm">
                    Agregar sombra
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button 
                  onClick={handleProcess} 
                  disabled={isProcessing || (method === 'removebg' && removeBackground && !apiKey)}
                  className="flex-1"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Remove Background
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleReset}
                  disabled={isProcessing}
                  size="lg"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              {/* Warning for local AI */}
              {method === 'local' && removeBackground && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-800">
                      Local AI Quality Notice
                    </p>
                    <p className="text-sm text-amber-700">
                      Local AI provides basic background removal but may have rough edges. 
                      For professional e-commerce photos, we recommend using Remove.bg API.
                    </p>
                  </div>
                </div>
              )}

              {/* Enhanced Preview Images */}
              <div className="space-y-4">
                {(originalPreview || processedPreview) && (
                  <>
                    <h3 className="text-lg font-medium">Preview Comparison</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {originalPreview && (
                        <div className="space-y-3">
                          <Label className="flex items-center gap-2 text-base">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            Original Image
                            {originalFile && (
                              <span className="text-xs text-muted-foreground font-normal">
                                ({Math.round(originalFile.size / 1024)}KB)
                              </span>
                            )}
                          </Label>
                          <div className="relative border rounded-lg p-4 bg-card">
                            <img
                              src={originalPreview}
                              alt="Original"
                              className="w-full h-auto max-h-80 object-contain rounded shadow-sm"
                            />
                          </div>
                        </div>
                      )}
                      
                      {processedPreview && (
                        <div className="space-y-3">
                          <Label className="flex items-center gap-2 text-base">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-green-600 font-medium">Processed Image</span>
                            <span className="text-xs text-muted-foreground font-normal">(PNG)</span>
                          </Label>
                          <div 
                            className="relative border rounded-lg p-4"
                            style={{
                              background: 'repeating-conic-gradient(#ffffff 0% 25%, #f0f0f0 0% 50%) 50% / 20px 20px'
                            }}
                          >
                            <img
                              src={processedPreview}
                              alt="Processed"
                              className="w-full h-auto max-h-80 object-contain rounded shadow-lg"
                            />
                          </div>
                          <p className="text-sm text-muted-foreground text-center">
                            ✨ Transparent background • Ready for e-commerce
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};