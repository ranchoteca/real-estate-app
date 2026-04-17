import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { supabaseAdmin } from '@/lib/supabase';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      try {
        if (account?.provider === 'google') {
          console.log('🔍 Checking agent:', user.email);

          // Verificar si agente existe
          const { data: existingAgent, error: fetchError } = await supabaseAdmin
            .from('agents')
            .select('*')
            .eq('email', user.email!)
            .maybeSingle();

          if (fetchError) {
            console.error('❌ Error fetching agent:', fetchError);
          }

          if (!existingAgent) {
            console.log('✨ Creating new agent for:', user.email);
            
            // Generar username único basado en email
            const baseUsername = user.email!.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            const randomSuffix = Math.random().toString(36).substring(2, 6);
            const username = `${baseUsername}${randomSuffix}`;
            
            const { data: newAgent, error: insertError } = await supabaseAdmin
              .from('agents')
              .insert({
                email: user.email!,
                name: user.name || '',
                google_id: account.providerAccountId,
                username: username,
                plan: 'free',
              })
              .select()
              .single();

            if (insertError) {
              console.error('❌ Error creating agent:', insertError);
              console.error('Full error:', JSON.stringify(insertError, null, 2));
            } else {
              console.log('✅ Agent created successfully:', newAgent?.email);
            }
          } else {
            console.log('✅ Agent already exists:', existingAgent.email);
          }
        }
        return true;
      } catch (error) {
        console.error('❌ SignIn callback error:', error);
        return true; // Permitir login aunque falle Supabase
      }
    },
    async session({ session, token }) {
      try {
        if (session?.user?.email) {
          await supabaseAdmin
            .from('agents')
            .update({ last_active_at: new Date().toISOString() })
            .eq('email', session.user.email);
          const { data: dbAgent, error } = await supabaseAdmin
            .from('agents')
            .select('id, plan, role, expires_at, username, full_name, phone, brokerage')
            .eq('email', session.user.email)
            .single();
          
          if (error) {
            console.error('❌ Error fetching session agent:', error);
            session.user.id = 'temp-id';
            session.user.plan = 'free';
          } else if (dbAgent) {
            session.user.id = dbAgent.id;
            session.user.plan = dbAgent.plan || 'free';
            session.user.role = dbAgent.role || 'agent';
            session.user.expires_at = dbAgent.expires_at || null;
            session.user.username = dbAgent.username;
            session.user.fullName = dbAgent.full_name;
            session.user.phone = dbAgent.phone;
            session.user.brokerage = dbAgent.brokerage;

            const { count } = await supabaseAdmin
              .from('properties')
              .select('*', { count: 'exact', head: true })
              .eq('agent_id', dbAgent.id);

            session.user.totalProperties = count || 0;
          }
        }
        return session;
      } catch (error) {
        console.error('❌ Session callback error:', error);
        return session;
      }
    },
  },
  pages: {
    signIn: '/login',
  },
  debug: true,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };