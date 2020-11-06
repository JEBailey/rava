# Rava
RavaJS is a small, less than 3k when compressed,utility which wraps the MutationObserver and allows you to
configure and react to new HTMLElements being added to a page without a need to constantly check for their existence.

RavaJS also allows you to define methods, events handlers, and lifecycles that are dynamically mapped to the matching element. This combination of responding as soon as an element is added and the ability to add new event listeners and methods to that object enables a robust set of features

```javascript
    rava.bind(".example"{
            callbacks:{
                created: function(data,element){
                    this.start();
                },
                added: function(data,element){
                    this.start();
                },
                removed: function(data,element){
                    this.start();
                },
                "body > h1.foo" : {
                    added : function(data, element){
                        // element on this call is the h1.foo element that the css
                        // identified, while the data object and the 'this' is from
                        // the original configuration
                    }
                }
            },
           });
```