const axios = require('axios');
const mailConfig = require('../../config/mail');

function buildPaymentReportMessage({
  reportId,
  storeName,
  userName,
  planLabel,
  metodoPago,
  referencia,
  montoUsd,
}) {
  return [
    '🔔 *Haru — Nuevo pago reportado*',
    `Comercio: ${storeName || '—'}`,
    `Usuario: ${userName || '—'}`,
    `Plan: ${planLabel || '—'}`,
    `Monto: $${montoUsd} USD`,
    `Método: ${metodoPago || '—'}`,
    `Referencia: ${referencia || '—'}`,
    `ID reporte: #${reportId}`,
    '',
    `Revisar: ${mailConfig.FRONTEND_URL}/admin`,
  ].join('\n');
}

async function sendViaCallMeBot(phone, text, apiKey) {
  const url = new URL('https://api.callmebot.com/whatsapp.php');
  url.searchParams.set('phone', phone);
  url.searchParams.set('text', text);
  url.searchParams.set('apikey', apiKey);

  const response = await axios.get(url.toString(), { timeout: 10000, validateStatus: () => true });
  const body = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
  if (response.status >= 400) {
    throw new Error(body || `CallMeBot HTTP ${response.status}`);
  }
  return { sent: true, provider: 'callmebot', response: body };
}

async function sendViaWebhook(webhookUrl, payload) {
  const response = await axios.post(webhookUrl, payload, { timeout: 10000 });
  if (response.status >= 400) {
    throw new Error(`Webhook WhatsApp HTTP ${response.status}`);
  }
  return { sent: true, provider: 'webhook' };
}

/**
 * Notifica al super admin por WhatsApp cuando un comercio reporta un pago.
 * Configura WHATSAPP_CALLMEBOT_API_KEY + WHATSAPP_NOTIFY_PHONE (ej. 58412…)
 * o WHATSAPP_NOTIFY_WEBHOOK con URL POST JSON { phone, message }.
 */
async function sendPaymentReportWhatsApp(payload) {
  const phone = (process.env.WHATSAPP_NOTIFY_PHONE || '584228180393').replace(/\D/g, '');
  const message = buildPaymentReportMessage(payload);
  const apiKey = (process.env.WHATSAPP_CALLMEBOT_API_KEY || '').trim();
  const webhookUrl = (process.env.WHATSAPP_NOTIFY_WEBHOOK || '').trim();

  if (webhookUrl) {
    try {
      return await sendViaWebhook(webhookUrl, { phone, message, type: 'payment_report', ...payload });
    } catch (err) {
      console.error('[haru WhatsApp] Webhook falló:', err.message);
    }
  }

  if (apiKey) {
    try {
      return await sendViaCallMeBot(phone, message, apiKey);
    } catch (err) {
      console.error('[haru WhatsApp] CallMeBot falló:', err.message);
    }
  }

  const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  console.log('\n[haru WhatsApp DEV] Nuevo reporte de pago');
  console.log(message);
  console.log('Enlace manual:', waLink);
  console.log('Configura WHATSAPP_CALLMEBOT_API_KEY en .env para envío automático.\n');

  return { sent: false, devMode: true, provider: 'console', waLink };
}

module.exports = {
  sendPaymentReportWhatsApp,
  buildPaymentReportMessage,
};
