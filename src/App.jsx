import { useState } from "react";
import { scanToken } from "./lib/solana";
import Sniffer from "./components/Sniffer";
import "./App.css";

const EXAMPLES = [
  {
    label: "Try USDC",
    address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
];

const SAMPLE_SCANS = [
  {
    token: "CLEAN",
    address: "7xKX…qP8m",
    verdict: "clear",
    title: "Permissions revoked",
    detail: "No mint or freeze authority found. Top 10 hold 14.2%.",
    score: "LOW RISK",
  },
  {
    token: "WATCH",
    address: "D4mQ…3vNz",
    verdict: "warning",
    title: "Concentration is high",
    detail: "Top 10 wallets hold 38.7% of the circulating supply.",
    score: "CHECK MORE",
  },
  {
    token: "FROST",
    address: "9pL2…kT4a",
    verdict: "danger",
    title: "Freeze authority active",
    detail: "The creator still has permission to freeze token accounts.",
    score: "HIGH RISK",
  },
];

const CHECKS = [
  {
    number: "01",
    title: "Mint authority",
    text: "Can the creator print more tokens and dilute the supply?",
    icon: "spark",
  },
  {
    number: "02",
    title: "Freeze authority",
    text: "Can the creator stop wallets from transferring their tokens?",
    icon: "snow",
  },
  {
    number: "03",
    title: "Holder concentration",
    text: "How much of the supply is controlled by the ten largest accounts?",
    icon: "holders",
  },
];

function verdictCopy(verdict) {
  if (verdict === "danger") {
    return {
      eyebrow: "High risk detected",
      title: "Serious rug flags found.",
      sub: "This token keeps dangerous creator permissions or has extreme concentration.",
    };
  }
  if (verdict === "warning") {
    return {
      eyebrow: "Needs a closer look",
      title: "Proceed with caution.",
      sub: "The contract passed some checks, but at least one risk signal needs attention.",
    };
  }
  return {
    eyebrow: "No major flags",
    title: "The basics look clear.",
    sub: "No mint, freeze, or holder concentration red flags were found.",
  };
}

function mascotPose(verdict, freezeAuthority) {
  if (freezeAuthority) return "frozen";
  if (verdict === "danger") return "danger";
  if (verdict === "clear") return "clear";
  return "idle";
}

function Icon({ name }) {
  if (name === "snow") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M8.8 4.8 12 7l3.2-2.2M8.8 19.2 12 17l3.2 2.2" />
      </svg>
    );
  }
  if (name === "holders") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19c.4-4 2.2-6 5.5-6s5.1 2 5.5 6M16 6.5a2.5 2.5 0 0 1 0 5M16.5 13.5c2.4.6 3.7 2.4 4 5.5" />
      </svg>
    );
  }
  if (name === "arrow") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 12h14M14 7l5 5-5 5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="m18.5 15 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
    </svg>
  );
}

