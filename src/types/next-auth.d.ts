import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      plan: string; // 'free' o 'pro'
      properties_this_month: number;
      username?: string | null;
      fullName?: string | null;
      phone?: string | null;
      brokerage?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  }
}