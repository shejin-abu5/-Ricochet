/**
 * Initials-fallback avatar, used for team badges and player rows.
 *
 * No image support by design (docs/08): colour + initials beat a logo upload
 * for now. An image URL would arrive here as an optional prop with these
 * initials as its fallback, and every call site would get it for free.
 */

import { colourClasses, type AvatarColour } from './avatarColours'

type AvatarSize = 'sm' | 'md' | 'lg'

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-label',
  md: 'h-10 w-10 text-meta',
  lg: 'h-14 w-14 text-base',
}

interface AvatarProps {
  /** Full name — "Kochi United" becomes "KU". */
  name: string
  colour?: AvatarColour
  size?: AvatarSize
  className?: string
}

/** "Kochi United" → "KU". "Arjun" → "A". */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function Avatar({ name, colour = 'slate', size = 'sm', className = '' }: AvatarProps) {
  return (
    <span
      // aria-hidden: the full name is always rendered beside this, so without
      // it every row announces as "KU, Kochi United".
      aria-hidden="true"
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium ${sizeClasses[size]} ${colourClasses[colour]} ${className}`}
    >
      {initials(name)}
    </span>
  )
}
