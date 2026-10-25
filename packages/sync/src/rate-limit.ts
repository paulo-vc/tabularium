/**
 * Limite de mensagens por participante numa janela de tempo (janela deslizante). O Mestre o
 * usa para que um participante não inunde a mesa (chat, sussurros, rolagens): o que passa do
 * limite é descartado, sem derrubar ninguém.
 */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /** Conta uma mensagem de `key`. `false` se já passou do limite (a mensagem é descartada). */
  allow(key: string): boolean {
    const now = this.now();
    const recent = (this.hits.get(key) ?? []).filter((at) => now - at < this.windowMs);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }

  forget(key: string): void {
    this.hits.delete(key);
  }
}
