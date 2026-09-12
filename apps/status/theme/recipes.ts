import { defineRecipe } from '@pandacss/dev'

const sectionLabel = defineRecipe({
  className: 'section-label',
  base: {
    color: 'textMute',
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '0.08em',
  },
})

const hint = defineRecipe({
  className: 'hint',
  base: { color: 'textMute', fontSize: '12px' },
})

/** The heading of a block inside a window, one step below the window title. */
const blockHeading = defineRecipe({
  className: 'block-heading',
  base: { marginBottom: '12px', fontSize: '15px', lineHeight: 1.2 },
})

const button = defineRecipe({
  className: 'button',
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    height: '36px',
    padding: '0 14px',
    fontSize: '13px',
    fontWeight: 'bold',
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    transition:
      'background token(durations.base) ease, color token(durations.base) ease, transform token(durations.fast) ease',
    '&:active:not(:disabled)': { transform: 'scale(0.98)' },
    _disabled: { opacity: 0.4, cursor: 'not-allowed' },
  },
  variants: {
    variant: {
      primary: {
        border: '1px solid token(colors.accent)',
        background: 'accent',
        color: 'onAccent',
        '&:hover:not(:disabled)': { background: 'accentStrong' },
      },
      outline: {
        border: '1px solid token(colors.borderStrong)',
        '&:hover:not(:disabled)': { background: 'surfaceSoft' },
      },
      ghost: {
        border: '1px solid transparent',
        color: 'textMute',
        '&:hover:not(:disabled)': { background: 'surfaceSoft', color: 'text' },
        '&[aria-pressed=true]': { background: 'surfaceSoft', color: 'text' },
      },
      danger: {
        border: '1px solid token(colors.status.soldout)',
        background: 'status.soldout',
        color: '#fff',
        '&:hover:not(:disabled)': { filter: 'brightness(1.1)' },
      },
    },
    size: {
      md: {},
      sm: { height: '30px', padding: '0 10px', fontSize: '12px' },
    },
  },
  defaultVariants: { variant: 'outline', size: 'md' },
})

const control = defineRecipe({
  className: 'control',
  base: {
    width: '100%',
    minWidth: 0,
    minHeight: '36px',
    padding: '8px 10px',
    border: '1px solid token(colors.border)',
    background: 'surfaceSoft',
    color: 'text',
    font: 'inherit',
    fontSize: '13px',
    lineHeight: 1.4,
    // Under 16px iOS Safari zooms into a focused field.
    '@media (pointer: coarse)': { fontSize: '16px' },
    transition: 'border-color token(durations.base) ease',
    _hover: { borderColor: 'borderStrong' },
  },
})

const resultBadge = defineRecipe({
  className: 'result',
  base: {
    width: 'fit-content',
    padding: '6px 12px',
    background: 'status.goodSoft',
    color: 'status.good',
    fontSize: '12px',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  variants: {
    tone: {
      ok: {},
      error: { background: 'status.badSoft', color: 'status.bad' },
    },
  },
  defaultVariants: { tone: 'ok' },
})

/** The settings surface: cells on a 1px grid whose gaps are the dividing lines. */
const paneGrid = defineRecipe({
  className: 'pane-grid',
  base: { display: 'grid', gap: '1px', background: 'border' },
  variants: {
    columns: {
      one: {},
      two: {
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        '@container workspace (max-width: 820px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
      },
    },
  },
  defaultVariants: { columns: 'one' },
})

const paneCell = defineRecipe({
  className: 'pane-cell',
  base: { minWidth: 0, padding: '18px 16px 16px', background: 'surface' },
})

/** The 40px bar a pane or window is titled by. */
const paneTitle = defineRecipe({
  className: 'pane-title',
  base: {
    gridColumn: '1 / -1',
    height: '40px',
    padding: '0 14px',
    lineHeight: '40px',
    background: 'surface',
    fontSize: '13px',
    fontWeight: 'bold',
    letterSpacing: '0.06em',
  },
})

export const recipes = {
  sectionLabel,
  hint,
  blockHeading,
  button,
  control,
  resultBadge,
  paneGrid,
  paneCell,
  paneTitle,
}
