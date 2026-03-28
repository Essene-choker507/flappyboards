import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ContentRotator } from "@/lib/content/content-rotator";
import type { ContentItem } from "@/types";

function makeItem(id: string): ContentItem {
  return { id, type: "quote", lines: ["LINE 1", "", "", "", "", ""] };
}

describe("ContentRotator", () => {
  let mathRandomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock Math.random to return a predictable sequence
    // This makes shuffle deterministic
    mathRandomSpy = vi.spyOn(Math, "random");
  });

  afterEach(() => {
    mathRandomSpy.mockRestore();
  });

  describe("constructor", () => {
    it("should create a rotator with given items", () => {
      mathRandomSpy.mockReturnValue(0.5);
      const items = [makeItem("a"), makeItem("b"), makeItem("c")];
      const rotator = new ContentRotator(items);
      // Should be able to call next
      const first = rotator.next();
      expect(first).toBeDefined();
      expect(first.type).toBe("quote");
    });

    it("should copy the items array (not use reference)", () => {
      mathRandomSpy.mockReturnValue(0);
      const items = [makeItem("a"), makeItem("b")];
      const rotator = new ContentRotator(items);
      items.push(makeItem("c"));
      // Rotator should only have 2 items, cycling after 2
      const seen: string[] = [];
      seen.push(rotator.next().id);
      seen.push(rotator.next().id);
      // After 2, calling next triggers reshuffle and resets index
      const third = rotator.next();
      // It should still only know about 2 items
      expect(["a", "b"]).toContain(third.id);
    });

    it("should shuffle on construction", () => {
      // With random returning 0, Fisher-Yates will always swap with index 0
      // For [a, b, c]: i=2: j=0, swap(2,0) -> [c, b, a]; i=1: j=0, swap(1,0) -> [b, c, a]
      // Wait -- j = floor(0 * (i+1)). For i=2: j=floor(0*3)=0, swap(2,0). For i=1: j=floor(0*2)=0, swap(1,0).
      // [a, b, c] -> swap(2,0) -> [c, b, a] -> swap(1,0) -> [b, c, a]
      mathRandomSpy.mockReturnValue(0);
      const items = [makeItem("a"), makeItem("b"), makeItem("c")];
      const rotator = new ContentRotator(items);
      expect(rotator.next().id).toBe("b");
      expect(rotator.next().id).toBe("c");
      expect(rotator.next().id).toBe("a");
    });
  });

  describe("next", () => {
    it("should return items in shuffled order", () => {
      mathRandomSpy.mockReturnValue(0.99);
      // With random ~1, j = floor(0.99 * (i+1)). For i=2: j=floor(2.97)=2 (no swap). For i=1: j=floor(1.98)=1 (no swap).
      // So order stays [a, b, c]
      const items = [makeItem("a"), makeItem("b"), makeItem("c")];
      const rotator = new ContentRotator(items);
      expect(rotator.next().id).toBe("a");
      expect(rotator.next().id).toBe("b");
      expect(rotator.next().id).toBe("c");
    });

    it("should reshuffle and reset when all items have been consumed", () => {
      let callCount = 0;
      mathRandomSpy.mockImplementation(() => {
        callCount++;
        return 0.99; // no-op shuffle (keeps original order)
      });

      const items = [makeItem("a"), makeItem("b")];
      const rotator = new ContentRotator(items);

      // First cycle
      expect(rotator.next().id).toBe("a");
      expect(rotator.next().id).toBe("b");

      // Next call should trigger reshuffle
      const reshuffledFirst = rotator.next();
      expect(reshuffledFirst).toBeDefined();
      expect(["a", "b"]).toContain(reshuffledFirst.id);
    });

    it("should handle single item", () => {
      mathRandomSpy.mockReturnValue(0.5);
      const items = [makeItem("only")];
      const rotator = new ContentRotator(items);
      expect(rotator.next().id).toBe("only");
      expect(rotator.next().id).toBe("only");
      expect(rotator.next().id).toBe("only");
    });

    it("should cycle through all items before reshuffling", () => {
      mathRandomSpy.mockReturnValue(0.99);
      const items = [makeItem("a"), makeItem("b"), makeItem("c")];
      const rotator = new ContentRotator(items);
      const firstCycle = [
        rotator.next().id,
        rotator.next().id,
        rotator.next().id,
      ];
      // All items should appear exactly once
      expect(firstCycle.sort()).toEqual(["a", "b", "c"]);
    });
  });

  describe("setQueue", () => {
    it("should replace the queue and reset index", () => {
      mathRandomSpy.mockReturnValue(0.99);
      const items = [makeItem("a"), makeItem("b")];
      const rotator = new ContentRotator(items);

      rotator.next(); // consume first

      const newItems = [makeItem("x"), makeItem("y"), makeItem("z")];
      rotator.setQueue(newItems);

      // Should now cycle through new items
      const seen = new Set<string>();
      seen.add(rotator.next().id);
      seen.add(rotator.next().id);
      seen.add(rotator.next().id);
      expect(seen).toEqual(new Set(["x", "y", "z"]));
    });

    it("should copy the new items array", () => {
      mathRandomSpy.mockReturnValue(0.99);
      const items = [makeItem("a")];
      const rotator = new ContentRotator(items);

      const newItems = [makeItem("x")];
      rotator.setQueue(newItems);
      newItems.push(makeItem("y")); // modify original

      // Rotator should only have 1 item
      expect(rotator.next().id).toBe("x");
      expect(rotator.next().id).toBe("x"); // cycles back
    });

    it("should shuffle the new queue", () => {
      mathRandomSpy.mockReturnValue(0);
      const items = [makeItem("a")];
      const rotator = new ContentRotator(items);

      // Set new queue with deterministic shuffle
      const newItems = [makeItem("x"), makeItem("y"), makeItem("z")];
      rotator.setQueue(newItems);

      // With random=0 shuffle: [x,y,z] -> swap(2,0)->[z,y,x] -> swap(1,0)->[y,z,x]
      expect(rotator.next().id).toBe("y");
      expect(rotator.next().id).toBe("z");
      expect(rotator.next().id).toBe("x");
    });
  });

  describe("shuffle correctness", () => {
    it("should handle empty queue gracefully in next()", () => {
      mathRandomSpy.mockReturnValue(0.5);
      const items: ContentItem[] = [];
      const rotator = new ContentRotator(items);
      // next() when queue is empty: index >= queue.length (0 >= 0), reshuffle empty, return queue[0] which is undefined
      // This is technically an edge case the class does not guard against, but let's verify it doesn't throw
      const result = rotator.next();
      expect(result).toBeUndefined();
    });

    it("should not shuffle an array of length 1 (loop condition i > 0 fails)", () => {
      let randomCalled = false;
      mathRandomSpy.mockImplementation(() => {
        randomCalled = true;
        return 0.5;
      });

      const items = [makeItem("solo")];
      // Reset the flag after construction (constructor calls shuffle once)
      new ContentRotator(items);
      // Check that random was not called during shuffle of length 1
      // For length 1: loop starts at i = 0, condition i > 0 is false, no iterations
      // But random IS called during constructor for the initial shuffle call
      // Actually for length 1, the for-loop in shuffle has i = queue.length-1 = 0,
      // condition is i > 0 which is false, so Math.random is never called.
      // Let's verify: constructor -> shuffle() -> for(i=0; 0>0; ...) -> no body
      randomCalled = false;
      const rotator2 = new ContentRotator([makeItem("solo2")]);
      void rotator2;
      expect(randomCalled).toBe(false);
    });
  });
});
