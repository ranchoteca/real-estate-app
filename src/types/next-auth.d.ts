import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      plan: string;
      role: string;
      expires_at: string | null;
      totalProperties: number;
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