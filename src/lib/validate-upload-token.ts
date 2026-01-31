import { supabaseAdmin } from '@/lib/supabase';

export async function validateUploadToken(token: string): Promise<{ valid: boolean; agentId?: string; error?: string }> {
  try {
    // Buscar token
    const { data: uploadToken, error } = await supabaseAdmin
      .from('upload_tokens')
      .select('agent_id, expires_at, is_active, used_count, max_uses')
      .eq('token', token)
      .single();

    if (error || !uploadToken) {
      return { valid: false, error: 'Token inválido' };
    }

    // Verificar si está activo
    if (!uploadToken.is_active) {
      return { valid: false, error: 'Token revocado' };
    }

    // Verificar expiración
    if (new Date(uploadToken.expires_at) < new Date()) {
      return { valid: false, error: 'Token expirado' };
    }

    // Verificar límite de usos
    if (uploadToken.used_count >= uploadToken.max_uses) {
      return { valid: false, error: 'Token alcanzó límite de usos' };
    }

    // Incrementar contador de uso
    await supabaseAdmin
      .from('upload_tokens')
      .update({ used_count: uploadToken.used_count + 1 })
      .eq('token', token);

    return { 
      valid: true, 
      agentId: uploadToken.agent_id 
    };

  } catch (error) {
    console.error('Error validando token:', error);
    return { valid: false, error: 'Error del servidor' };
  }
}