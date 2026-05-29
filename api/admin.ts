import {
  handleAdminApi,
  verifyBearerToken,
  type AdminApiAction,
} from "../src/lib/admin-api-handler";

type VercelRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: { action?: AdminApiAction; data?: unknown };
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    const userId = await verifyBearerToken(headerValue);

    const action = req.body?.action;
    if (!action) {
      return res.status(400).json({ error: "Acción requerida" });
    }

    const result = await handleAdminApi(action, req.body?.data, userId);
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error del servidor";
    const status = message.includes("No autorizado") || message.includes("administradores") ? 403 : 400;
    return res.status(status).json({ error: message });
  }
}
