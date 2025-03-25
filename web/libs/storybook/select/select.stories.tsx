import type { Meta, StoryObj } from "@storybook/react";
import { Select } from "@humansignal/ui";

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  component: Select,
  render: ({ form, ...args }) => {
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
      </>
    );
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Primary: Story = {
  args: {},
};
