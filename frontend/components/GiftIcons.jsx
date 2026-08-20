// Ícones em traço fino, no estilo do tema (roxo com detalhe dourado).
// Cada ícone é um SVG 48x48 com stroke em currentColor.

function Sparkle({ cx, cy, r = 2.2 }) {
  return <circle cx={cx} cy={cy} r={r} fill="var(--gold)" />
}

export function SneakerIcon(props) {
  return (
    <svg viewBox="0 0 48 48" fill="none" {...props}>
      <path
        d="M6 30c0-3 2-5 5-6.5l9-4.5c2-1 3-3 3-5.5V11c3 0 5 1.5 6 4l1 3c1 3 3 5 6 6l6 2.5c2 .8 3 2 3 4v3.5c0 2-1.5 3.5-3.5 3.5H9.5C7.5 37 6 35.5 6 33.5V30Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M23 14c1.5 2.5 4 4.5 7 5.5M14 24l3-4M19 26l3-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <Sparkle cx={37} cy={12} />
    </svg>
  )
}

export function ShirtIcon(props) {
  return (
    <svg viewBox="0 0 48 48" fill="none" {...props}>
      <path
        d="M17 8 10 12l-4 7 5 4 2-3v18c0 1.5 1 2.5 2.5 2.5h17c1.5 0 2.5-1 2.5-2.5V20l2 3 5-4-4-7-7-4c-1.5 2-3.5 3-7 3s-5.5-1-7-3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Sparkle cx={34} cy={10} />
    </svg>
  )
}

export function ShortsIcon(props) {
  return (
    <svg viewBox="0 0 48 48" fill="none" {...props}>
      <path
        d="M9 10h30l1.5 13-1.5 15c-.2 1.3-1.3 2-2.5 1.8L27 38l-1.5-13L24 38h-.5L21 38l-9.5 1.8c-1.2.2-2.3-.5-2.5-1.8L7.5 23 9 10Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9 16h30" stroke="currentColor" strokeWidth="1.6" />
      <Sparkle cx={38} cy={9} />
    </svg>
  )
}

export function RingsIcon(props) {
  return (
    <svg viewBox="0 0 48 48" fill="none" {...props}>
      <circle cx={17} cy={29} r={8} stroke="currentColor" strokeWidth="2" />
      <path d="M17 21 13 12h8l-4 9Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx={32} cy={31} r={6.5} stroke="currentColor" strokeWidth="2" />
      <path d="M32 24.5 29 17h6l-3 7.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <Sparkle cx={41} cy={12} r={2.4} />
    </svg>
  )
}

export function PerfumeIcon(props) {
  return (
    <svg viewBox="0 0 48 48" fill="none" {...props}>
      <path
        d="M17 20h14v14a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4V20Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M20 20v-4h8v4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <rect x={21} y={9} width={6} height={4} rx={1} stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M31 15c3 1 5 2.5 5 4.5S34 22.5 31 22"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M22 27h4M22 31h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <Sparkle cx={39} cy={15} />
    </svg>
  )
}

export function DressIcon(props) {
  return (
    <svg viewBox="0 0 48 48" fill="none" {...props}>
      <path
        d="M19 8h10l2 8-3-1.5V19l9 17c.8 1.5-.2 3-2 3H15c-1.8 0-2.8-1.5-2-3l9-17v-4.5L19 16l0-8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M21 19h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <Sparkle cx={36} cy={11} />
    </svg>
  )
}

export function PixIcon(props) {
  return (
    <svg viewBox="0 0 48 48" fill="none" {...props}>
      <path
        d="M24 6 32 14a4 4 0 0 1 0 5.6L24 28l-8-8.4a4 4 0 0 1 0-5.6L24 6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M24 20 32 28a4 4 0 0 1 0 5.6L24 42l-8-8.4a4 4 0 0 1 0-5.6L24 20Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Sparkle cx={38} cy={10} />
    </svg>
  )
}
