import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type ChallengePayload = {
  ans: number;
  exp: number;
};

@Injectable()
export class CaptchaService {
  constructor(private readonly config: ConfigService) {}

  /** Reject obvious bot honeypot fills without revealing the trap. */
  assertHoneypotEmpty(value: string | null | undefined) {
    if (value != null && String(value).trim() !== '') {
      throw new BadRequestException('Could not submit the form. Please try again.');
    }
  }

  createChallenge() {
    const left = randomInt(2, 12);
    const right = randomInt(1, 10);
    const ans = left + right;
    const exp = Date.now() + 10 * 60 * 1000;
    const token = this.signPayload({ ans, exp });
    return {
      token,
      question: `What is ${left} + ${right}?`,
      expiresInSeconds: 600,
    };
  }

  verify(token: string | null | undefined, answer: string | null | undefined) {
    const env = process.env.NODE_ENV ?? 'development';
    if (env === 'test') return;

    if (!token?.trim() || answer == null || String(answer).trim() === '') {
      throw new BadRequestException('Please complete the captcha.');
    }

    const payload = this.readPayload(token.trim());
    if (!payload) {
      throw new BadRequestException('Captcha expired. Please solve a new one.');
    }
    if (payload.exp < Date.now()) {
      throw new BadRequestException('Captcha expired. Please solve a new one.');
    }

    const expected = payload.ans;
    const got = Number(String(answer).trim());
    if (!Number.isFinite(got) || got !== expected) {
      throw new BadRequestException('Captcha answer is incorrect.');
    }
  }

  private signingSecret() {
    return (
      this.config.get<string>('CAPTCHA_SECRET')?.trim() ||
      this.config.get<string>('JWT_SECRET')?.trim() ||
      'casingconnect-captcha-dev'
    );
  }

  private signPayload(payload: ChallengePayload) {
    const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const sig = createHmac('sha256', this.signingSecret()).update(body).digest('base64url');
    return `${body}.${sig}`;
  }

  private readPayload(token: string): ChallengePayload | null {
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const expected = createHmac('sha256', this.signingSecret()).update(body).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    try {
      const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as ChallengePayload;
      if (typeof parsed.ans !== 'number' || typeof parsed.exp !== 'number') return null;
      return parsed;
    } catch {
      return null;
    }
  }
}
