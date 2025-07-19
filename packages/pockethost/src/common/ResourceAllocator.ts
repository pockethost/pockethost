export type Deallocator = () => void

export type Allocator<T> = {
  free: (item: T) => void
  alloc: () => [T, Deallocator]
}

export function ResourceAllocator<T>(initialPoolSize: number, initializer: () => T): Allocator<T> {
  // Available queue to hold resolved items of type T
  const available: T[] = []

  // Function to add an item back to the available queue
  const free = (item: T) => {
    available.push(item)
  }

  // Pre-populate the available queue with initial items
  for (let i = 0; i < initialPoolSize; i++) {
    available.push(initializer())
  }

  return {
    alloc() {
      if (available.length === 0) {
        available.push(initializer())
      }
      const newItem = initializer()
      return [newItem, () => free(newItem)]
    },
    free,
  }
}

/*
// Example Usage
const allocator = PromiseAllocator(2, async () => {
    return new Promise<number>((resolve) => {
        setTimeout(() => resolve(Math.random()), 1000);
    });
});

allocator.alloc().then(([num, freeFunc]) => {
    console.log(num);  // e.g. 0.123456789
    freeFunc();  // Adds the number back to the available queue
});
*/
