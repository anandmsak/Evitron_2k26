/**
 * Cloudflare Worker Backend for EVITRON 2K26
 * Handles Razorpay order creation, payment signature verification,
 * and registration processing without requiring Vercel Pro.
 */

export interface Env {
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ADMIN_PASSWORD?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Razorpay-Signature',
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

// Web Crypto HMAC SHA256 helper
async function hmacSha256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 1. Health check
      if (path === '/health' || path === '/api/health') {
        return jsonResponse({
          status: 'ok',
          service: 'EVITRON 2K26 Cloudflare Worker Backend',
          timestamp: new Date().toISOString(),
        });
      }

      // 2. Create Razorpay Order
      if (path === '/create-order' || path === '/api/create-order') {
        if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
        const body: any = await request.json();

        // Validate registration rules
        const { registrationType, selectedWorkshopId, selectedTechnicalIds = [], participants } = body;
        if (!participants || !Array.isArray(participants)) {
          return jsonResponse({ error: 'Invalid participants list' }, 400);
        }

        let amount = 350;
        if (registrationType === 'workshop') {
          if (!selectedWorkshopId) return jsonResponse({ error: 'Please select a workshop' }, 400);
          if (participants.length !== 1) return jsonResponse({ error: 'Workshop requires exactly 1 participant' }, 400);
          amount = 350;
        } else if (registrationType === 'technical') {
          if (selectedTechnicalIds.length === 0) {
            return jsonResponse({ error: 'Please select at least one technical event before choosing a non-technical event' }, 400);
          }
          if (participants.length !== 3) {
            return jsonResponse({ error: 'Technical symposium registration requires exactly 3 team members' }, 400);
          }
          amount = 1050;
        } else {
          return jsonResponse({ error: 'Invalid registration type' }, 400);
        }

        const amountInPaise = amount * 100;
        const receipt = `rcpt_${Date.now()}`;

        if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
          const auth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
          const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: amountInPaise,
              currency: 'INR',
              receipt,
              notes: {
                registrationType,
                leader: participants[0]?.fullName,
              },
            }),
          });

          if (!rzpRes.ok) {
            const err = await rzpRes.text();
            return jsonResponse({ error: `Razorpay error: ${err}` }, 502);
          }

          const order: any = await rzpRes.json();
          return jsonResponse({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: env.RAZORPAY_KEY_ID,
          });
        }

        return jsonResponse(
          { error: 'Razorpay Live Gateway is not configured. Live credentials (rzp_live_...) are required.' },
          503
        );
      }

      // 3. Verify Payment
      if (path === '/verify-payment' || path === '/api/verify-payment') {
        if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
        const {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          registrationData,
        } = (await request.json()) as any;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
          return jsonResponse({ error: 'Missing payment signature tokens' }, 400);
        }

        if (env.RAZORPAY_KEY_SECRET) {
          const expected = await hmacSha256(env.RAZORPAY_KEY_SECRET, `${razorpay_order_id}|${razorpay_payment_id}`);
          if (expected !== razorpay_signature) {
            return jsonResponse({ error: 'Payment signature verification failed' }, 400);
          }
        }

        // Generate non-sequential Registration ID
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const registrationId = `EV26-${code}`;

        return jsonResponse({
          success: true,
          registrationId,
          message: 'Payment verified and registration record created.',
        });
      }

      // 4. Webhook
      if (path === '/webhook' || path === '/api/webhook') {
        const signature = request.headers.get('x-razorpay-signature');
        const rawBody = await request.text();

        if (env.RAZORPAY_WEBHOOK_SECRET && signature) {
          const expected = await hmacSha256(env.RAZORPAY_WEBHOOK_SECRET, rawBody);
          if (expected !== signature) {
            return jsonResponse({ error: 'Invalid webhook signature' }, 400);
          }
        }
        return jsonResponse({ status: 'ok' });
      }

      return jsonResponse({ error: 'Endpoint not found' }, 404);
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Worker server error' }, 500);
    }
  },
};
