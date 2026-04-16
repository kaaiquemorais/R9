const crypto = require('crypto')

function base64url(input) {
  return Buffer.from(typeof input === 'string' ? input : JSON.stringify(input))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
  const now = Math.floor(Date.now() / 1000)

  const header = base64url({ alg: 'RS256', typ: 'JWT' })
  const payload = base64url({
    iss: email,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })

  const unsigned = `${header}.${payload}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(unsigned)
  const sig = signer.sign(privateKey, 'base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const jwt = `${unsigned}.${sig}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })

  const data = await res.json()
  if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`)
  return data.access_token
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' }

  try {
    const booking = JSON.parse(event.body)
    const { clientName, clientPhone, service, dateStr, time, duration = 60 } = booking

    const start = new Date(`${dateStr}T${time}:00`)
    const end = new Date(start.getTime() + duration * 60000)

    const accessToken = await getAccessToken()
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'

    const calEvent = {
      summary: `${service} — ${clientName}`,
      description: `Cliente: ${clientName}\nTelefone: ${clientPhone}\nServiço: ${service}`,
      location: 'Rua Fernando de Noronha, 100, Bragança Paulista/SP',
      start: { dateTime: start.toISOString(), timeZone: 'America/Sao_Paulo' },
      end:   { dateTime: end.toISOString(),   timeZone: 'America/Sao_Paulo' },
    }

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calEvent),
      }
    )

    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || 'Google Calendar API error')

    return { statusCode: 200, headers, body: JSON.stringify({ eventId: data.id }) }
  } catch (err) {
    console.error('add-to-calendar error:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
