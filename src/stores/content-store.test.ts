import { describe, it, expect, beforeEach, vi } from "vitest";
import { useContentStore } from "@/stores/content-store";
import { QUOTES } from "@/lib/content/quotes";
import type { ContentItem } from "@/types";

describe("useContentStore", () => {
  beforeEach(() => {
    useContentStore.setState({
      queue: QUOTES,
      currentIndex: 0,
    });
  });

  it("has correct initial state", () => {
    const state = useContentStore.getState();
    expect(state.queue).toEqual(QUOTES);
    expect(state.currentIndex).toBe(0);
  });

  describe("addToQueue", () => {
    it("appends an item to the queue", () => {
      const newItem: ContentItem = {
        id: "custom-1",
        type: "custom",
        lines: ["HELLO WORLD"],
      };
      useContentStore.getState().addToQueue(newItem);
      const state = useContentStore.getState();
      expect(state.queue).toHaveLength(QUOTES.length + 1);
      expect(state.queue[state.queue.length - 1]).toEqual(newItem);
    });

    it("preserves existing items when adding", () => {
      const newItem: ContentItem = {
        id: "custom-2",
        type: "custom",
        lines: ["TEST"],
      };
      useContentStore.getState().addToQueue(newItem);
      const state = useContentStore.getState();
      // First items should still be the original QUOTES
      expect(state.queue[0]).toEqual(QUOTES[0]);
    });
  });

  describe("removeFromQueue", () => {
    it("removes an item by id", () => {
      const firstQuoteId = QUOTES[0].id;
      useContentStore.getState().removeFromQueue(firstQuoteId);
      const state = useContentStore.getState();
      expect(state.queue).toHaveLength(QUOTES.length - 1);
      expect(state.queue.find((q) => q.id === firstQuoteId)).toBeUndefined();
    });

    it("does nothing when id is not found", () => {
      useContentStore.getState().removeFromQueue("nonexistent-id");
      const state = useContentStore.getState();
      expect(state.queue).toHaveLength(QUOTES.length);
    });
  });

  describe("nextContent", () => {
    it("returns the first item and increments index", () => {
      const item = useContentStore.getState().nextContent();
      expect(item).toEqual(QUOTES[0]);
      expect(useContentStore.getState().currentIndex).toBe(1);
    });

    it("cycles through items sequentially", () => {
      const first = useContentStore.getState().nextContent();
      const second = useContentStore.getState().nextContent();
      expect(first).toEqual(QUOTES[0]);
      expect(second).toEqual(QUOTES[1]);
    });

    it("wraps around when reaching the end of the queue", () => {
      // Set index to last item
      useContentStore.setState({ currentIndex: QUOTES.length - 1 });
      const lastItem = useContentStore.getState().nextContent();
      expect(lastItem).toEqual(QUOTES[QUOTES.length - 1]);

      // Next call should wrap to beginning
      const firstItem = useContentStore.getState().nextContent();
      expect(firstItem).toEqual(QUOTES[0]);
    });

    it("falls back to QUOTES when queue is empty", () => {
      useContentStore.setState({ queue: [], currentIndex: 0 });
      const item = useContentStore.getState().nextContent();
      expect(item).toEqual(QUOTES[0]);
    });
  });

  describe("resetQueue", () => {
    it("resets queue to QUOTES and index to 0", () => {
      // Modify the state
      useContentStore.setState({
        queue: [{ id: "x", type: "custom", lines: ["X"] }],
        currentIndex: 42,
      });

      useContentStore.getState().resetQueue();
      const state = useContentStore.getState();
      expect(state.queue).toEqual(QUOTES);
      expect(state.currentIndex).toBe(0);
    });
  });
});
