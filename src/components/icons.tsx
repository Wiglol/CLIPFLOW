import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Svg({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {children}
    </svg>
  )
}

const Icon = {
  Mark: (props: IconProps) => (
    <Svg {...props}>
      <path
        d="M16.2 7.3c-1.2-1.2-2.9-1.8-4.9-1.8-4 0-6.9 2.9-6.9 7.1s2.9 7.1 6.9 7.1c2 0 3.7-.6 4.9-1.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M13.5 8.7H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
      <path d="M13.5 12H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
      <path d="M13.5 15.3H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
    </Svg>
  ),
  Home: (props: IconProps) => (
    <Svg {...props}>
      <path
        d="M3 10.8 12 3l9 7.8V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Svg>
  ),
  Search: (props: IconProps) => (
    <Svg {...props}>
      <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" />
      <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  ),
  Settings: (props: IconProps) => (
    <Svg {...props}>
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 15a8.5 8.5 0 0 0 .1-1l1.7-1.3-1.6-2.7-2 .7a7.9 7.9 0 0 0-1.7-1l-.3-2.1H9.4l-.3 2.1a7.9 7.9 0 0 0-1.7 1l-2-.7-1.6 2.7L5.5 14a8.5 8.5 0 0 0 0 2l-1.7 1.3 1.6 2.7 2-.7c.5.4 1.1.7 1.7 1l.3 2.1h5.2l.3-2.1c.6-.3 1.2-.6 1.7-1l2 .7 1.6-2.7L19.5 16c0-.3-.1-.7-.1-1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Svg>
  ),
  Plus: (props: IconProps) => (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  ),
  LogIn: (props: IconProps) => (
    <Svg {...props}>
      <path d="M10 17l-1 4h10l-1-4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" opacity="0.0" />
      <path d="M10 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M13 9l3 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  Heart: (props: IconProps) => (
    <Svg {...props}>
      <path
        d="M12 21s-7-4.4-9.3-8.6C.8 8.7 3 6 6 6c1.8 0 3 .9 4 2 1-1.1 2.2-2 4-2 3 0 5.2 2.7 3.3 6.4C19 16.6 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Svg>
  ),
  Message: (props: IconProps) => (
    <Svg {...props}>
      <path
        d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.2 0-2.4-.2-3.4-.6L3 21l1.1-6.1c-.4-1-.6-2.2-.6-3.4A8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Svg>
  ),
  More: (props: IconProps) => (
    <Svg {...props}>
      <path d="M5 12h.01M12 12h.01M19 12h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </Svg>
  ),
  X: (props: IconProps) => (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  ),
  VolumeX: (props: IconProps) => (
    <Svg {...props}>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  ),
  Volume2: (props: IconProps) => (
    <Svg {...props}>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M15.5 9.5a4 4 0 0 1 0 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 7a7 7 0 0 1 0 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
    </Svg>
  ),
  ArrowUp: (props: IconProps) => (
    <Svg {...props}>
      <path d="M12 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  ArrowDown: (props: IconProps) => (
    <Svg {...props}>
      <path d="M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 13l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  UserPlus: (props: IconProps) => (
    <Svg {...props}>
      <path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" />
      <path d="M20 8v6M17 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  ),
  UserMinus: (props: IconProps) => (
    <Svg {...props}>
      <path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" />
      <path d="M17 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  ),
  Flag: (props: IconProps) => (
    <Svg {...props}>
      <path d="M5 3v18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 4h12l-2 4 2 4H5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </Svg>
  ),
  Ban: (props: IconProps) => (
    <Svg {...props}>
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="2" />
      <path d="M6.8 6.8l10.4 10.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  ),
}

export default Icon
