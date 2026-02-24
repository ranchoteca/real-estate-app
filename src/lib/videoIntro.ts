export async function generateVideoIntro(
  logoUrl: string,
  durationSeconds: number = 3
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    // Fondo con gradiente
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#3B82F6'); // Azul
    gradient.addColorStop(1, '#8B5CF6'); // Morado
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cargar logo
    const logo = new Image();
    logo.crossOrigin = 'anonymous';
    
    logo.onload = () => {
      // Calcular dimensiones para centrar el logo
      const maxLogoWidth = canvas.width * 0.4;
      const maxLogoHeight = canvas.height * 0.4;
      
      let logoWidth = logo.width;
      let logoHeight = logo.height;
      
      // Escalar manteniendo aspecto
      if (logoWidth > maxLogoWidth) {
        logoHeight = (maxLogoWidth / logoWidth) * logoHeight;
        logoWidth = maxLogoWidth;
      }
      
      if (logoHeight > maxLogoHeight) {
        logoWidth = (maxLogoHeight / logoHeight) * logoWidth;
        logoHeight = maxLogoHeight;
      }
      
      const x = (canvas.width - logoWidth) / 2;
      const y = (canvas.height - logoHeight) / 2;
      
      ctx.drawImage(logo, x, y, logoWidth, logoHeight);
      
      // Grabar canvas como video
      const stream = canvas.captureStream(30); // 30 FPS
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });
      
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };
      
      mediaRecorder.start();
      
      // Detener después de N segundos
      setTimeout(() => {
        mediaRecorder.stop();
      }, durationSeconds * 1000);
    };
    
    logo.onerror = () => {
      reject(new Error('Failed to load logo'));
    };
    
    logo.src = logoUrl;
  });
}

export async function generateOutroVideo(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    // Fondo blanco
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Texto "FlowEstateAI"
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 120px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FlowEstateAI', canvas.width / 2, canvas.height / 2 - 50);
    
    // Subtexto
    ctx.font = '48px system-ui';
    ctx.fillStyle = '#64748B';
    ctx.fillText('Powered by AI', canvas.width / 2, canvas.height / 2 + 80);
    
    // Grabar
    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
    });
    
    const chunks: Blob[] = [];
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve(blob);
    };
    
    mediaRecorder.start();
    
    setTimeout(() => {
      mediaRecorder.stop();
    }, 3000); // 3 segundos
  });
}