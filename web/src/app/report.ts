/**
 * Log an error the UI has already handled (it showed the user a notice), so it can still be
 * diagnosed from the console. Stays in the browser: nothing is sent anywhere.
 */
export function reportError(error: unknown): void {
  const code = (error as { code?: string } | null)?.code;
  console.warn(`[veto] handled error${code ? ` (${code})` : ''}:`, error);
}
