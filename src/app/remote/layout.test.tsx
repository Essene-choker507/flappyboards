import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RemoteLayout from "@/app/remote/layout";

describe("RemoteLayout", () => {
  it("renders children", () => {
    render(
      <RemoteLayout>
        <span data-testid="child">Hello</span>
      </RemoteLayout>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("applies layout styles", () => {
    const { container } = render(
      <RemoteLayout>
        <span>content</span>
      </RemoteLayout>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.minHeight).toBe("100vh");
    expect(wrapper.style.padding).toBe("40px 0px");
  });
});
