import { assertTruthy } from 'pockethost/common'

export const html = () => {
  const htmlElement = document.querySelector('html')
  assertTruthy(htmlElement, `Expected <html> element to exist`)
  return htmlElement
}
