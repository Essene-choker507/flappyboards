import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TVLayout from "@/app/tv/layout";

describe("TVLayout", () => {
  it("renders children", () => {
    render(
      <TVLayout>
        <span data-testid="child">Hello</span>
      </TVLayout>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("applies full-screen styles", () => {
    const { container } = render(
      <TVLayout>
        <span>content</span>
      </TVLayout>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe("100vw");
    expect(wrapper.style.height).toBe("100vh");
    expect(wrapper.style.overflow).toBe("hidden");
  });
});
