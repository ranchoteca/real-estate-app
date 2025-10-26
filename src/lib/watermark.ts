export interface WatermarkConfig {
  logoUrl: string | null;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size: 'small' | 'medium' | 'large';
}

const WATERMARK_SIZES = {
  small: 0.08,   // 8% del ancho de la imagen
  medium: 0.12,  // 12%
  large: 0.18,   // 18%
};

const WATERMARK_PADDING = 20; // pixels

export async function applyWatermark(
  imageFile: File,
  config: WatermarkConfig
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas not supported'));
      return;
    }

    img.onload = async () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Dibujar imagen original
      ctx.drawImage(img, 0, 0);

      if (config.logoUrl) {
        // Usar logo personalizado
        const logo = new Image();
        logo.crossOrigin = 'anonymous';
        
        logo.onload = () => {
          const logoSize = img.width * WATERMARK_SIZES[config.size];
          const logoAspectRatio = logo.width / logo.height;
          const logoWidth = logoSize;
          const logoHeight = logoSize / logoAspectRatio;

          let x = WATERMARK_PADDING;
          let y = WATERMARK_PADDING;

          switch (config.position) {
            case 'top-left':
              x = WATERMARK_PADDING;
              y = WATERMARK_PADDING;
              break;
            case 'top-right':
              x = img.width - logoWidth - WATERMARK_PADDING;
              y = WATERMARK_PADDING;
              break;
            case 'bottom-left':
              x = WATERMARK_PADDING;
              y = img.height - logoHeight - WATERMARK_PADDING;
              break;
            case 'bottom-right':
              x = img.width - logoWidth - WATERMARK_PADDING;
              y = img.height - logoHeight - WATERMARK_PADDING;
              break;
          }

          ctx.drawImage(logo, x, y, logoWidth, logoHeight);

          canvas.toBlob((blob) => {
            if (blob) {
              const watermarkedFile = new File([blob], imageFile.name, {
                type: 'image/jpeg',
              });
              resolve(watermarkedFile);
            } else {
              reject(new Error('Failed to create blob'));
            }
          }, 'image/jpeg', 0.92);
        };

        logo.onerror = () => reject(new Error('Failed to load logo'));
        logo.src = config.logoUrl;
      } else {
        // Usar texto "RealFlow AI" como watermark
        const fontSize = img.width * WATERMARK_SIZES[config.size] * 0.4;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = fontSize * 0.05;

        const text = 'FlowEstate AI';
        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = fontSize;

        // Siempre bottom-left para texto por defecto
        const x = WATERMARK_PADDING;
        const y = img.height - WATERMARK_PADDING;

        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);

        canvas.toBlob((blob) => {
          if (blob) {
            const watermarkedFile = new File([blob], imageFile.name, {
              type: 'image/jpeg',
            });
            resolve(watermarkedFile);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/jpeg', 0.92);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(imageFile);
  });
}