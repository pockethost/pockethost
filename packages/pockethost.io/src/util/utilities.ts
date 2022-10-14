export const getRandomElementFromArray = (array: string[]) => {
    return array[Math.floor(Math.random() * array.length)];
}
