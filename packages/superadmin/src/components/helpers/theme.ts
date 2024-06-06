import { assertTruthy } from 'pockethost'

export const html = () => {
  const htmlElement = document.querySelector('html')
  assertTruthy(htmlElement, `Expected <html> element to exist`)
  return htmlElement
}
