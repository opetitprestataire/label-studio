import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox, Select } from "@humansignal/ui";
import { useMemo, useState } from "react";

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  component: Select,
  render: ({ form, ...args }) => {
    const thousandOptions = useMemo(() => {
      return Array.from({ length: 1000 }, (_, i) => `Option ${i}`);
    }, []);
    return (
      <>
        <div>
          <Select
            placeholder="Select a fruit"
            options={["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"]}
            label="default"
            {...args}
          />
        </div>
        <div>
          <Select
            options={["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"]}
            placeholder="searchable select"
            searchable={true}
            {...args}
          />
        </div>
        <div>
          <Select
            placeholder="inline select"
            options={["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"]}
            isInline={true}
            {...args}
          />
        </div>
        <div>
          <Select
            placeholder="Select a fruit"
            options={["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"]}
            label="required"
            required={true}
            {...args}
          />
        </div>
        <div>
          <Select
            placeholder="Select a fruit"
            options={["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"]}
            label="disabled select"
            disabled={true}
            {...args}
          />
        </div>
        <div>
          <Select
            placeholder="Select a fruit"
            value="Blueberry"
            options={[
              {
                value: "Apple",
                disabled: true,
              },
              "Banana",
              {
                value: "Blueberry",
                label: (
                  <>
                    <span>Blueberry</span>
                    <span className="text-sm"> - 15</span>
                  </>
                ),
                disabled: true,
              },
              "Grapes",
              "Pineapple",
            ]}
            label="Fancy option"
            {...args}
          />
        </div>
        <div>
          <Select
            placeholder="custom testid"
            options={["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"]}
            data-testid="my-select"
            {...args}
          />
        </div>
        <div>
            <Select
              options={thousandOptions}
              label="Thousand options"
              {...args}
            />
        </div>
        <div>
            <Select
              options={[]}
              label="In progress"
              isInProgress={true}
              {...args}
            />
        </div>
      </>
    );
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Primary: Story = {
  args: {},
};
