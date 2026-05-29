export function getErrorMessage(error: unknown, fallback = "Ocurrió un error inesperado"): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}
