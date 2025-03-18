/* global test, expect, jest, describe */
import Enzyme, { mount } from "enzyme";
import Adapter from "@wojtekmaj/enzyme-adapter-react-17";
import { AnnotationButton } from "../AnnotationButton";
// eslint-disable-next-line
// @ts-ignore
import { annotationStore } from "./sampleData.js";
import { Provider } from "mobx-react";

Enzyme.configure({ adapter: new Adapter() });

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useLayoutEffect: jest.requireActual("react").useEffect,
}));

jest.mock("@humansignal/ui", () => {
  const { forwardRef } = jest.requireActual("react");
  const actualCheckbox = jest.requireActual("@humansignal/ui/lib/checkbox/checkbox");
  const actualToast = jest.requireActual("@humansignal/ui/lib/toast/toast");

  return {
    __esModule: true,
    ...actualCheckbox,
    ...actualToast,
    Label: forwardRef(({ children }, ref) => {
      return (
        <div data-testid="label" ref={ref}>
          {children}
        </div>
      );
    }),
    Tooltip: forwardRef(({ children }, ref) => {
      return (
        <div data-testid="tooltip" ref={ref}>
          {children}
        </div>
      );
    }),
    Userpic: forwardRef(({ children }, ref) => {
      return (
        <div data-testid="userpic" ref={ref}>
          {children}
        </div>
      );
    }),
  };
});

const mockStore = {
  hasInterface: jest.fn().mockReturnValue(true),
};

describe("AnnotationsButton", () => {
  test("Annotation", () => {
    const entity = annotationStore.annotations[0];
    const view = mount(
      <Provider store={mockStore}>
        <AnnotationButton entity={entity} capabilities={{}} annotationStore={annotationStore} />
      </Provider>,
    );

    expect(view.find(".dm-annotation-button__entity-id").text()).toBe(`#${entity.pk}`);
  });

  test("Prediction", () => {
    const entity = annotationStore.predictions[0];
    const view = mount(
      <Provider store={mockStore}>
        <AnnotationButton entity={entity} capabilities={{}} annotationStore={annotationStore} />
      </Provider>,
    );

    expect(view.find(".dm-annotation-button__entity-id").text()).toBe(`#${entity.pk}`);
  });
});
