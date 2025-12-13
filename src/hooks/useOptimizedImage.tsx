import { useMemo } from 'react';

interface UseOptimizedImageOptions {
    width?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
}

export const useOptimizedImage = (url: string | undefined | null, options: UseOptimizedImageOptions = {}) => {
    const { width = 500, quality = 80, format = 'webp' } = options;

    const optimizedUrl = useMemo(() => {
        if (!url) return '/placeholder.svg';

        // Check if it's a Supabase Storage URL
        if (url.includes('supabase.co/storage/v1/object/public')) {
            // If it already has query params, append; otherwise add ?
            const separator = url.includes('?') ? '&' : '?';

            // Supabase Image Transformations (Simulated/Standard)
            // Note: This requires Supabase Image Transformations to be enabled on the project
            // If not enabled, these params might be ignored but won't break anything.
            return `${url}${separator}width=${width}&format=${format}&quality=${quality}`;
        }

        return url;
    }, [url, width, quality, format]);

    return optimizedUrl;
};
