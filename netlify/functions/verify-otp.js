const crypto = require('crypto')

function hmac(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex')
}

function timingSafeEq(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
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
    if (!SECRET) throw new Error('OTP_SECRET not configured')

    const { token, code } = JSON.parse(event.body || '{}')
    if (!token || !code) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'missing_fields' }) }
    }

    let decoded
    try {
      decoded = Buffer.from(token, 'base64url').toString('utf8')
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'invalid_token' }) }
    }

    const parts = decoded.split('|')
    if (parts.length !== 4) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'invalid_token' }) }
    }
    const [email, exp, codeHash, signature] = parts

    const payload = `${email}|${exp}`
    const expectedSig = hmac(SECRET, `${payload}|${codeHash}`)
    if (!timingSafeEq(signature, expectedSig)) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'tampered_token' }) }
    }

    if (Date.now() > Number(exp)) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'expired' }) }
    }

    const expectedHash = hmac(SECRET, `${payload}|${String(code).trim()}`)
    if (!timingSafeEq(codeHash, expectedHash)) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'wrong_code' }) }
    }

    const sessionExp = Date.now() + 30 * 24 * 60 * 60 * 1000
    const sessionPayload = `${email}|${sessionExp}`
    const sessionSig = hmac(SECRET, sessionPayload)
    const sessionToken = Buffer.from(`${sessionPayload}|${sessionSig}`).toString('base64url')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ sessionToken, email, expiresAt: sessionExp }),
    }
  } catch (err) {
    console.error('verify-otp error:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
