// Sniffer — the Rugout mascot. Flat, single-outline, no gradients.
// Poses: "idle" (peeking, scanning), "danger" (recoil, X eyes), "clear" (thumbs up), "frozen" (freeze authority gag)

export default function Sniffer({ pose = "idle", size = 96 }) {
  const outline = "#17140F";
  const body = "#E0A93B";

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* rug corner */}
      <path
        d="M0 90 L120 90 L120 120 L0 120 Z"
        fill="#3A2E1A"
        stroke={outline}
        strokeWidth="3"
      />
      <path
        d={pose === "idle" ? "M0 90 L40 60 L70 90 Z" : "M0 90 L48 55 L82 90 Z"}
        fill="#4A3A20"
        stroke={outline}
        strokeWidth="3"
        style={{ transition: "d 0.3s ease" }}
      />

      {/* body blob */}
      {pose === "frozen" ? (
        <>
          <ellipse cx="60" cy="72" rx="30" ry="26" fill="#BFE8F5" stroke={outline} strokeWidth="3" />
          <path d="M40 55 L48 62 M80 55 L72 62 M45 90 L52 82 M75 90 L68 82" stroke="#7FCBE0" strokeWidth="2" />
        </>
      ) : (
        <ellipse cx="60" cy="72" rx="30" ry="26" fill={body} stroke={outline} strokeWidth="3" />
      )}

      {/* eyes */}
      {pose === "danger" && (
        <g stroke={outline} strokeWidth="4" strokeLinecap="round">
          <path d="M46 62 L56 72 M56 62 L46 72" />
          <path d="M64 62 L74 72 M74 62 L64 72" />
        </g>
      )}
      {pose === "clear" && (
        <g>
          <path d="M44 66 Q50 60 56 66" stroke={outline} strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M64 66 Q70 60 76 66" stroke={outline} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </g>
      )}
      {(pose === "idle" || pose === "frozen") && (
        <g>
          <circle cx="50" cy="67" r="7" fill={outline} />
          <circle cx="70" cy="67" r="7" fill={outline} />
          <circle cx="52" cy="65" r="2" fill="#F3EFE6" />
          <circle cx="72" cy="65" r="2" fill="#F3EFE6" />
        </g>
      )}

      {/* thumbs up arm for clear pose */}
      {pose === "clear" && (
        <g>
          <rect x="84" y="70" width="10" height="16" rx="4" fill={body} stroke={outline} strokeWidth="2.5" />
          <circle cx="89" cy="66" r="6" fill={body} stroke={outline} strokeWidth="2.5" />
        </g>
      )}
    </svg>
  );
}
