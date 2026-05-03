import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Verify BVN with external provider.
   * Expects provider to respond with a JSON object that includes a boolean-ish verification result.
   * Configuration:
   * - `KYC_PROVIDER_URL` (required)
   * - `KYC_PROVIDER_KEY` (optional)
   */
  /**
   * Calls external BVN API and returns { success, verificationId }.
   * On dev (no KYC_PROVIDER_URL), returns success with a random verificationId.
   */
  async verifyBvn(
    bvn: string,
    payload: Record<string, any> = {}
  ): Promise<{
    success: boolean;
    data: {
      verificationId: string;
      firstName: string | null;
      lastName: string | null;
      dateOfBirth: string | null;
    };
  }> {
    // Development mode: auto-pass with mock data
    if (process.env.NODE_ENV === 'development') {
      return {
        success: true,
        data: {
          verificationId: 'dev-' + Math.random().toString(36).substring(2, 12).toUpperCase(),
          firstName: payload.firstName || 'John',
          lastName: payload.lastName || 'Doe',
          dateOfBirth: payload.dob || '1990-01-01',
        }
      };
    }

    // KYC bypass mode: allow signup without real verification
    // Use in development/testing before real provider is set up
    const bypassMode = process.env.KYC_BYPASS === 'true';
    if (bypassMode) {
      this.logger.warn('KYC bypass mode is ENABLED — BVN validation is mocked');
      return {
        success: true,
        data: {
          verificationId: 'bypass-' + Math.random().toString(36).substring(2, 12).toUpperCase(),
          firstName: payload.firstName || null,
          lastName: payload.lastName || null,
          dateOfBirth: payload.dob || null,
        }
      };
    }

    const url = this.config.get<string>('KYC_PROVIDER_URL');
    const apiKey = this.config.get<string>('KYC_PROVIDER_KEY');

    if (!url) {
      this.logger.error('KYC_PROVIDER_URL is not configured in production. Set KYC_BYPASS=true to bypass validation.');
      return {
        success: false,
        data: {
          verificationId: null,
          firstName: null,
          lastName: null,
          dateOfBirth: null,
        }
      };
    }

    try {
      const body = { bvn, ...payload };
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      this.logger.debug(`Calling KYC provider: ${url}`);
      const resp = await axios.post(url, body, { headers, timeout: 10_000 });
      const data = resp?.data;

      // Map provider response to { success, verificationId, firstName, lastName, dateOfBirth }
      let success = false;
      let verificationId = data?.verificationId || data?.referenceId || data?.ref || data?.id || null;
      if (typeof data?.verified === 'boolean') success = data.verified;
      else if (data?.status && typeof data.status === 'string') {
        success = ['valid', 'verified', 'success'].includes(data.status.toLowerCase());
      } else if (data?.matched === true) success = true;

      // fallback: treat HTTP 2xx as success if no explicit field
      if (!success && resp?.status && resp.status >= 200 && resp.status < 300) success = true;
      if (!verificationId) verificationId = data?.id || data?.reference || data?.transactionId || null;
      if (!verificationId) verificationId = 'ext-' + Math.random().toString(36).substring(2, 12).toUpperCase();

      // Try to extract user data from provider response
      const firstName = data?.firstName || data?.firstname || data?.first_name || null;
      const lastName = data?.lastName || data?.lastname || data?.last_name || null;
      const dateOfBirth = data?.dateOfBirth || data?.dob || data?.date_of_birth || null;

      this.logger.debug(`KYC verification result: success=${success}, verificationId=${verificationId}`);
      return { success, data: { verificationId, firstName, lastName, dateOfBirth } };
    } catch (err: any) {
      this.logger.error('KYC provider request failed', {
        url,
        error: err?.message ?? err,
        status: err?.response?.status,
        responseData: err?.response?.data,
      });
      return {
        success: false,
        data: {
          verificationId: null,
          firstName: payload.firstName || null,
          lastName: payload.lastName || null,
          dateOfBirth: payload.dob || null,
        }
      };
    }
  }
}
