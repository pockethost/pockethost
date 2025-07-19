import { wordList } from './wordList'

const shortestWordSize = wordList.reduce((shortestWord, currentWord) =>
  currentWord.length < shortestWord.length ? currentWord : shortestWord
).length

const longestWordSize = wordList.reduce((longestWord, currentWord) =>
  currentWord.length > longestWord.length ? currentWord : longestWord
).length

export function generate(options: any) {
  // initalize random number generator for words if options.seed is provided

  const { minLength, maxLength, ...rest } = options || {}

  function word() {
    let min = typeof minLength !== 'number' ? shortestWordSize : limitWordSize(minLength)

    const max = typeof maxLength !== 'number' ? longestWordSize : limitWordSize(maxLength)

    if (min > max) min = max

    let rightSize = false
    let wordUsed
    while (!rightSize) {
      wordUsed = generateRandomWord()
      rightSize = wordUsed.length <= max && wordUsed.length >= min
    }
    return wordUsed
  }

  function generateRandomWord() {
    return wordList[randInt(wordList.length)]!
  }

  // limits the size of words to the minimum and maximum possible
  function limitWordSize(wordSize: number) {
    if (wordSize < shortestWordSize) wordSize = shortestWordSize
    if (wordSize > longestWordSize) wordSize = longestWordSize
    return wordSize
  }

  // random int as seeded by options.seed if applicable, or Math.random() otherwise
  function randInt(lessThan: number) {
    const r = Math.random()
    return Math.floor(r * lessThan)
  }

  // No arguments = generate one word
  if (options === undefined) {
    return word()
  }

  // Just a number = return that many words
  if (typeof options === 'number') {
    options = { exactly: options }
  } else if (Object.keys(rest).length === 0) {
    return word()
  }

  // options supported: exactly, min, max, join
  if (options.exactly) {
    options.min = options.exactly
    options.max = options.exactly
  }

  // not a number = one word par string
  if (typeof options.wordsPerString !== 'number') {
    options.wordsPerString = 1
  }

  //not a function = returns the raw word
  if (typeof options.formatter !== 'function') {
    options.formatter = (word: string) => word
  }

  //not a string = separator is a space
  if (typeof options.separator !== 'string') {
    options.separator = ' '
  }

  const total = options.min + randInt(options.max + 1 - options.min)
  let results: any = []
  let token = ''
  let relativeIndex = 0

  for (let i = 0; i < total * options.wordsPerString; i++) {
    if (relativeIndex === options.wordsPerString - 1) {
      token += options.formatter(word(), relativeIndex)
    } else {
      token += options.formatter(word(), relativeIndex) + options.separator
    }
    relativeIndex++
    if ((i + 1) % options.wordsPerString === 0) {
      results.push(token)
      token = ''
      relativeIndex = 0
    }
  }
  if (typeof options.join === 'string') {
    results = results.join(options.join)
  }

  return results
}

export function count(options: any) {
  let { minLength, maxLength } = options || {}

  if (typeof minLength !== 'number') {
    minLength = shortestWordSize
  }

  if (typeof maxLength !== 'number') {
    maxLength = longestWordSize
  }

  return wordList.filter((word) => word.length >= minLength && word.length <= maxLength).length
}
