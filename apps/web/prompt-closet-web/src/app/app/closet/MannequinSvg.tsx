export default function MannequinSvg({
  gender,
}: {
  gender: "female" | "male";
}) {
  return (
    <svg
      viewBox="0 0 300 500"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%" }}
      aria-label={`${gender} mannequin silhouette`}
    >
      {gender === "female" ? (
        <g fill="#1A1A1A">
          {/* Head */}
          <ellipse cx="150" cy="52" rx="38" ry="44" />
          {/* Neck */}
          <rect x="136" y="92" width="28" height="22" rx="4" />
          {/* Left arm */}
          <path d="M60 118 Q38 200 42 300 L62 298 Q62 200 82 122 Z" />
          {/* Right arm */}
          <path d="M240 118 Q262 200 258 300 L238 298 Q238 200 218 122 Z" />
          {/* Torso — hourglass */}
          <path d="M64 114 Q150 100 236 114 L228 210 Q200 232 150 238 Q100 232 72 210 Z" />
          {/* Hips */}
          <path d="M72 210 Q100 232 150 238 Q200 232 228 210 L235 290 Q200 308 150 312 Q100 308 65 290 Z" />
          {/* Left leg */}
          <path d="M65 290 Q58 390 62 490 L98 490 Q100 390 150 312 Z" />
          {/* Right leg */}
          <path d="M235 290 Q242 390 238 490 L202 490 Q200 390 150 312 Z" />
        </g>
      ) : (
        <g fill="#1A1A1A">
          {/* Head */}
          <ellipse cx="150" cy="50" rx="36" ry="42" />
          {/* Neck */}
          <rect x="136" y="88" width="28" height="22" rx="4" />
          {/* Left arm */}
          <path d="M52 112 Q28 198 32 300 L54 298 Q56 198 76 118 Z" />
          {/* Right arm */}
          <path d="M248 112 Q272 198 268 300 L246 298 Q244 198 224 118 Z" />
          {/* Torso — broad shoulders, straighter sides */}
          <path d="M54 108 Q150 96 246 108 L238 220 Q204 234 150 238 Q96 234 62 220 Z" />
          {/* Hips — narrower */}
          <path d="M62 220 Q96 234 150 238 Q204 234 238 220 L232 295 Q200 308 150 312 Q100 308 68 295 Z" />
          {/* Left leg */}
          <path d="M68 295 Q60 392 64 490 L100 490 Q102 392 150 312 Z" />
          {/* Right leg */}
          <path d="M232 295 Q240 392 236 490 L200 490 Q198 392 150 312 Z" />
        </g>
      )}
    </svg>
  );
}
