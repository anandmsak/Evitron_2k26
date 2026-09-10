import crypto from 'crypto';

export type AppEnvironment = 'development' | 'production';

export interface RazorpayOrderResult {
  orderId: string;
  amount: number; // in paise
  currency: string;
  keyId: string;
}

export interface RazorpayHealth {
  env: AppEnvironment;
  status: 'CONNECTED' | 'NOT CONNECTED';
  liveConnected: boolean;
  testConnected: boolean;
  keyMode: 'LIVE' | 'TEST' | 'NONE';
  keyIdPrefix: string;
  details: string;
}

export function getAppEnv(storeSettingsEnv?: AppEnvironment): AppEnvironment {
  // If APP_ENV or RAZORPAY_ENV is explicitly defined in process.env, prioritize that
  const envVar = (process.env.APP_ENV || process.env.RAZORPAY_ENV || '').trim().toLowerCase();
  if (envVar === 'production') return 'production';
  if (envVar === 'development') return 'development';

  // Next check store settings
  if (storeSettingsEnv === 'production') return 'production';
  if (storeSettingsEnv === 'development') return 'development';

  // Fallback to NODE_ENV
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}

export function getRazorpayKeyId(): string {
  return (process.env.RAZORPAY_KEY_ID || '').trim();
}

export function getRazorpayKeySecret(): string {
  return (process.env.RAZORPAY_KEY_SECRET || '').trim();
}

export function isRazorpayLiveKey(keyId: string): boolean {
  return keyId.startsWith('rzp_live_');
}

export function isRazorpayTestKey(keyId: string): boolean {
  return keyId.startsWith('rzp_test_');
}

/**
 * Health check verifying Razorpay API credentials against the active environment.
 * Production: Strictly requires rzp_live_... keys. Never allows rzp_test_...
 * Development: Supports Razorpay Test Mode with rzp_test_... keys for real end-to-end testing.
 */
