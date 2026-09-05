export interface PasswordResetEmailInput {
  userName: string | null
  resetUrl: string
  expiresInMinutes: number
}

export interface EmailVerificationEmailInput {
  userName: string | null
  verificationUrl: string
  expiresInMinutes: number
}

export function formatExpiration(minutes: number) {
  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60
    return `${hours} ${hours === 1 ? "hora" : "horas"}`
  }

  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`
}

export function emailVerificationTemplate({
  userName,
  verificationUrl,
  expiresInMinutes,
}: EmailVerificationEmailInput): string {
  const greeting = userName ? `Olá, ${userName}` : "Olá"

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0"><tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
      <tr><td style="background:#134E4A;padding:24px 32px"><span style="font-size:20px;font-weight:800;color:#fff">Finly</span></td></tr>
      <tr><td style="padding:32px">
        <h1 style="font-size:20px;font-weight:700;color:#18181b;margin:0 0 16px">Confirme seu e-mail</h1>
        <p style="font-size:15px;line-height:1.6;color:#3f3f46;margin:0 0 24px">${greeting},</p>
        <p style="font-size:15px;line-height:1.6;color:#3f3f46;margin:0 0 24px">Para ativar sua conta Finly, confirme que este e-mail é seu.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px"><tr><td align="center"><a href="${verificationUrl}" style="display:inline-block;background:#134E4A;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px">Confirmar meu e-mail</a></td></tr></table>
        <p style="font-size:13px;line-height:1.6;color:#71717a;margin:0 0 16px">Ou copie e cole este link no navegador:<br><span style="word-break:break-all;color:#134E4A">${verificationUrl}</span></p>
        <p style="font-size:13px;line-height:1.6;color:#71717a;margin:0 0 32px">Este link expira em <strong>${formatExpiration(expiresInMinutes)}</strong>.</p>
        <hr style="border:0;border-top:1px solid #e4e4e7;margin:0 0 24px">
        <p style="font-size:13px;line-height:1.6;color:#a1a1aa;margin:0">Se você não criou uma conta Finly, pode ignorar este e-mail.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body>
</html>`
}

export function passwordResetTemplate({
  userName,
  resetUrl,
  expiresInMinutes,
}: PasswordResetEmailInput): string {
  const greeting = userName ? `Olá, ${userName}` : "Olá"

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:#134E4A;padding:24px 32px">
            <span style="font-size:20px;font-weight:800;color:#fff">Finly</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <h1 style="font-size:20px;font-weight:700;color:#18181b;margin:0 0 16px">Recuperação de senha</h1>
            <p style="font-size:15px;line-height:1.6;color:#3f3f46;margin:0 0 24px">${greeting},</p>
            <p style="font-size:15px;line-height:1.6;color:#3f3f46;margin:0 0 24px">
              Recebemos uma solicitação para redefinir a senha da sua conta Finly. Clique no botão abaixo para criar uma nova senha.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
              <tr><td align="center">
                <a href="${resetUrl}" style="display:inline-block;background:#134E4A;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px">Redefinir minha senha</a>
              </td></tr>
            </table>
            <p style="font-size:13px;line-height:1.6;color:#71717a;margin:0 0 16px">
              Ou copie e cole este link no seu navegador:<br>
              <span style="word-break:break-all;color:#134E4A">${resetUrl}</span>
            </p>
            <p style="font-size:13px;line-height:1.6;color:#71717a;margin:0 0 32px">
              ⏳ Este link expira em <strong>${formatExpiration(expiresInMinutes)}</strong>.
            </p>
            <hr style="border:0;border-top:1px solid #e4e4e7;margin:0 0 24px">
            <p style="font-size:13px;line-height:1.6;color:#a1a1aa;margin:0">
              Se você não solicitou a redefinição de senha, pode ignorar este email. Sua senha permanece inalterada.
            </p>
          </td>
        </tr>
      </table>
      <p style="font-size:12px;color:#a1a1aa;margin-top:16px;text-align:center">
        Finly · Gerencie suas finanças com inteligência
      </p>
    </td></tr>
  </table>
</body>
</html>`
}
