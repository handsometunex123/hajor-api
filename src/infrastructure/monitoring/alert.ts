import axios from 'axios';

export async function sendAlert(title: string, details?: Record<string, any>) {
  const webhook = process.env.ALERT_WEBHOOK_URL;
  const payload = {
    text: title,
    details: details || {},
    timestamp: new Date().toISOString(),
  };

  if (webhook) {
    try {
      await axios.post(webhook, payload, { timeout: 5000 });
      return;
    } catch (err) {
      // fallback to console if webhook fails
      // eslint-disable-next-line no-console
      console.error('Alert webhook failed', err?.message || err);
    }
  }

  // eslint-disable-next-line no-console
  console.error('ALERT:', title, JSON.stringify(details));
}

export default sendAlert;
