---
title: LLM Multi-Turn Chat Rating
type: templates
category: LLM Evaluations
cat: llm-evaluations
order: 975
is_new: t
meta_description: Send prompts to an LLM and rate prompts and responses.
date: 2025-09-03 14:49:29
---

Use the `<Chat>` tag and a model provider to send prompts on an LLM. Your annotator can then rate individual responses and the full conversation. 

!!! error Enterprise
    The `<Chat>` tag is only available to Label Studio Enterprise and Starter Cloud users. 

![Screenshot of labeling config](/images/templates-misc/chat.png)

## Labeling configuration

```xml
<View>
  <Style>
    .htx-chat{flex-grow:1}
    .htx-chat-sidepanel{flex:300px 0 0;display:flex;flex-direction:column;border-left:2px solid #ccc;padding-left:16px}
    [data-role="developer"]::before{content:"- Developer -"}
  </Style>
  <View style="display:flex;width:100%;gap:1em">
    <Chat
      name="chat" value="$context"
      messageroles="user,developer,assistant" 
      llm="openai/gpt-4.1-nano"
      minMessages="4" maxMessages="20"
      editable="true"
    />
    <View className="htx-chat-sidepanel">
      <View style="position:sticky;top:14px">
        <!-- Invitation/explanation on how to evaluate -->
        <View visibleWhen="no-region-selected">
          <Text name="_3" value="Click on a message to rate specific parts of the conversation"/>
        </View>
        <!-- Rate user messages -->
        <View visibleWhen="region-selected" whenRole="user">
          <Text name="_1" value="Rate the request" />
          <Rating name="request_rating" toName="chat" perRegion="true" />
        </View>
        <!-- Rate assistant responses -->
        <View visibleWhen="region-selected" whenRole="assistant">
          <Text name="__1" value="Rate assistant's response" />
          <Rating name="message_rating" toName="chat" perRegion="true" />
          <Text name="__4" value=" " />
          <Text name="__2" value="Add a comment (optional)" />
          <TextArea perRegion="true" name="message_comment" toName="chat" />
          <Choices name="q" toName="chat" perRegion="true">
            <Choice value="Good" />
            <Choice value="Bad" />
          </Choices>
        </View>
      </View>
      <!-- Rate the whole conversation -->
      <View style="margin-top:auto;height:130px">
        <Header size="4">Overall quality of this conversation</Header>
        <Rating name="rating" toName="chat" />
      </View>
    </View>
  </View>
</View>
```

## About this labeling configuration

#### Style

```xml
<Style>
    .htx-chat{flex-grow:1}
    .htx-chat-sidepanel{flex:300px 0 0;display:flex;flex-direction:column;border-left:2px solid #ccc;padding-left:16px}
    [data-role="developer"]::before{content:"- Developer -"}
  </Style>
```
* `.htx-chat{flex-grow:1}`: Adds CSS so that the chat area expands.
* `.htx-chat-sidepanel`: Adds a right-side evaluation panel is fixed at ~300px with a left border.
*  `[data-role="developer"]::before{content:"- Developer -"}`: Prepends **- Developer -** before any message from the developer role.
  
For more information, see the [Style tag](/tags/style). 

#### Chat

```xml
<Chat
  name="chat" value="$context"
  messageroles="user,developer,assistant" 
  llm="openai/gpt-4.1-nano"
  minMessages="4" maxMessages="20"
  editable="true"
/>
```
* `messageroles`: The annotator will see a drop-down menu with **User**, **Developer**, and **Assistant** roles that they can choose from when sending messages. 
* `llm`: Messages from the annotator will be sent to an LLM and the response returned within the chat area of the labeling configuration. 
* `minMessages` and `maxMessages`: The minimum number of messages users must submit to complete the task and the maximum they are allowed to submit within the task. 
* `editable`: Messages from the annotator and from the LLM are editable. To modify this so that only messages from certain roles are editable, you can specify them (for example, `editable="user,assistant"`). 

For more information, see the [Chat tag](/tags/chat). 

#### Rating

```xml
<View visibleWhen="region-selected" whenRole="user">
  <Text name="_1" value="Rate the request" />
  <Rating name="request_rating" toName="chat" perRegion="true" />
</View>
```

Click on a message from the **User** role and then apply a rating to that individual message. 

```xml
<View visibleWhen="region-selected" whenRole="assistant">
  <Text name="__1" value="Rate assistant's response" />
  <Rating name="message_rating" toName="chat" perRegion="true" />
  <Text name="__4" value=" " />
  <Text name="__2" value="Add a comment (optional)" />
  <TextArea perRegion="true" name="message_comment" toName="chat" />
  <Choices name="q" toName="chat" perRegion="true">
    <Choice value="Good" />
    <Choice value="Bad" />
  </Choices>
</View>
```

Click on a message from the Assistant role (this includes response from the LLM) and apply a rating. 

You can also add a comment in the `TextArea` field and classify the message as "Good" or "Bad."

```xml
<View style="margin-top:auto;height:130px">
  <Header size="4">Overall quality of this conversation</Header>
  <Rating name="rating" toName="chat" />
</View>
```
Select a rating for the full chat exchange. 


## Input data

```json
[
{
  "data": {
    "context": [
      {
        "role": "developer",
        "content": "A 25 year-old male who enjoys the outdoors wants to plan a trip outside of the United States."
      }
    ]
  }
}
]
```

## Related tags

* [Chat](/tags/chat)
* [Style](/tags/style)
* [Rating](/tags/rating)
* [Text](/tags/text)
* [TextArea](/tags/textarea)
* [Choices](/tags/choices)