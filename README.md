# Rava
Rava Javascript Library

Rava is a micro js library that allows you to extend and enahnce html elements that are dynamically being added to the document tree.

## Why
This lib is to assist with a website that has a lot of dynamic content on it's intial rendering. But isn't necessarily an application or a highly interactive page that requires a large extensive library such as React or Angular. 

## How
Rava allows you to register a configuration against a CSS selector so that this configuration is applied to all matching elements. It then registers itself and monitors for any additional matching elements that may be dynamically added after the configuration is created.

Once an element is found, the configuration is iterated through and methods are mapped onto the original element and event listeners are attached.

