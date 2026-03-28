import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DisplayLayout from "@/app/display/layout";

describe("DisplayLayout", () => {
  it("renders children", () => {
    render(
      <DisplayLayout>
        <span data-testid="child">Hello</span>
      </DisplayLayout>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("applies full-screen styles", () => {
    const { container } = render(
      <DisplayLayout>
        <span>content</span>
      </DisplayLayout>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe("100vw");
    expect(wrapper.style.height).toBe("100vh");
    expect(wrapper.style.overflow).toBe("hidden");
  });
});
