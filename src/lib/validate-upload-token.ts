import { supabaseAdmin } from '@/lib/supabase';

export async function validateUploadToken(token: string): Promise<{
  valid: boolean;
  agentId?: string;
  error?: string;
}> {
  try {
    // 1. Obtener token
    const { data: uploadToken, error: tokenError } = await supabaseAdmin
      .from('upload_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !uploadToken) {
      return { valid: false, error: 'Token no encontrado' };
    }

    // 2. Verificar si está activo
    if (!uploadToken.is_active) {
      return { valid: false, error: 'Token revocado' };
    }

    // 3. Verificar expiración
    if (new Date(uploadToken.expires_at) < new Date()) {
      return { valid: false, error: 'Token expirado' };
    }

    // 4. Verificar límite de usos
    if (uploadToken.used_count >= uploadToken.max_uses) {
      return { valid: false, error: 'Límite de usos alcanzado' };
    }

    // 5. ✅ INCREMENTAR CONTADOR
    const { error: updateError } = await supabaseAdmin
      .from('upload_tokens')
      .update({ used_count: uploadToken.used_count + 1 })
      .eq('token', token);

    if (updateError) {
      console.error('Error incrementando contador:', updateError);
    } else {
      console.log(`✅ Contador incrementado: ${uploadToken.used_count} → ${uploadToken.used_count + 1}`);
    }

    return {
      valid: true,
      agentId: uploadToken.agent_id,
    };

  } catch (error) {
    console.error('Error validating token:', error);
    return { valid: false, error: 'Error interno' };
  }
}