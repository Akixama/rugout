const DEFAULT_RPC_URL = "https://api.mainnet.solana.com";
const ALLOWED_METHODS = new Set([
  "getAccountInfo",
  "getTokenLargestAccounts",
  "getMultipleAccounts",
  "getTransactionsForAddress",
]);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return json(
      { error: { code: -32600, message: "Only POST requests are supported." } },
      405
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(
      { error: { code: -32700, message: "Invalid JSON request." } },
      400
    );
  }

  if (
    payload?.jsonrpc !== "2.0" ||
    !ALLOWED_METHODS.has(payload?.method) ||
    !Array.isArray(payload?.params)
  ) {
    return json(
      { error: { code: -32600, message: "Unsupported Solana RPC request." } },
      400
    );
  }

  const rpcUrl = process.env.SOLANA_RPC_URL || DEFAULT_RPC_URL;

  try {
    const upstream = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: payload.id ?? 1,
        method: payload.method,
        params: payload.params,
      }),
    });

    const body = await upstream.text();

    if (!upstream.ok) {
      const message = upstream.status === 429
        ? "The Solana RPC is rate-limited. Please retry shortly."
        : "The configured Solana RPC rejected the request.";
      return json({ error: { code: -32000, message } }, upstream.status === 429 ? 429 : 502);
    }

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return json(
      { error: { code: -32000, message: "Could not connect to the Solana RPC." } },
      502
    );
  }
}
