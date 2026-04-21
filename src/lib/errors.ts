// Next.js signals a server-action redirect by throwing an Error whose
// `digest` starts with "NEXT_REDIRECT;...". Client code that awaits a server
// action inside a try/catch must ignore this error so Next.js can finish the
// navigation — otherwise the catch block will treat the redirect as a failure.
export function isRedirectError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const digest = (error as Error & { digest?: unknown }).digest;
    return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}
