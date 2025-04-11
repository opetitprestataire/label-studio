---
title: Plugins Frequently Asked Questions
short: Plugins FAQ
type: plugins
category: About Plugins
cat: about-plugins
order: 1
meta_title: Plugins Frequently Asked Questions
tier: enterprise
---

### What are plugins?

Plugins allow you to run custom JavaScript code directly within the labeling interface. 

This feature empowers you to extend and customize Label Studio’s behavior. For example, you can add data validations, dynamic UI enhancements, or integrating external libraries, thereby tailoring the labeling workflow to your specific requirements. By leveraging the [LSI (Label Studio Interface) object](/guide/plugins#Label-Studio-Interface-LSI), you can manage events, import additional scripts, and access task and annotation data on the fly, ensuring that your custom logic executes each time an annotation is rendered.

Plugins are configured on a per-project basis from **Project > Settings > Labeling Interface**. 

![Screenshot of plugin panel](/images/plugins/plugin-panel.png)


### How can I get plugins?

Plugins are only available for Label Studio Enterprise users, and they must be enabled upon request. 

You can contact your account manager, open a [support ticket](mailto:support@humansignal.com), or click **Request Access** from the plugins panel under **Project > Settings > Labeling Interface**.  

### Why do you need to enable plugins before I can use them?

Because plugins operate in real-time on the annotator's browser, they come with [important security considerations](/guide/plugins#Security-notes-constraints-and-limitations) and are therefore only enabled upon request. 


### Are plugins available for Starter Cloud users?

No, they are only available in Label Studio Enterprise. 


### Can I customize plugins? 

Yes! The plugins available out-of-the-box are intended as starting points that can be modified to suit your needs. 


### Can I write my own?

Yes! Instead of choosing an out-of-the box plugin to modify, you can write your own from scratch. Refer to our documentation for information on using the [LSI (Label Studio Interface) object](/guide/plugins#Label-Studio-Interface-LSI). 


### Where can I learn more?

* [Plugins documentation](/guide/plugins)
* [Plugins repo](https://github.com/HumanSignal/label-studio-plugins)
* [Label Studio Frontend reference](/guide/frontend_reference.html#Available-events)