export default function App() {
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function runScan(addr) {
    const target = (addr ?? address).trim();
    if (!target || status === "scanning") return;
    setAddress(target);
    setStatus("scanning");
    setError("");
    setResult(null);
    try {
      const scanResult = await scanToken(target);
      setResult(scanResult);
      setStatus("done");
    } catch (scanError) {
      setError(scanError.message || "Scan failed — check the mint address and try again.");
      setStatus("error");
    }
  }

  return (
    <div className="page">
      <header className="topbar shell">
        <a className="wordmark" href="#top" aria-label="Rugout home">
          <span className="fold-icon" />
          Rugout
        </a>
        <nav className="nav-links" aria-label="Primary navigation">
          <a href="#examples">Examples</a>
          <a href="#checks">What we check</a>
          <a href="#how">How it works</a>
        </nav>
        <span className="network-pill"><i /> Solana mainnet</span>
      </header>

      <main id="top">
        <section className="hero shell">
          <div className="hero-glow" />
          <div className="eyebrow"><span>✦</span> Solana token risk scanner</div>
          <h1>Know what’s under the <em>rug.</em></h1>
          <p className="hero-copy">
            One mint address. One straight answer. Rugout checks the token permissions
            and holder concentration that can turn a trade against you.
          </p>

          <div className={`scanner-shell ${status === "scanning" ? "is-scanning" : ""}`}>
            <div className="scanner-label">
              <span>Solana mint address</span>
              <span className="scanner-network">SOL</span>
            </div>
            <div className="scan-box">
              <span className="address-mark">◎</span>
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && runScan()}
                placeholder="Paste a token mint address"
                spellCheck={false}
                aria-label="Solana token mint address"
              />
              <button onClick={() => runScan()} disabled={status === "scanning" || !address.trim()}>
                <span>{status === "scanning" ? "Checking" : "Scan token"}</span>
                <Icon name="arrow" />
              </button>
            </div>

            {status === "scanning" && (
              <div className="scan-progress" role="status">
                <div className="progress-line"><span /></div>
                <span>Checking authorities, holders, and wallet history…</span>
              </div>
            )}
          </div>

          <div className="examples">
            <span>Not sure what to paste?</span>
            {EXAMPLES.map((example) => (
              <button
                key={example.address}
                className="example-chip"
                onClick={() => runScan(example.address)}
              >
                {example.label} <span>↗</span>
              </button>
            ))}
          </div>

          {status === "error" && <div className="error-banner">{error}</div>}
          {result && <VerdictCard result={result} />}

          {!result && status !== "scanning" && (
            <div className="hero-preview" aria-hidden="true">
              <div className="preview-card">
                <div className="preview-top">
                  <div>
                    <span className="preview-kicker">Example scan</span>
                    <strong>JUP</strong>
                  </div>
                  <span className="risk-badge clear">LOW RISK</span>
                </div>
                <div className="preview-score">
                  <div className="score-ring"><span>3</span><small>checks</small></div>
                  <p><strong>No major flags.</strong><br />Permissions look clean and supply is not heavily concentrated.</p>
                </div>
                <div className="mini-checks">
                  <span><i className="good">✓</i> Mint revoked</span>
                  <span><i className="good">✓</i> Freeze revoked</span>
                  <span><i className="good">✓</i> Holders checked</span>
                </div>
              </div>
              <div className="preview-mascot">
                <span className="mascot-note">I found the loose threads.</span>
                <Sniffer pose="clear" size={152} />
              </div>
            </div>
          )}
        </section>

        <section className="proof-section section shell" id="examples">
          <div className="section-heading split-heading">
            <div>
              <span className="section-kicker">See the answer first</span>
              <h2>What a Rugout scan looks like.</h2>
            </div>
            <p>
              No wall of raw blockchain data. Every result turns the important signals
              into a verdict you can understand in seconds.
            </p>
          </div>

          <div className="sample-grid">
            {SAMPLE_SCANS.map((scan) => (
              <article className={`sample-card sample-${scan.verdict}`} key={scan.token}>
                <div className="sample-head">
                  <div className="token-glyph">{scan.token.slice(0, 1)}</div>
                  <div>
                    <strong>{scan.token}</strong>
                    <code>{scan.address}</code>
                  </div>
                  <span className={`risk-badge ${scan.verdict}`}>{scan.score}</span>
                </div>
                <div className="sample-rule" />
                <span className="sample-verdict">{scan.title}</span>
                <p>{scan.detail}</p>
                <div className="sample-footer">
                  <span>Illustrative result</span>
                  <span>View report <b>↗</b></span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="checks-section section" id="checks">
          <div className="shell">
            <div className="section-heading centered-heading">
              <span className="section-kicker">Three checks. One verdict.</span>
              <h2>The risk signals that matter first.</h2>
              <p>Focused enough to understand. Useful enough to stop obvious mistakes.</p>
            </div>

            <div className="checks-grid">
              {CHECKS.map((check) => (
                <article className="check-card" key={check.number}>
                  <div className="check-number">{check.number}</div>
                  <div className="check-icon"><Icon name={check.icon} /></div>
                  <h3>{check.title}</h3>
                  <p>{check.text}</p>
                  <div className="check-status"><i /> Included in every scan</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="how-section section shell" id="how">
          <div className="how-card">
            <div className="how-copy">
              <span className="section-kicker">From mint to meaning</span>
              <h2>One paste. No twelve tabs.</h2>
              <p>
                Rugout reads public Solana account data, tests the core risk signals,
                and translates the result into plain language.
              </p>
            </div>
            <ol className="steps">
              <li><span>1</span><div><strong>Paste the mint</strong><p>Drop in any SPL token mint address.</p></div></li>
              <li><span>2</span><div><strong>Rugout checks it</strong><p>Authorities and top holder concentration are inspected.</p></div></li>
              <li><span>3</span><div><strong>Read the verdict</strong><p>Get the flags, the reason, and the raw values behind them.</p></div></li>
            </ol>
          </div>
        </section>

        <section className="final-cta shell">
          <div className="cta-mascot"><Sniffer pose="idle" size={132} /></div>
          <span className="section-kicker">Check before you trust</span>
          <h2>Paste it before you ape it.</h2>
          <button onClick={() => document.querySelector(".scan-box input")?.focus()}>
            Scan a Solana token <Icon name="arrow" />
          </button>
        </section>
      </main>

      <footer className="footer shell">
        <a className="wordmark" href="#top"><span className="fold-icon" /> Rugout</a>
        <p>Risk signals, not financial advice. Always do your own research.</p>
        <span>Built on public Solana data.</span>
      </footer>
    </div>
  );
}

function VerdictCard({ result }) {
  const copy = verdictCopy(result.verdict);
  const pose = mascotPose(result.verdict, result.freezeAuthority);
  const [holdersOpen, setHoldersOpen] = useState(false);

  return (
    <section className={`verdict-card fold-in verdict-${result.verdict}`}>
      <div className="verdict-summary">
        <div className="result-mascot"><Sniffer pose={pose} size={112} /></div>
        <div>
          <span className="result-eyebrow">{copy.eyebrow}</span>
          <h2>{copy.title}</h2>
          <p className="verdict-sub">{copy.sub}</p>
        </div>
        <span className={`result-badge ${result.verdict}`}>{result.verdict}</span>
      </div>

      <div className="result-grid">
        <div className="flag-list">
          <span className="result-label">What we found</span>
          {result.flags.length === 0 && (
            <div className="flag-row clear">
              <span className="flag-dot">✓</span>
              <div>
                <div className="flag-label">Core checks passed</div>
                <div className="flag-detail">No authority or concentration flags found.</div>
              </div>
            </div>
          )}
          {result.flags.map((flag, index) => (
            <div key={index} className={`flag-row ${flag.level}`}>
              <span className="flag-dot">!</span>
              <div>
                <div className="flag-label">{flag.label}</div>
                <div className="flag-detail">{flag.detail}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="raw-data">
          <span className="result-label">Onchain values</span>
          <div><span>Mint authority</span><code>{result.mintAuthority ? "Active" : "Revoked"}</code></div>
          <div><span>Freeze authority</span><code>{result.freezeAuthority ? "Active" : "Revoked"}</code></div>
          <div><span>Top 10 concentration</span><code>{result.concentration.toFixed(1)}%</code></div>
          <div><span>Token decimals</span><code>{result.decimals}</code></div>
        </div>
      </div>

      <HolderBreakdown
        holders={result.topHolders || []}
        historyAvailable={result.holderHistoryAvailable}
        open={holdersOpen}
        onToggle={() => setHoldersOpen((value) => !value)}
      />

      <div className="result-foot">
        <span>Mint</span>
        <code>{result.mintAddress}</code>
        <span>Scanned just now</span>
      </div>
    </section>
  );
}

function formatTokenAmount(amount) {
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: amount >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: amount >= 1_000_000 ? 2 : 4,
  }).format(amount);
}

function formatEntryTime(timestamp) {
  if (!timestamp) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp * 1000));
}

function HolderBreakdown({ holders, historyAvailable, open, onToggle }) {
  if (!holders.length) return null;

  const topWallet = holders[0]?.percentage || 0;
  const analyzed = holders.filter((holder) => holder.historyStatus === "analyzed").length;
  const sniperSignals = holders.filter((holder) => holder.sniperSignal === "possible").length;
  const bundleSignals = holders.filter((holder) =>
    holder.bundleSignal === "same-transaction" || holder.bundleSignal === "same-slot"
  ).length;
  const lowSolSignals = holders.filter((holder) => holder.lowSolSignal === "detected").length;

  return (
    <section className="holder-intel">
      <button
        className="holder-toggle"
        type="button"
        onClick={onToggle}
        aria-expanded={open}
      >
        <div>
          <span className="result-label">Holder intelligence</span>
          <strong>Inspect the top 10 wallets</strong>
          <small>Ownership, balances, first entry, and linked-wallet signals</small>
        </div>
        <div className="holder-toggle-right">
          <span>{open ? "Hide details" : "View breakdown"}</span>
          <i className={open ? "is-open" : ""}>⌄</i>
        </div>
      </button>

      {open && (
        <div className="holder-panel">
          <div className="holder-stats">
            <div><span>Largest wallet</span><strong>{topWallet.toFixed(2)}%</strong></div>
            <div><span>Possible snipers</span><strong>{sniperSignals}</strong></div>
            <div><span>Bundle links</span><strong>{bundleSignals}</strong></div>
            <div><span>Low-SOL entries</span><strong>{lowSolSignals}</strong></div>
          </div>

          <div className="intel-note">
            <span>Signal logic</span>
            <p>
              “Possible sniper” means the first recorded acquisition was within two minutes
              of mint creation. A bundle link means multiple top holders entered in the same
              transaction or slot. These are investigation signals, not definitive labels.
            </p>
          </div>

          <div className="holder-table">
            <div className="holder-table-head">
              <span>Wallet</span>
              <span>Ownership</span>
              <span>SOL context</span>
              <span>First entry</span>
              <span>Bought via</span>
              <span>Signals</span>
            </div>

            {holders.map((holder) => (
              <article className="holder-row" key={holder.owner}>
                <div className="holder-wallet" data-label="Wallet">
                  <span className="holder-rank">{holder.rank}</span>
                  <div>
                    <a
                      href={`https://solscan.io/account/${holder.owner}`}
                      target="_blank"
                      rel="noreferrer"
                      title={holder.owner}
                    >
                      {holder.ownerShort} ↗
                    </a>
                    <small>{holder.tokenAccounts.length} token account{holder.tokenAccounts.length > 1 ? "s" : ""}</small>
                  </div>
                </div>

                <div className="holder-share" data-label="Ownership">
                  <div>
                    <strong>{holder.percentage.toFixed(2)}%</strong>
                    <small>{formatTokenAmount(holder.tokenAmount)} tokens</small>
                  </div>
                  <span><i style={{ width: `${Math.min(100, holder.percentage * 2.5)}%` }} /></span>
                </div>

                <div className="holder-sol" data-label="SOL context">
                  <strong>
                    {holder.preEntrySol == null ? "—" : `${holder.preEntrySol.toFixed(3)} SOL`}
                  </strong>
                  <small>
                    {holder.preEntrySol == null
                      ? holder.currentSol == null ? "Unavailable" : `${holder.currentSol.toFixed(2)} SOL now`
                      : "before first entry"}
                  </small>
                </div>

                <div className="holder-entry" data-label="First entry">
                  <strong>{formatEntryTime(holder.firstEntryTime)}</strong>
                  <small>
                    {holder.secondsAfterMint == null
                      ? "Timing unavailable"
                      : holder.secondsAfterMint < 60
                        ? `${holder.secondsAfterMint}s after mint`
                        : `${Math.round(holder.secondsAfterMint / 60)}m after mint`}
                  </small>
                </div>

                <div className="holder-venue" data-label="Bought via">
                  <strong>{holder.venue === "Unknown venue" ? "Unresolved" : holder.venue}</strong>
                  <small>
                    {holder.venue === "Unknown venue"
                      ? "No identifiable venue"
                      : "Onchain execution route"}
                  </small>
                </div>

                <div className="holder-signals" data-label="Signals">
                  {holder.historyStatus !== "analyzed" && (
                    <span className="signal unknown">History unknown</span>
                  )}
                  {holder.sniperSignal === "possible" && (
                    <span className="signal danger">Possible sniper</span>
                  )}
                  {holder.bundleSignal === "same-transaction" && (
                    <span className="signal danger">Same transaction</span>
                  )}
                  {holder.bundleSignal === "same-slot" && (
                    <span className="signal warning">Same-slot link</span>
                  )}
                  {holder.lowSolSignal === "detected" && (
                    <span className="signal warning">Low SOL before entry</span>
                  )}
                </div>
              </article>
            ))}
          </div>

          <div className="holder-panel-foot">
            <span>
              {historyAvailable
                ? `${analyzed}/10 wallets had enough history to analyze`
                : "Wallet history unavailable on the current RPC plan"}
            </span>
            <span>Liquidity vaults excluded. Token accounts grouped by owner.</span>
          </div>
        </div>
      )}
    </section>
  );
}
