export const FB_PIXEL_ID = '2349466858895095';

export const trackEvent = (eventName: string, options?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', eventName, options);
  }
};