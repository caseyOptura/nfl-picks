import type { H3Event } from 'h3'

interface InvitationEmailParams {
  to: string
  leagueName: string
  inviteUrl: string
  inviterName: string
}

export async function sendInvitationEmail(event: H3Event, params: InvitationEmailParams): Promise<void> {
  const config = useRuntimeConfig(event)
  const { to, leagueName, inviteUrl, inviterName } = params

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0a0a0a;color:#f0f0f0;padding:32px;border-radius:8px;">
      <h1 style="font-size:1.4rem;font-weight:700;margin:0 0 16px;">You're invited to join a league</h1>
      <p style="color:#ccc;margin:0 0 8px;"><strong style="color:#f0f0f0">${inviterName}</strong> invited you to join <strong style="color:#f0f0f0">${leagueName}</strong> on NFL Picks.</p>
      <p style="color:#999;margin:0 0 24px;">Make your picks, compete with friends, and climb the leaderboard all season long.</p>
      <a href="${inviteUrl}" style="display:inline-block;background:#fff;color:#0a0a0a;font-weight:700;padding:12px 24px;border-radius:6px;text-decoration:none;">Accept Invitation</a>
      <p style="color:#666;font-size:0.8rem;margin:24px 0 0;">Or paste this link into your browser:<br>${inviteUrl}</p>
    </div>
  `

  const res = await $fetch<{ id: string }>('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      from: config.inviteFromEmail,
      to,
      subject: `${inviterName} invited you to join ${leagueName}`,
      html,
    },
  })

  if (!res?.id) throw createError({ statusCode: 500, data: { code: 'EMAIL_FAILED', message: 'Failed to send invitation email' } })
}
