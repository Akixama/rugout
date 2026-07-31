import { PublicKey } from "@solana/web3.js";

// All browser requests stay same-origin. Vite proxies this route during local
// development and Netlify sends it through the serverless RPC gateway in
// production, so private provider keys never enter the browser bundle.
const RPC_URL = "/api/solana-rpc";
const SYSTEM_PROGRAM = "11111111111111111111111111111111";

const VENUE_PROGRAMS = [
  {
    id: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
    name: "Pump.fun",
    kind: "venue",
  },
  {
    id: "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
    name: "PumpSwap",
    kind: "venue",
  },
  {
    id: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
    name: "Raydium AMM",
    kind: "venue",
  },
  {
    id: "CPMMoo8L3F4NbTegBCKVNunggL7H1Zpdmwpwh8KMoZ0F",
    name: "Raydium CPMM",
    kind: "venue",
  },
  {
    id: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
    name: "Raydium CLMM",
    kind: "venue",
  },
  {
    id: "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
    name: "Meteora",
    kind: "venue",
  },
  {
    id: "whirLbMiicVdio4qvUfM5KAg6CtjGzKxoZ53KZaXVi",
    name: "Orca",
    kind: "venue",
  },
  {
    id: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
    name: "Jupiter",
    kind: "router",
  },
];

const LIQUIDITY_PROGRAM_IDS = new Set(
  VENUE_PROGRAMS.filter((program) => program.kind === "venue").map((program) => program.id)
);

async function rpc(method, params) {
  let res;
  try {
    res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
  } catch {
    throw new Error("Could not reach the Solana network. Check your connection and try again.");
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error("The Solana data service returned an invalid response. Please try again.");
  }

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("The scanner is receiving too many requests. Wait a moment and try again.");
    }
    throw new Error(
      json?.error?.message ||
      "The Solana data service is temporarily unavailable. Please try again."
    );
  }

  if (json.error) throw new Error(json.error.message || "RPC error");
  return json.result;
}

// SPL Token mint account layout (parsed via jsonParsed encoding):
// info.mintAuthority, info.freezeAuthority, info.supply, info.decimals
export async function getMintInfo(mintAddress) {
  const result = await rpc("getAccountInfo", [
    mintAddress,
    { encoding: "jsonParsed" },
  ]);

  if (!result || !result.value) {
    throw new Error("Mint account not found — check the address");
  }

  const parsed = result.value.data?.parsed;
  if (!parsed || parsed.type !== "mint") {
    throw new Error("This address is not an SPL token mint");
  }

  const info = parsed.info;
  return {
    mintAuthority: info.mintAuthority, // null = revoked (good sign)
    freezeAuthority: info.freezeAuthority, // null = revoked (good sign)
    supply: info.supply,
    decimals: info.decimals,
    isInitialized: info.isInitialized,
  };
}

// Top holders — used to flag concentration risk (e.g. one wallet holding >20% supply)
export async function getTopHolders(mintAddress) {
  const result = await rpc("getTokenLargestAccounts", [mintAddress]);
  return result?.value || [];
}

function accountKeyString(key) {
  if (typeof key === "string") return key;
  return key?.pubkey || "";
}

