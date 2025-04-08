import { FilterRow } from "../FilterRow";
import { fireEvent, render, screen } from "@testing-library/react";

const resizeObserverMock = () => ({
  observe: () => null,
  disconnect: () => null,
  unobserve: () => null,
});

window.ResizeObserver = jest.fn().mockImplementation(resizeObserverMock);
window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe("FilterRow", () => {
  const mockOnChange = jest.fn();
  const mockOnDelete = jest.fn();
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

  test('should display "Where" when index is 0', () => {
    const { getByText } = render(
      <FilterRow
        field=""
        operation=""
        value=""
        logic="and"
        availableFilters={availableFilters}
        index={0}
        onChange={mockOnChange}
        onDelete={mockOnDelete}
      />,
    );

    expect(getByText("Where")).toBeInTheDocument();
  });

  test('should display "And" by default when index is greater than 0', () => {
    const { getByTestId } = render(
      <FilterRow
        field=""
        operation=""
        value=""
        logic="and"
        availableFilters={availableFilters}
        index={1}
        onChange={mockOnChange}
        onDelete={mockOnDelete}
      />,
    );

    const selectBox = getByTestId("logic-dropdown");
    expect(selectBox.textContent).toBe("And");
  });

  test('should change logic from "And" to "Or" when selected', () => {
    const { getByTestId } = render(
      <FilterRow
        field=""
        operation=""
        value=""
        logic="and"
        availableFilters={availableFilters}
        index={1}
        onChange={mockOnChange}
        onDelete={mockOnDelete}
      />,
    );

    const selectBox = getByTestId("logic-dropdown");
    expect(selectBox.textContent).toBe("And");

    fireEvent.click(selectBox);
    fireEvent.click(screen.getByText("Or"));

    expect(selectBox.textContent).toBe("Or");
    expect(mockOnChange).toHaveBeenCalledWith({
      field: "",
      operation: "",
      value: "",
      logic: "or",
    });
  });

  test("should select field and operation and call onChange", () => {
    const { getByTestId } = render(
      <FilterRow
        field=""
        operation=""
        value=""
        logic="and"
        availableFilters={availableFilters}
        index={1}
        onChange={mockOnChange}
        onDelete={mockOnDelete}
      />,
    );

    const fieldDropdown = getByTestId("field-dropdown");
    const operationDropdown = getByTestId("operation-dropdown");

    // Select field
    fireEvent.click(fieldDropdown);
    fireEvent.click(screen.getByText("Annotation results"));
    
    // Verify onChange was called with the correct field
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      field: "labelName",
      logic: "and",
    }));
    
    // Select operation
    fireEvent.click(operationDropdown);
    fireEvent.click(screen.getByText("not contains"));
    
    // Verify onChange was called with the correct operation
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      field: "labelName",
      operation: "not_contains",
      logic: "and",
    }));

    // Verify the UI shows the selected values
    expect(fieldDropdown.textContent).toBe("Annotation results");
    expect(operationDropdown.textContent).toBe("not contains");
  });

  test("should handle input value changes", () => {
    const { getByTestId } = render(
      <FilterRow
        field="labelName"
        operation="contains"
        value=""
        logic="and"
        availableFilters={availableFilters}
        index={1}
        onChange={mockOnChange}
        onDelete={mockOnDelete}
      />,
    );

    const filterInput = getByTestId("filter-input");
    fireEvent.change(filterInput, { target: { value: "test value" } });
    
    expect(mockOnChange).toHaveBeenCalledWith({
      field: "labelName",
      operation: "contains",
      value: "test value",
      logic: "and",
    });
  });

  test("should call onDelete when delete button is clicked", () => {
    const { getByLabelText } = render(
      <FilterRow
        field="labelName"
        operation="contains"
        value="test"
        logic="and"
        availableFilters={availableFilters}
        index={1}
        onChange={mockOnChange}
        onDelete={mockOnDelete}
      />,
    );

    const deleteButton = getByLabelText("Delete filter");
    fireEvent.click(deleteButton);
    
    expect(mockOnDelete).toHaveBeenCalled();
  });
});