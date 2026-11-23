"use client";

/** the Flora-Synth mark: five petals round a dark center ringed with stamens */
export function Mark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <g fill="currentColor">
        {[0, 72, 144, 216, 288].map((r) => (
          <ellipse key={r} cx="32" cy="17" rx="9" ry="15" transform={`rotate(${r} 32 32)`} />
        ))}
      </g>
      <circle cx="32" cy="32" r="6.5" fill="var(--mark-center, #2a0a1c)" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((r) => (
        <circle key={r} cx="32" cy="23.5" r="1.6" fill="var(--mark-center, #2a0a1c)" transform={`rotate(${r} 32 32)`} />
      ))}
    </svg>
  );
}
