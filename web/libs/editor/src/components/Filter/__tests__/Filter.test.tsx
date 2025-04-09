import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Filter } from "../Filter";

// Fix the ResizeObserver mock structure
const resizeObserverMock = () => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
});

window.ResizeObserver = jest.fn().mockImplementation(resizeObserverMock);
window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe("Filter", () => {
  const mockOnChange = jest.fn();
  const filterData = [{ labelName: "AirPlane" }, { labelName: "Car" }, { labelName: "AirCar" }];

  const availableFilters = [
    {
      label: "Annotation results",
      path: "labelName",
      type: "String",
    },
    {
      label: "Confidence score",
      path: "score",
      type: "Number",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Validate if filter is rendering", () => {
    render(<Filter onChange={mockOnChange} filterData={filterData} availableFilters={availableFilters} />);

    expect(screen.getByText("Filter")).toBeInTheDocument();
  });

  test("Should delete row when delete button is clicked", () => {
    render(<Filter onChange={mockOnChange} filterData={filterData} availableFilters={availableFilters} />);

    // Open filter dropdown
    fireEvent.click(screen.getByText("Filter"));

    // Add two filter rows
    const addButton = screen.getByText("Add Filter");
    fireEvent.click(addButton);
    fireEvent.click(addButton);

    // Check and change logic selector
    const selectBox = screen.getByTestId("logic-dropdown");
    expect(selectBox).toHaveTextContent("And");

    fireEvent.click(selectBox);
    fireEvent.click(screen.getByText("Or"));
    expect(selectBox).toHaveTextContent("Or");

    // Delete one row and check if only one remains
    fireEvent.click(screen.getByTestId("delete-row-1"));
    expect(screen.getAllByTestId("filter-row")).toHaveLength(1);
  });

  test("Should filter the content", () => {
    let filteredContent: any;

    render(
      <Filter
        onChange={(value) => {
          filteredContent = value;
        }}
        filterData={filterData}
        availableFilters={availableFilters}
      />,
    );

    // Open filter dropdown
    fireEvent.click(screen.getByText("Filter"));
    expect(screen.getByText("No filters applied")).toBeInTheDocument();

    // Add filter row
    fireEvent.click(screen.getByText("Add Filter"));

    // Check dropdowns have correct initial values
    const fieldDropdown = screen.getByTestId("field-dropdown");
    const operationDropdown = screen.getByTestId("operation-dropdown");
    expect(fieldDropdown).toHaveTextContent("Annotation results");

    // Select operation
    fireEvent.click(operationDropdown);
    fireEvent.click(screen.getByText("not contains"));
    expect(operationDropdown).toHaveTextContent("not contains");

    // Input filter value
    const filterInput = screen.getByTestId("filter-input");
    expect(filterInput).toBeInTheDocument();
    fireEvent.change(filterInput, { target: { value: "Plane" } });

    // Verify filtered content
    expect(filteredContent).toStrictEqual([{ labelName: "Car" }, { labelName: "AirCar" }]);
  });

  test("Should hide dropdown filter", async () => {
    render(
      <Filter onChange={mockOnChange} filterData={filterData} animated={false} availableFilters={availableFilters} />,
    );

    // Open filter dropdown
    const filterButton = screen.getByText("Filter");
    fireEvent.click(filterButton);

    // Wait for dropdown to appear
    const dropdown = await screen.findByTestId("dropdown");
    expect(dropdown.classList.contains("dm-visible")).toBe(true);

    // Add filter and close dropdown
    fireEvent.click(screen.getByText("Add Filter"));
    fireEvent.click(filterButton);

    // Wait for dropdown to disappear
    await waitFor(() => {
      expect(dropdown.classList.contains("dm-visible")).toBe(false);
    });

    expect(dropdown.classList.contains("dm-before-appear")).toBe(false);
    expect(dropdown.classList.contains("dm-before-disappear")).toBe(false);
  });

  test("Should show filter length badge", () => {
    render(<Filter onChange={mockOnChange} filterData={filterData} availableFilters={availableFilters} />);

    // Open filter dropdown
    fireEvent.click(screen.getByText("Filter"));
    expect(screen.getByText("No filters applied")).toBeInTheDocument();

    // Add two filter rows
    const addButton = screen.getByText("Add Filter");
    fireEvent.click(addButton);
    fireEvent.click(addButton);

    // Check badge shows correct count
    const filterLength = screen.getByTestId("filter-length");
    expect(filterLength).toHaveTextContent("2");
  });

  test("Filter button should be selected when active", () => {
    render(<Filter onChange={mockOnChange} filterData={filterData} availableFilters={availableFilters} />);

    // Click filter button
    const filterButton = screen.getByTestId("filter-button");
    fireEvent.click(filterButton);

    // Check active class is applied
    expect(filterButton.classList.contains("dm-filter-button_active")).toBe(true);
  });
});
