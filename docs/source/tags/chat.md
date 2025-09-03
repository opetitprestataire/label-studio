---
title: Chat
type: tags
order: 302
meta_title: Chat Tag for Conversational Transcripts
meta_description: Display and extend chat transcripts; optionally request assistant replies from an LLM. Supports message editing controls and min/max limits.
---

The `Chat` tag displays a conversational transcript and lets annotators extend it by adding new messages as they label. 

The initial transcript is provided from task data via the `value` attribute. [See the example below](#Example-input-data).

Use with the following data types: JSON array of message objects.

!!! error Enterprise
    This tag is only available for Label Studio Enterprise users. 

![Screenshot](/images/tags/chat.png)

### Use with an LLM

Optionally, the tag can request automatic replies from an LLM. 

To use an LLM, you need to do two things:

1. Add a model provider API key to your organization. See [Model providers](model_providers). 

2.  Once you have added an API key for a model provider, set the `llm` attribute on the `<Chat>` tag to the model you want to use. 

    The `llm` attribute must use the format `<provider>/<model>`. For example, `llm="openai/gpt-5"`. 

### Editing messages

You can allow annotators to edit the messages that they enter and, if applicable, responses from the LLM. 

Set the `editable` parameter to `"true"` or to a list of roles that should be editable. To edit a message, hover over it to view the edit icon.

Annotators cannot edit messages from the imported task data.  

![Screenshot](/images/tags/chat-edit.png)

{% insertmd includes/tags/chat.md %}

## Examples

### Example `<Chat>` tag

Allow composing both user and assistant messages and allow auto-replies using an LLM model

```xml
<View>
  <Chat
    name="conversation" value="$messages"
    messageroles="user,assistant" llm="openai/gpt-5"
    minMessages="4" maxMessages="20"
    editable="user,assistant"
  />
</View>
```
### Example labeling config

Evaluate assistant responses:

```xml
<View>
  <Style>
    .htx-chat{flex-grow:1}
    .htx-chat-sidepanel{flex:300px 0 0;display:flex;flex-direction:column;border-left:2px solid #ccc;padding-left:16px}
  </Style>
  <View style="display:flex;width:100%;gap:1em">
    <Chat name="chat" value="$messages" llm="openai/gpt-4.1-nano" minMessages="4" maxMessages="10" editable="true" />
    <View className="htx-chat-sidepanel">
      <View style="position:sticky;top:14px">
        <!-- Invitation/explanation on how to evaluate -->
        <View visibleWhen="no-region-selected">
          <Text name="_3" value="Click on a message to rate specific parts of the conversation"/>
        </View>
        <!-- Evaluate assistant messages -->
        <View visibleWhen="region-selected" whenRole="assistant">
          <Text name="_1" value="Rate the response" />
          <Rating name="response_rating" toName="chat" perRegion="true" />
        </View>
      </View>
      <!-- Evaluate the whole conversation -->
      <View style="margin-top:auto;height:130px">
        <Header size="4">Overall quality of this conversation</Header>
        <Rating name="rating" toName="chat" />
      </View>
    </View>
  </View>
</View>
```

### Example input data

This example JSON input data is called in the `value="$messages"` parameter on the Chat tag in the examples above. 

- `role`    — speaker identifier; supported roles: `user`, `assistant`, `system`, `tool`, `developer`
- `content` — message text


```json
{
  "data": {
    "messages": [
      {
        "role": "user",
        "content": "Start with a kick-off message to validate the quality of it based on further conversation"
      }
    ]
  }
}
```