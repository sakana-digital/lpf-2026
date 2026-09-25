import { cva } from '@styled/css'

export const signageBadge = cva({
  base: {
    display: 'grid',
    placeItems: 'center',
    minHeight: '2.2cqw',
    padding: '0.14cqw 0.3cqw',
    border: '0.1cqw solid token(colors.signage.ink)',
    fontSize: '1.15cqw',
    lineHeight: 1.15,
    textAlign: 'center',
  },
  variants: {
    tone: {
      good: { background: 'signage.good', color: 'signage.ink' },
      warn: { background: 'signage.warn', color: 'signage.ink' },
      bad: { background: 'signage.bad', color: 'signage.paper' },
      soldout: { background: 'signage.soldout', color: 'signage.paper' },
      pause: { background: 'signage.pause', color: 'signage.ink' },
      muted: { borderColor: 'currentColor', color: 'signage.muted' },
    },
  },
})