function shortAddress(address) {
  if (!address) return "Unknown";
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

function isOnCurve(address) {
  try {
    return PublicKey.isOnCurve(new PublicKey(address).toBytes());
  } catch {
    return true;
  }
}

function collectProgramIds(transaction) {
  const ids = new Set();
  const message = transaction.transaction?.message;

  (message?.accountKeys || []).forEach((key) => {
    const value = accountKeyString(key);
    if (value) ids.add(value);
  });

  (message?.instructions || []).forEach((instruction) => {
    if (instruction?.programId) ids.add(instruction.programId);
  });

  (transaction.meta?.innerInstructions || []).forEach((group) => {
    (group.instructions || []).forEach((instruction) => {
      if (instruction?.programId) ids.add(instruction.programId);
    });
  });

  (transaction.meta?.logMessages || []).forEach((log) => {
    const match = log.match(/^Program ([1-9A-HJ-NP-Za-km-z]{32,44}) invoke/);
    if (match) ids.add(match[1]);
  });

  return ids;
}

function detectVenue(transaction) {
  const programIds = collectProgramIds(transaction);
  const matched = VENUE_PROGRAMS.filter((program) => programIds.has(program.id));
  const router = matched.find((program) => program.kind === "router");
  const venue = matched.find((program) => program.kind === "venue");

  if (router && venue) return `${router.name} → ${venue.name}`;
  return venue?.name || router?.name || "Unknown venue";
}

async function resolveHolderOwners(holders, totalSupply, decimals) {
  const largest = holders.slice(0, 20);
  if (!largest.length) return [];

  const tokenAccounts = largest.map((holder) => holder.address);
  const accountResult = await rpc("getMultipleAccounts", [
    tokenAccounts,
    { encoding: "jsonParsed", commitment: "confirmed" },
  ]);

  const aggregated = new Map();

  largest.forEach((holder, index) => {
    const parsedInfo = accountResult?.value?.[index]?.data?.parsed?.info;
    const owner = parsedInfo?.owner || holder.address;
    const amount = Number(holder.amount || 0);
    const existing = aggregated.get(owner) || {
      owner,
      amount: 0,
      tokenAccounts: [],
    };
    existing.amount += amount;
    existing.tokenAccounts.push(holder.address);
    aggregated.set(owner, existing);
  });

  const ranked = [...aggregated.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 14);

  let ownerAccountResult = null;
  try {
    ownerAccountResult = await rpc("getMultipleAccounts", [
      ranked.map((holder) => holder.owner),
      { encoding: "base64", commitment: "confirmed" },
    ]);
  } catch {
    // Current SOL balance is useful context, but it should never block the scan.
  }

  return ranked.map((holder, index) => ({
    rank: index + 1,
    owner: holder.owner,
    ownerShort: shortAddress(holder.owner),
    tokenAccounts: holder.tokenAccounts,
    rawAmount: holder.amount,
    tokenAmount: holder.amount / (10 ** decimals),
    percentage: Number(totalSupply) > 0
      ? (holder.amount / Number(totalSupply)) * 100
      : 0,
    currentSol: ownerAccountResult?.value?.[index]?.lamports != null
      ? ownerAccountResult.value[index].lamports / 1_000_000_000
      : null,
    accountProgram: ownerAccountResult?.value?.[index]?.owner || null,
    isOffCurve: !isOnCurve(holder.owner),
    isLiquidityVault:
      ownerAccountResult?.value?.[index]?.owner != null &&
      ownerAccountResult.value[index].owner !== SYSTEM_PROGRAM &&
      LIQUIDITY_PROGRAM_IDS.has(ownerAccountResult.value[index].owner),
    historyStatus: "pending",
    firstEntryTime: null,
    secondsAfterMint: null,
    preEntrySol: null,
    acquisitionSignature: null,
    acquisitionSlot: null,
    sniperSignal: "unknown",
    bundleSignal: "unknown",
    lowSolSignal: "unknown",
    venue: "Unknown venue",
  }));
}

async function getMintCreation(mintAddress) {
  const response = await rpc("getTransactionsForAddress", [
    mintAddress,
    {
      transactionDetails: "full",
      sortOrder: "asc",
      limit: 1,
      encoding: "jsonParsed",
      maxSupportedTransactionVersion: 0,
      filters: { status: "succeeded" },
    },
  ]);
  const transaction = response?.data?.[0];
  return transaction
    ? { slot: transaction.slot, blockTime: transaction.blockTime }
    : null;
}

async function getFirstTokenEntry(owner, mintAddress) {
  const response = await rpc("getTransactionsForAddress", [
    owner,
    {
      transactionDetails: "full",
      sortOrder: "asc",
      limit: 1,
      encoding: "jsonParsed",
      maxSupportedTransactionVersion: 0,
      filters: {
        status: "succeeded",
        tokenAccounts: "balanceChanged",
        tokenTransfer: {
          direction: "in",
          mint: mintAddress,
        },
      },
    },
  ]);

  const entry = response?.data?.[0];
  if (!entry) return null;

  const keys = entry.transaction?.message?.accountKeys || [];
  const ownerIndex = keys.findIndex((key) => accountKeyString(key) === owner);
  const preLamports = ownerIndex >= 0 ? entry.meta?.preBalances?.[ownerIndex] : null;

  return {
    blockTime: entry.blockTime ?? null,
    slot: entry.slot ?? null,
    signature: entry.transaction?.signatures?.[0] || null,
    preEntrySol: preLamports != null ? preLamports / 1_000_000_000 : null,
    venue: detectVenue(entry),
  };
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = { status: "fulfilled", value: await mapper(items[index], index) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );
  return results;
}

async function enrichHolderHistory(holders, mintAddress) {
  if (!holders.length) return { holders, available: false };

  let mintCreation = null;
  try {
    mintCreation = await getMintCreation(mintAddress);
  } catch {
    // Some RPC plans do not expose historical methods. Holder percentages remain usable.
  }

  const histories = await mapWithConcurrency(
    holders,
    3,
    (holder) => getFirstTokenEntry(holder.owner, mintAddress)
  );

  const enriched = holders.map((holder, index) => {
    const settled = histories[index];
    const history = settled.status === "fulfilled" ? settled.value : null;

    if (!history) {
      return {
        ...holder,
        historyStatus: settled.status === "rejected" ? "unavailable" : "not-found",
      };
    }

    const secondsAfterMint =
      mintCreation?.blockTime != null && history.blockTime != null
        ? Math.max(0, history.blockTime - mintCreation.blockTime)
        : null;
    const isPossibleSniper = secondsAfterMint != null && secondsAfterMint <= 120;
    const lowSol = history.preEntrySol != null && history.preEntrySol < 0.05;

    return {
      ...holder,
      historyStatus: "analyzed",
      firstEntryTime: history.blockTime,
      secondsAfterMint,
      preEntrySol: history.preEntrySol,
      acquisitionSignature: history.signature,
      acquisitionSlot: history.slot,
      sniperSignal: isPossibleSniper ? "possible" : "none-seen",
      lowSolSignal: lowSol ? "detected" : history.preEntrySol == null ? "unknown" : "none-seen",
      venue: history.venue,
    };
  });

  const signatureCounts = new Map();
  const slotCounts = new Map();
  enriched.forEach((holder) => {
    if (holder.acquisitionSignature) {
      signatureCounts.set(
        holder.acquisitionSignature,
        (signatureCounts.get(holder.acquisitionSignature) || 0) + 1
      );
    }
    if (holder.acquisitionSlot != null) {
      slotCounts.set(
        holder.acquisitionSlot,
        (slotCounts.get(holder.acquisitionSlot) || 0) + 1
      );
    }
  });

  const withBundleSignals = enriched.map((holder) => {
    if (holder.historyStatus !== "analyzed") return holder;
    const sameTransaction =
      holder.acquisitionSignature &&
      signatureCounts.get(holder.acquisitionSignature) > 1;
    const sameSlot =
      holder.acquisitionSlot != null &&
      slotCounts.get(holder.acquisitionSlot) > 1;
    return {
      ...holder,
      bundleSignal: sameTransaction
        ? "same-transaction"
        : sameSlot
          ? "same-slot"
          : "none-seen",
    };
  });

  return {
    holders: withBundleSignals
      .map((holder) => ({
        ...holder,
        isLiquidityVault:
          holder.isLiquidityVault ||
          (
            holder.isOffCurve &&
            holder.percentage >= 5 &&
            holder.secondsAfterMint === 0 &&
            holder.preEntrySol != null &&
            holder.preEntrySol < 0.001
          ),
      }))
      .filter((holder) => !holder.isLiquidityVault)
      .slice(0, 10)
      .map((holder, index) => ({ ...holder, rank: index + 1 })),
    available: withBundleSignals.some((holder) => holder.historyStatus === "analyzed"),
    mintCreation,
  };
}

// Runs the full scan and returns a verdict object the UI renders directly.
export async function scanToken(mintAddress) {
  const [mintInfo, holders] = await Promise.all([
    getMintInfo(mintAddress),
    getTopHolders(mintAddress).catch(() => []), // don't fail whole scan if this errs
  ]);

  let topHolders = [];
  let holderHistoryAvailable = false;

  try {
    topHolders = await resolveHolderOwners(
      holders,
      mintInfo.supply,
      mintInfo.decimals
    );
    const historyResult = await enrichHolderHistory(topHolders, mintAddress);
    topHolders = historyResult.holders;
    holderHistoryAvailable = historyResult.available;
  } catch {
    // The original concentration calculation remains as a fallback.
    topHolders = holders.slice(0, 10).map((holder, index) => ({
      rank: index + 1,
      owner: holder.address,
      ownerShort: shortAddress(holder.address),
      tokenAccounts: [holder.address],
      rawAmount: Number(holder.amount || 0),
      tokenAmount: Number(holder.amount || 0) / (10 ** mintInfo.decimals),
      percentage: Number(mintInfo.supply) > 0
        ? (Number(holder.amount || 0) / Number(mintInfo.supply)) * 100
        : 0,
      currentSol: null,
      historyStatus: "unavailable",
      firstEntryTime: null,
      secondsAfterMint: null,
      preEntrySol: null,
      sniperSignal: "unknown",
      bundleSignal: "unknown",
      lowSolSignal: "unknown",
      venue: "Unknown venue",
      accountProgram: null,
      isOffCurve: false,
      isLiquidityVault: false,
    }));
  }

  const concentration = topHolders.reduce(
    (sum, holder) => sum + holder.percentage,
    0
  );

  const flags = [];
  if (mintInfo.mintAuthority) {
    flags.push({
      level: "danger",
      label: "Mint authority active",
      detail: "Creator can mint unlimited new supply at any time.",
    });
  }
  if (mintInfo.freezeAuthority) {
    flags.push({
      level: "danger",
      label: "Freeze authority active",
      detail: "Creator can freeze your wallet's tokens, blocking transfers or sales.",
    });
  }
  if (concentration > 50) {
    flags.push({
      level: "danger",
      label: "Extreme holder concentration",
      detail: `Top 10 wallets hold ${concentration.toFixed(1)}% of supply.`,
    });
  } else if (concentration > 20) {
    flags.push({
      level: "warning",
      label: "High holder concentration",
      detail: `Top 10 wallets hold ${concentration.toFixed(1)}% of supply.`,
    });
  }

  let verdict = "clear";
  if (flags.some((f) => f.level === "danger")) verdict = "danger";
  else if (flags.some((f) => f.level === "warning")) verdict = "warning";

  return {
    mintAddress,
    verdict, // "clear" | "warning" | "danger"
    mintAuthority: mintInfo.mintAuthority,
    freezeAuthority: mintInfo.freezeAuthority,
    concentration,
    supply: mintInfo.supply,
    decimals: mintInfo.decimals,
    flags,
    topHolders,
    holderHistoryAvailable,
    scannedAt: new Date().toISOString(),
  };
}
