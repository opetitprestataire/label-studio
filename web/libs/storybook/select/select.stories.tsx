import type { Meta, StoryObj } from "@storybook/react";
import { Select } from "@humansignal/ui";

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  component: Select,
  render: ({ form, ...args }) => {
    return (
      <>
        <Select
          placeholder="Select a fruit"
          options={["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"]}
          label="default"
          {...args}
        />
        <Select
          options={["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"]}
          label="searchable select"
          searchable={true}
          {...args}
        />
        <Select
          placeholder="inline select"
          options={["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"]}
          label="default"
          isInline={true}
          {...args}
        />
        <Select
          placeholder="Select a fruit"
          options={["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"]}
          label="ghost"
          ghost={true}
          {...args}
        />
        <Select
          placeholder="Select a fruit"
          options={["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"]}
          label="required"
          required={true}
          {...args}
        />
        <Select
          placeholder="Select a fruit"
          options={["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"]}
          label="error"
          value="Blueberry"
          {...args}
        />
        <Select
          placeholder="Select a fruit"
          options={["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"]}
          label="disabled select"
          disabled={true}
          {...args}
        />
        <Select
          placeholder="Select a fruit"
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
          label="disabled options"
          {...args}
        />
      </>
    );
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Primary: Story = {
  args: {},
};
