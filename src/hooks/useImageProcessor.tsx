import { useState, useCallback } from 'react';
import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = false;

const MAX_IMAGE_DIMENSION = 2048;

// Specialized models for background removal (ordered by quality)
const BACKGROUND_REMOVAL_MODELS = [
  'Xenova/rembg-u2net',
  'Xenova/rembg-u2netp', 
  'briaai/RMBG-1.4'
];

export interface ImageProcessingOptions {
  removeBackground?: boolean;
  addWhiteBackground?: boolean;
  addShadow?: boolean;
  method?: 'local' | 'removebg' | 'gemini';
  apiKey?: string;
  customPrompt?: string;
}

export const useImageProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [segmenter, setSegmenter] = useState<any>(null);

  const initializeBackgroundRemover = useCallback(async () => {
    try {
      console.log('Initializing specialized background removal model...');
      
      // Try each model in order of quality
      for (const modelName of BACKGROUND_REMOVAL_MODELS) {
        try {
          console.log(`Attempting to load: ${modelName}`);
          
          const segmenter = await pipeline('image-segmentation', modelName, {
            device: 'webgpu',
          });
          
          console.log(`Successfully loaded: ${modelName}`);
          return { segmenter, modelName };
        } catch (error) {
          console.log(`Failed to load ${modelName}, trying next...`);
          continue;
        }
      }
      
      throw new Error('All background removal models failed to load');
    } catch (error) {
      console.error('WebGPU failed, attempting CPU fallback...');
      // Fallback to CPU
      try {
        const segmenter = await pipeline('image-segmentation', BACKGROUND_REMOVAL_MODELS[1], {
          device: 'cpu',
        });
        return { segmenter, modelName: `${BACKGROUND_REMOVAL_MODELS[1]} (CPU)` };
      } catch (cpuError) {
        throw new Error('All background removal methods failed. Try using Remove.bg API.');
      }
    }
  }, []);

  const resizeImageIfNeeded = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, image: HTMLImageElement) => {
    let width = image.naturalWidth;
    let height = image.naturalHeight;

    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      if (width > height) {
        height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
        width = MAX_IMAGE_DIMENSION;
      } else {
        width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
        height = MAX_IMAGE_DIMENSION;
      }
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);
    return { width, height };
  }, []);

  const loadImage = useCallback((file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const addShadowEffect = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    // Create shadow effect
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = canvas.width + 20;
    shadowCanvas.height = canvas.height + 20;
    const shadowCtx = shadowCanvas.getContext('2d');
    
    if (!shadowCtx) return canvas;

    // Draw shadow
    shadowCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    shadowCtx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    shadowCtx.shadowBlur = 15;
    shadowCtx.shadowOffsetX = 0;
    shadowCtx.shadowOffsetY = 5;
    shadowCtx.fillRect(10, 10, canvas.width, canvas.height);

    // Draw original image on top
    shadowCtx.shadowColor = 'transparent';
    shadowCtx.drawImage(canvas, 10, 10);

    return shadowCanvas;
  }, []);

  const removeBackgroundWithAPI = useCallback(async (file: File, apiKey: string): Promise<Blob> => {
    if (!apiKey?.trim()) {
      throw new Error('API key is required for Remove.bg');
    }

    const formData = new FormData();
    formData.append('image_file', file);
    formData.append('size', 'auto');
    formData.append('format', 'png');
    
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = 'Remove.bg API error';
      try {
        const errorData = await response.json();
        errorMessage = errorData.errors?.[0]?.title || errorMessage;
      } catch {
        // If JSON parsing fails, use status-based messages
        if (response.status === 402) {
          errorMessage = 'Insufficient credits. Check your Remove.bg account.';
        } else if (response.status === 403) {
          errorMessage = 'Invalid API key. Please check your Remove.bg API key.';
        } else if (response.status === 400) {
          errorMessage = 'Invalid image format or size.';
        } else {
          errorMessage = `API error (${response.status})`;
        }
      }
      throw new Error(errorMessage);
    }

    return await response.blob();
  }, []);

  const removeBackgroundWithGemini = useCallback(async (file: File, customPrompt?: string): Promise<Blob> => {
    try {
      // Convert file to base64
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      const image = await loadImage(file);
      resizeImageIfNeeded(canvas, ctx, image);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      // Create prompt
      const prompt = customPrompt || "Remove the background from this product image and replace it with a clean white background. Make it professional for e-commerce.";
      
      const response = await fetch('https://herqxhfmsstbteahhxpr.supabase.co/functions/v1/gemini-image-processor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData,
          prompt
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Gemini processing failed: ${errorData}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Gemini processing failed');
      }
      
      // Convert base64 back to blob
      const base64Data = result.imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      return new Blob([bytes], { type: 'image/png' });
    } catch (error) {
      console.error('Gemini background removal failed:', error);
      throw error;
    }
  }, [loadImage, resizeImageIfNeeded]);

  const processImage = useCallback(async (file: File, options: ImageProcessingOptions = {}): Promise<Blob> => {
    setIsProcessing(true);
    
    try {
      let processedBlob: Blob;

      if (options.removeBackground && options.method === 'gemini') {
        // Use Gemini AI (recommended)
        console.log('Processing with Gemini AI...');
        processedBlob = await removeBackgroundWithGemini(file, options.customPrompt);
      } else if (options.removeBackground && options.method === 'removebg' && options.apiKey) {
        // Use Remove.bg API
        console.log('Processing with Remove.bg API...');
        processedBlob = await removeBackgroundWithAPI(file, options.apiKey);
      } else if (options.removeBackground) {
        // Use local AI processing
        console.log('Processing with local AI...');
        try {
          const image = await loadImage(file);
          const { segmenter, modelName } = await initializeBackgroundRemover();
          console.log(`Using model: ${modelName}`);
          
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) throw new Error('Could not get canvas context');

          const { width, height } = resizeImageIfNeeded(canvas, ctx, image);

          // Convert to high-quality base64
          const imageData = canvas.toDataURL('image/png', 1.0);
          
          const result = await segmenter(imageData);

          if (!result || !Array.isArray(result) || result.length === 0) {
            throw new Error('No segmentation result returned');
          }

          // Handle different model outputs
          let maskData = null;
          if (result[0].mask && result[0].mask.data) {
            maskData = result[0].mask.data;
          } else if (result[0].score && Array.isArray(result[0].score)) {
            maskData = result[0].score;
          } else {
            throw new Error('Could not extract mask from segmentation result');
          }

          // Apply mask with improved processing
          const outputImageData = ctx.getImageData(0, 0, width, height);
          const data = outputImageData.data;

          for (let i = 0; i < maskData.length; i++) {
            let alpha = maskData[i];
            
            // Different models have different outputs
            if (modelName.includes('rembg')) {
              // RMBG models: higher values = keep pixel
              alpha = Math.max(0, Math.min(1, alpha));
            } else {
              // Other models: invert mask
              alpha = Math.max(0, Math.min(1, 1 - alpha));
            }
            
            // Apply with edge smoothing
            data[i * 4 + 3] = Math.round(alpha * 255);
          }

          ctx.putImageData(outputImageData, 0, 0);
          
          processedBlob = await new Promise((resolve, reject) => {
            canvas.toBlob(
              (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')), 
              'image/png', 
              1.0
            );
          });
        } catch (error) {
          console.error('Local AI processing failed:', error);
          throw new Error(`Local AI failed: ${error.message}. Consider using Remove.bg API for better results.`);
        }
      } else {
        // No background removal
        processedBlob = file;
      }

      // Apply additional effects if needed
      if (options.addWhiteBackground || options.addShadow) {
        const image = await loadImage(new File([processedBlob], 'processed.png'));
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) throw new Error('Could not get canvas context');
        
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        ctx.drawImage(image, 0, 0);

        // Add white background if requested
        if (options.addWhiteBackground) {
          const backgroundCanvas = document.createElement('canvas');
          backgroundCanvas.width = canvas.width;
          backgroundCanvas.height = canvas.height;
          const backgroundCtx = backgroundCanvas.getContext('2d');
          
          if (backgroundCtx) {
            // Fill with white background
            backgroundCtx.fillStyle = '#ffffff';
            backgroundCtx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw the processed image on top
            backgroundCtx.drawImage(canvas, 0, 0);
            
            // Replace canvas with the one with white background
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(backgroundCanvas, 0, 0);
          }
        }

        // Add shadow if requested
        let finalCanvas = canvas;
        if (options.addShadow) {
          finalCanvas = addShadowEffect(canvas, ctx);
        }

        processedBlob = await new Promise((resolve, reject) => {
          finalCanvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to create blob'));
              }
            },
            'image/png',
            1.0
          );
        });
      }

      return processedBlob;
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [initializeBackgroundRemover, loadImage, resizeImageIfNeeded, addShadowEffect, removeBackgroundWithAPI, removeBackgroundWithGemini]);

  return {
    processImage,
    isProcessing,
  };
};