// Configuración para logo en esquina
export interface CornerLogoConfig {
  logoUrl: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size: 'small' | 'medium' | 'large';
}

// Configuración para watermark centrado
export interface CenterWatermarkConfig {
  logoUrl: string;
  opacity: number;  // 0-100
  scale: number;    // 30-70
}

// Configuración completa (para PhotoUploader)
export interface WatermarkConfig {
  // Logo en esquina
  useCornerLogo: boolean;
  cornerLogoUrl: string | null;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size: 'small' | 'medium' | 'large';
  
  // Watermark centrado
  useWatermark: boolean;
  watermarkUrl: string | null;
  opacity: number;
  scale: number;
}

const CORNER_LOGO_SIZES = {
  small: 0.08,   // 8% del ancho de la imagen
  medium: 0.12,  // 12%
  large: 0.18,   // 18%
};

const LOGO_PADDING = 20; // pixels

// Función 1: Aplicar logo en esquina
export async function applyCornerLogo(
  imageFile: File,
  config: CornerLogoConfig
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas not supported'));
      return;
    }

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Dibujar imagen original
      ctx.drawImage(img, 0, 0);

      const logo = new Image();
      logo.crossOrigin = 'anonymous';
      
      logo.onload = () => {
        const logoSize = img.width * CORNER_LOGO_SIZES[config.size];
        const logoAspectRatio = logo.width / logo.height;
        const logoWidth = logoSize;
        const logoHeight = logoSize / logoAspectRatio;

        let x = LOGO_PADDING;
        let y = LOGO_PADDING;

        switch (config.position) {
          case 'top-left':
            x = LOGO_PADDING;
            y = LOGO_PADDING;
            break;
          case 'top-right':
            x = img.width - logoWidth - LOGO_PADDING;
            y = LOGO_PADDING;
            break;
          case 'bottom-left':
            x = LOGO_PADDING;
            y = img.height - logoHeight - LOGO_PADDING;
            break;
          case 'bottom-right':
            x = img.width - logoWidth - LOGO_PADDING;
            y = img.height - logoHeight - LOGO_PADDING;
            break;
        }

        ctx.drawImage(logo, x, y, logoWidth, logoHeight);

        canvas.toBlob((blob) => {
          if (blob) {
            const result = new File([blob], imageFile.name, {
              type: 'image/jpeg',
            });
            resolve(result);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/jpeg', 0.92);
      };

      logo.onerror = () => reject(new Error('Failed to load corner logo'));
      logo.src = config.logoUrl;
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(imageFile);
  });
}

// Función 2: Aplicar watermark centrado con opacidad
export async function applyCenterWatermark(
  imageFile: File,
  config: CenterWatermarkConfig
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas not supported'));
      return;
    }

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Dibujar imagen original
      ctx.drawImage(img, 0, 0);

      const logo = new Image();
      logo.crossOrigin = 'anonymous';
      
      logo.onload = () => {
        // Calcular tamaño del watermark
        const logoWidth = img.width * (config.scale / 100);
        const logoHeight = logoWidth * (logo.height / logo.width);

        // Centrar
        const x = (img.width - logoWidth) / 2;
        const y = (img.height - logoHeight) / 2;

        // Aplicar opacidad
        ctx.globalAlpha = config.opacity / 100;

        // Dibujar watermark
        ctx.drawImage(logo, x, y, logoWidth, logoHeight);

        // Restaurar opacidad
        ctx.globalAlpha = 1.0;

        canvas.toBlob((blob) => {
          if (blob) {
            const result = new File([blob], imageFile.name, {
              type: 'image/jpeg',
            });
            resolve(result);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/jpeg', 0.92);
      };

      logo.onerror = () => reject(new Error('Failed to load watermark'));
      logo.src = config.logoUrl;
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(imageFile);
  });
}

// Función 3: Aplicar texto por defecto (cuando no hay logo ni watermark)
export async function applyDefaultText(imageFile: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas not supported'));
      return;
    }

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Dibujar imagen original
      ctx.drawImage(img, 0, 0);

      // Configurar texto
      const fontSize = img.width * 0.05;
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = fontSize * 0.05;

      const text = 'FlowEstate AI';
      const x = LOGO_PADDING;
      const y = img.height - LOGO_PADDING;

      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);

      canvas.toBlob((blob) => {
        if (blob) {
          const result = new File([blob], imageFile.name, {
            type: 'image/jpeg',
          });
          resolve(result);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/jpeg', 0.92);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(imageFile);
  });
}