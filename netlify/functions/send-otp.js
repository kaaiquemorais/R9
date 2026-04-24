const crypto = require('crypto')

function hmac(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex')
}

function randomCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0')
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' }

  try {
    const SECRET = process.env.OTP_SECRET
    const RESEND_KEY = process.env.RESEND_API_KEY
    const FROM = process.env.RESEND_FROM || 'R9 Barbearia <onboarding@resend.dev>'

    if (!SECRET) throw new Error('OTP_SECRET not configured')
    if (!RESEND_KEY) throw new Error('RESEND_API_KEY not configured')

    const { email: rawEmail } = JSON.parse(event.body || '{}')
    const email = (rawEmail || '').trim().toLowerCase()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'invalid_email' }) }
    }

    const code = randomCode()
    const exp = Date.now() + 10 * 60 * 1000
    const payload = `${email}|${exp}`
    const codeHash = hmac(SECRET, `${payload}|${code}`)
    const signature = hmac(SECRET, `${payload}|${codeHash}`)
    const token = Buffer.from(`${payload}|${codeHash}|${signature}`).toString('base64url')

    const html = `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:440px;margin:0 auto;padding:32px 24px;background:#0a0a0a;color:#f5f5f5;border-radius:16px">
        <h2 style="color:#FF6A00;margin:0 0 8px;font-size:22px">R9 Barbearia</h2>
        <p style="color:#999;margin:0 0 24px;font-size:14px">Seu código de acesso para concluir o agendamento:</p>
        <div style="font-size:34px;font-weight:800;letter-spacing:10px;text-align:center;padding:20px;background:#1a1a1a;border-radius:12px;margin:16px 0;color:#fff">${code}</div>
        <p style="color:#666;font-size:12px;margin-top:24px">Esse código expira em 10 minutos. Se você não solicitou, pode ignorar este e-mail.</p>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: email,
        subject: `${code} é seu código da R9 Barbearia`,
        html,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('Resend error:', data)
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: 'email_send_failed', details: data.message || data.name || 'unknown' }),
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ token, expiresAt: exp }) }
  } catch (err) {
    console.error('send-otp error:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
