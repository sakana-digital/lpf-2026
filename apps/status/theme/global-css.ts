import { defineGlobalStyles } from '@pandacss/dev'

export const globalCss = defineGlobalStyles({
  html: {
    colorScheme: 'dark',
    background: 'background',
    _osLight: { colorScheme: 'light' },
  },
  '*, *::before, *::after': {
    boxSizing: 'border-box',
    margin: 0,
    WebkitTapHighlightColor: 'transparent',
  },
  body: {
    minHeight: '100svh',
    minWidth: '320px',
    background: 'background',
    color: 'text',
    fontFamily: 'body',
    lineHeight: 1.6,
    WebkitFontSmoothing: 'antialiased',
  },
  "input[type='checkbox'], input[type='radio']": {
    width: '16px',
    height: '16px',
    accentColor: 'accent',
    cursor: 'pointer',
  },
  button: {
    fontFamily: 'inherit',
    fontWeight: 'bold',
    color: 'inherit',
    border: 'none',
    background: 'transparent',
    appearance: 'none',
    touchAction: 'manipulation',
    _disabled: { cursor: 'not-allowed' },
  },
  // Checkboxes and radios are wrapped by their label, so the browser default is left alone.
  ':is(button, select, textarea, input:not([type=checkbox], [type=radio])):focus-visible': {
    outline: '2px solid token(colors.accent)',
    outlineOffset: '2px',
  },
})
