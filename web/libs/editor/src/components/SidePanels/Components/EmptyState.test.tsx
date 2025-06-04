import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

const icon = <svg data-testid="icon" />;
const header = "Test Header";
const description = <>Test description</>;
const learnMore = { href: "https://docs.example.com", text: "Learn more", testId: "test-learn-more-link" };

describe("EmptyState", () => {
  it("renders icon, header, description, and learn more link", () => {
    render(<EmptyState icon={icon} header={header} description={description} learnMore={learnMore} />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByText(header)).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /learn more/i });
    expect(link).toHaveAttribute("href", learnMore.href);
    expect(link).toHaveAttribute("data-testid", learnMore.testId);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("does not render learn more link if not provided", () => {
    render(<EmptyState icon={icon} header={header} description={description} />);
    expect(screen.queryByRole("link", { name: /learn more/i })).not.toBeInTheDocument();
  });

  it("does not render data-testid if not provided", () => {
    render(
      <EmptyState
        icon={icon}
        header={header}
        description={description}
        learnMore={{ href: learnMore.href, text: learnMore.text }}
      />,
    );
    const link = screen.getByRole("link", { name: /learn more/i });
    expect(link).not.toHaveAttribute("data-testid");
  });

  it("hides learn more link in whitelabel mode", () => {
    // @ts-ignore
    window.APP_SETTINGS = { whitelabel_is_active: true };
    render(<EmptyState icon={icon} header={header} description={description} learnMore={learnMore} />);
    expect(screen.queryByRole("link", { name: /learn more/i })).not.toBeInTheDocument();
    // Clean up
    // @ts-ignore
    delete window.APP_SETTINGS;
  });
});
