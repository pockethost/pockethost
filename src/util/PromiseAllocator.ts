export type Allocator<T> = {
  free: (item: T) => void
  alloc: () => Promise<[T, () => void]>
}

export type PortReleaser = () => void
export function PromiseAllocator<T>(
  initialPoolSize: number,
  initializer: () => Promise<T>,
): Allocator<T> {
  // Available queue to hold resolved items of type T
  const available: T[] = []

  // Function to add an item back to the available queue
  const free = (item: T) => {
    available.push(item)
  }

  // Pre-populate the available queue with initial items
  for (let i = 0; i < initialPoolSize; i++) {
    initializer().then((item) => {
      available.push(item)
    })
  }

  const alloc = async (): Promise<[T, PortReleaser]> => {
    // If an item is available, return it along with the free function
    if (available.length > 0) {
      const item = available.pop()
      if (item) {
        return [item, () => free(item)]
      }
    }

    // If no items are available, wait for a new initializer call and return it
    const newItem = await initializer()
    return [newItem, () => free(newItem)]
  }

  return {
    alloc,
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