export async function checkRazorpayHealth(targetEnv?: AppEnvironment): Promise<RazorpayHealth> {
  const env = targetEnv || getAppEnv();
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();

  if (!keyId || !keySecret) {
    const isLive = keyId ? isRazorpayLiveKey(keyId) : false;
    const isTest = keyId ? isRazorpayTestKey(keyId) : false;
    const keyMode = isLive ? 'LIVE' : isTest ? 'TEST' : 'NONE';
    const details = !keyId
      ? 'Missing RAZORPAY_KEY_ID environment variable.'
      : `Razorpay Key ID (${keyId.substring(0, 12)}...) is configured in ${keyMode} mode. Key Secret is pending. Instant UPI QR payment is active.`;

    return {
      env,
      status: 'NOT CONNECTED',
      liveConnected: false,
      testConnected: false,
      keyMode,
      keyIdPrefix: keyId ? keyId.substring(0, 12) : 'NONE',
      details,
    };
  }

  const isLive = isRazorpayLiveKey(keyId);
  const isTest = isRazorpayTestKey(keyId);
  const keyMode = isLive ? 'LIVE' : isTest ? 'TEST' : 'NONE';

  // In PRODUCTION: Strictly forbid test keys!
  if (env === 'production' && !isLive) {
    return {
      env: 'production',
      status: 'NOT CONNECTED',
      liveConnected: false,
      testConnected: false,
      keyMode,
      keyIdPrefix: keyId.substring(0, 8),
      details: `CRITICAL SECURITY: Test key (${keyId.substring(0, 8)}...) is strictly prohibited in PRODUCTION mode. Production requires live Razorpay credentials (rzp_live_...).`,
    };
  }

  // Verify credentials by calling Razorpay's API
  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/orders?count=1', {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (res.ok) {
      return {
        env,
        status: 'CONNECTED',
        liveConnected: isLive,
        testConnected: isTest,
        keyMode,
        keyIdPrefix: keyId.substring(0, 12),
        details: isLive
          ? `Razorpay Live credentials authenticated successfully with Razorpay API.`
          : `Razorpay Test credentials authenticated successfully with Razorpay API (Real Test Mode active).`,
      };
    }

    const errText = await res.text();
    let desc = `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(errText);
      if (parsed.error && parsed.error.description) {
        desc = parsed.error.description;
      }
    } catch {}

    const isAuthPending = desc.toLowerCase().includes('auth') || res.status === 401;
    const detailsMessage = isAuthPending
      ? `Razorpay credentials verification pending. In Razorpay Dashboard (${isTest ? 'Test Mode' : 'Live Mode'}), navigate to Account & Settings > API Keys to verify your active Key ID and matching Secret. Instant UPI QR payment is active.`
      : `Razorpay gateway verification: ${desc}. Instant UPI QR payment is active.`;

    return {
      env,
      status: 'NOT CONNECTED',
      liveConnected: false,
      testConnected: false,
      keyMode,
      keyIdPrefix: keyId.substring(0, 12),
      details: detailsMessage,
    };
  } catch (err: any) {
    return {
      env,
      status: 'NOT CONNECTED',
      liveConnected: false,
      testConnected: false,
      keyMode,
      keyIdPrefix: keyId.substring(0, 12),
      details: `Razorpay API connectivity: ${err.message}. Instant UPI QR payment is active.`,
    };
  }
}

/**
 * Creates a REAL order on Razorpay API.
 * In production: strictly enforces rzp_live_... keys.
 * In development: supports rzp_test_... keys for authentic end-to-end testing.
 * NEVER falls back to simulation or fake orders.
 */
export async function createOrder(
  amountInInr: number,
  receipt: string,
  notes: Record<string, string> = {},
  targetEnv?: AppEnvironment
): Promise<RazorpayOrderResult> {
  const env = targetEnv || getAppEnv();
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();

  if (!keyId || !keySecret) {
    throw new Error(
      `Razorpay Gateway is NOT CONFIGURED. Missing RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment settings. Please configure credentials or use Option 1 (Instant UPI QR).`
    );
  }

  // In PRODUCTION: test keys are strictly prohibited!
  if (env === 'production' && !isRazorpayLiveKey(keyId)) {
    throw new Error(
      `CRITICAL SECURITY: Test key (${keyId.substring(0, 8)}...) is strictly prohibited in PRODUCTION mode. Production requires live Razorpay credentials (rzp_live_...). Simulation fallback is disabled.`
    );
  }

  const amountInPaise = Math.round(amountInInr * 100);
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    let errorDetail = `HTTP ${response.status} ${response.statusText}`;
    try {
      const parsed = JSON.parse(errText);
      if (parsed.error && parsed.error.description) {
        errorDetail = parsed.error.description;
      }
    } catch {}

    throw new Error(`Razorpay Order Creation Failed: ${errorDetail}`);
  }

  const orderData = (await response.json()) as { id: string; amount: number; currency: string };
  return {
    orderId: orderData.id,
    amount: orderData.amount,
    currency: orderData.currency,
    keyId,
  };
}

/**
 * Verifies the cryptographic HMAC SHA-256 signature generated by Razorpay.
 */
export function verifyPaymentHmacSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!orderId || !paymentId || !signature) {
    return false;
  }

  const keySecret = getRazorpayKeySecret();
  if (!keySecret) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (expectedSignature.length !== signature.length) {
      return false;
    }

    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
  } catch (err) {
    return false;
  }
}

/**
 * Server-side payment verification directly against the real Razorpay API.
 * Ensures the payment exists, belongs to this order, has status captured/authorized,
 * and matches the expected amount.
 */
export async function fetchAndVerifyRazorpayPayment(
  paymentId: string,
  expectedOrderId: string,
  expectedAmountInInr: number,
  targetEnv?: AppEnvironment
): Promise<{ valid: boolean; error?: string; paymentDetails?: any }> {
  const env = targetEnv || getAppEnv();
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();

  if (!keyId || !keySecret) {
    return {
      valid: false,
      error: 'Razorpay credentials are not configured on the server.',
    };
  }

  // Strict check in production: live key only!
  if (env === 'production' && !isRazorpayLiveKey(keyId)) {
    return {
      valid: false,
      error: 'CRITICAL: Test keys are strictly prohibited in PRODUCTION mode. Transaction rejected.',
    };
  }

  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      let desc = `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error && parsed.error.description) desc = parsed.error.description;
      } catch {}

      return {
        valid: false,
        error: `Razorpay API payment verification failed: ${desc}`,
      };
    }

    const payment = (await res.json()) as any;

    if (payment.order_id !== expectedOrderId) {
      return {
        valid: false,
        error: `Payment order ID mismatch. Expected "${expectedOrderId}", received "${payment.order_id}".`,
      };
    }

    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      return {
        valid: false,
        error: `Payment status is "${payment.status}". Only captured or authorized payments can be confirmed.`,
      };
    }

    const expectedPaise = Math.round(expectedAmountInInr * 100);
    if (payment.amount < expectedPaise) {
      return {
        valid: false,
        error: `Payment amount (₹${payment.amount / 100}) is lower than the registration fee (₹${expectedAmountInInr}).`,
      };
    }

    return { valid: true, paymentDetails: payment };
  } catch (err: any) {
    return {
      valid: false,
      error: `Network error verifying payment with Razorpay API: ${err.message}`,
    };
  }
}

export function verifyWebhookSignature(rawBody: string, webhookSignature: string): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret || !webhookSignature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(webhookSignature));
}
