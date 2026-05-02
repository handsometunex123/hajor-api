import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly webhook?: string;

  constructor(private readonly config: ConfigService) {
    this.webhook = this.config.get<string>('ALERT_WEBHOOK_URL');
  }

  async alert(event: string, details?: any) {
    const payload = { event, timestamp: new Date().toISOString(), details };
    this.logger.error(`[monitor] ${event} ${JSON.stringify(details ?? {})}`);

    if (!this.webhook) return;

    try {
      const timeoutMs = parseInt(this.config.get<string>('ALERT_WEBHOOK_TIMEOUT_MS', '5000'), 10);
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);

      // Use global fetch (Node 18+) to POST alert payload
      const headers: any = { 'content-type': 'application/json' };
      if (details && details.requestId) headers['x-request-id'] = details.requestId;
      await fetch(this.webhook, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(id);
    } catch (err: any) {
      this.logger.error(`[monitor] failed to send alert to webhook: ${err?.message ?? err}`);
    }
  }
}
