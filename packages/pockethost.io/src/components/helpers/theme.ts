import { assertTruthy } from '@pockethost/common'
import { find } from '@s-libs/micro-dash'
import Cookies from 'js-cookie'

// Set some default values to be referenced later
export enum ThemeNames {
  Light = 'light',
  Dark = 'dark'
}
export const HLJS_THEMES = {
  [ThemeNames.Light]:
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/default.min.css',
  [ThemeNames.Dark]:
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/a11y-dark.min.css'
}
export const ALLOWED_THEMES: ThemeNames[] = [ThemeNames.Light, ThemeNames.Dark]
export const DEFAULT_THEME: ThemeNames = ThemeNames.Light
export const STORAGE_NAME: string = 'theme'
export const THEME_ATTRIBUTE: string = 'data-bs-theme'
export const THEME_ICONS: { [_ in ThemeNames]: string } = {
  [ThemeNames.Light]: 'bi bi-moon-stars',
  [ThemeNames.Dark]: 'bi bi-brightness-high'
}

export const html = () => {
  const htmlElement = document.querySelector('html')
  assertTruthy(htmlElement, `Expected <html> element to exist`)
  return htmlElement
}

export const getCurrentTheme = () => {
  const savedTheme = Cookies.get(STORAGE_NAME)
  const currentTheme = find(ALLOWED_THEMES, (v) => savedTheme === v) || DEFAULT_THEME
  return currentTheme
}

export const currentIcon = () => {
  return THEME_ICONS[getCurrentTheme()]
}

export const setCurrentTheme = (themeName: ThemeNames) => {
  html().setAttribute(THEME_ATTRIBUTE, themeName)
  const theme = document.querySelector<HTMLLinkElement>('#hljs-link')
  if (theme) {
    theme.href = HLJS_THEMES[themeName]
  }
  console.log(theme, themeName)
  Cookies.set(STORAGE_NAME, themeName)
}
