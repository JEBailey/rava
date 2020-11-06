/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
/* eslint-env es6, browser */
(function () {
    "use strict";
    var rava = {};

    /**
     * stores a given selector with a list of configurations that applies to it
     */
    var tagSelectors = new Map();

    // polyfill to support IE 11
    var matches = Element.prototype.matches
        || Element.prototype.msMatchesSelector;
    // polyfill to support IE 11
    var forEach = NodeList.prototype.forEach || Array.prototype.forEach;
    // polyfill to support IE 11
    var startsWith = String.prototype.startsWith || function (searchString, position) {
        position = position || 0;
        return this.substr(position, searchString.length) === searchString;
    };

    // customized templating based on data- values. For any {foo} in the provided string we will
    // look for data-foo on the provided element and perform a subsitution for the value if found
    var format = function (el, string) {
        var regex = /{(\w+)}/g;
        var found = string.match(regex);
        if (found) {
            found.forEach(
                function (found) {
                    var oldValue = found.slice(1, found.length - 1);
                    var newValue = el.dataset[oldValue];
                    if (newValue) {
                        string = string.replace(found, newValue);
                    }
                }
            )
        }
        return string;
    }

    // polyfill to support IE 11
    var customEvent = (function () {
        if (typeof window.CustomEvent === "function") {
            return window.CustomEvent;
        }
        return function (event, params) {
            params = params || { bubbles: false, cancelable: false, detail: null };
            var evt = document.createEvent('CustomEvent');
            evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
            return evt;
        }
    })();

    //During selector querying a class with an unescaped dash '-' in the name is not correctly found 
    var escape = function (sel) {
        return sel.replace(/^[\\]-/g, function (ch) {
            return "\\" + ch;
        });
    };

    /**
     * binds the elements that match the provided css selector with a specific configuration
     * then uses the css selector to find all the matching elements to configure.
     * After the initial configuration, rava then establishes a listener for any additional
     *  matching elements
     * 
     * @param {string | selector} selector - CSS styled selector for an object
     * @param {object} config - Configuration Object
     */
    rava.bind = function (selector, config) {
        var tagSet = tagSelectors.get(selector);
        if (!tagSet) {
            tagSet = new Set();
            tagSelectors.set(selector, tagSet);
        }
        tagSet.add(config);
        var found = document.querySelectorAll(escape(selector));
        if (found) {
            forEach.call(found, function (node) {
                wrap(node, selector, config);
            });
        } else if (rava.debug) {
            console.log("unable to do initial binding on " + selector + " no matches found");
        }
    };

    /**
     * locates the first element below the given element that matches the selector
     * 
     * @param {HTMLElement} element - top level element that you are searching below
     * @param {string} selector - CSS styled selector for an object
     */
    rava.find = function (element, selector) {
        var found = traverse(element, function (el) {
            if (matches.call(el, selector)) {
                return el;
            }
        });
        return found;
    }

    /** 
     * locates all of elements below the given element that matches the selector
     * 
     * @param {HTMLElement} element - top level element that you are searching below
     * @param {string} selector - CSS styled selector for an object
     */
    rava.findAll = function (element, selector) {
        var response = [];
        traverse(element, function (el) {
            if (matches.call(el, selector)) {
                response.push(el);
            }
        });
        return response;
    }

    /**
     *  Utility function to create an event and dispatch it from the provided element
     * @param {HTMLElement} el 
     * @param {string} eventname 
     * @param {Object} params 
     */
    rava.event = function (el, type, params) {
        var event = new customEvent(type, params);
        el.dispatchEvent(event);
    }

    /**
     * Generates a Function from the string parameter. The returned Function 
     * take an Object which is then used to map values into a new string.
     * 
     * @param {string} string 
     */
    rava.template = function (string) {
        if (rava.debug) {
            console.log("pre compilation : " + string);
        }
        return new Function("__obj", bodyOfFunction(string));
    }

    // mutation observer to monitor the whole document
    new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            traverseNodeList(mutation.addedNodes, added);
            traverseNodeList(mutation.removedNodes, removed);
        });
    }).observe(document, {
        attributes: false,
        childList: true,
        subtree: true,
        characterData: false
    });

    // internal function that traversals a node list and
    // performs a callback for each ELEMENT_NODE that's found
    var traverseNodeList = function (nodeList, callback) {
        forEach.call(nodeList, function (node) {
            if (node.nodeType == Node.ELEMENT_NODE) {
                traverse(node, callback);
            }
        });
    };

    /**
     * internal function that traversals a node list and performs a callback for each ELEMENT_NODE that's found. 
     * 
     * @param {HTMLElement} element 
     * @param {FuncRef} callback - if the callback returns a value the traversal ends
     */

    var traverse = function (element, callback) {
        var list = [];
        list.push(element);
        while (list.length > 0) {
            var el = list.pop();
            if (callback(el)) {
                return el;
            }
            for (var i = 0; i < el.children.length; i++) {
                list.push(el.children[i]);
            }
        };
    };

    /**
     * Checks to a given elements against the list of defined rava selectors
     * to see if a newly added element matches a defined selector
     * 
     * @param {HTMLELement} element 
     */
    var added = function (element) {
        tagSelectors.forEach(function (sets, selector) {
            if (matches.call(element, selector)) {
                sets.forEach(function (config) {
                    if (matches.call(element, selector)) {
                        wrap(element, selector, config);
                    }
                });
            }
        });
    };

    /**
     * Checks to see if the given element that is being removed from the DOM has an associated
     * rava bindings and if it does, performs the associated 'remove' callback
     * 
     * @param {HTMLElement} element 
     */
    var removed = function (element) {
        if (!element["x-rava"]) {
            return;
        }
        element["x-rava"].forEach(function (context) {
            doCallback(element, "removed", context.__config, context);
            removeReference(element, context);
        });
    };

    var removeReference = function (el, context) {
        var config = context.__config;
        if (config.refs) {
            if (typeof config.refs === "string") {
                var name = config.refs;
                if (Array.isArray(context[name])) {
                    for (var i = 0; i < context[name].length; i++) {
                        if (context[name][i] === el) {
                            context[name].splice(i, 1);
                            break;
                        }
                    }
                    return;
                }
                context[name] = null;
            }
        }
    }

    var addReference = function (el, context) {
        var config = context.__config;
        if (config.refs) {
            if (typeof config.refs === "string") {
                var name = config.refs;
                if (Array.isArray(context[name])) {
                    context[name].push(el);
                    return;
                }
                context[name] = el;
            }
        }
    }


    var wrap = function (node, selector, config) {
        // in the case that this is a scoped configuration
        // we only match on child elements of the specific 
        // parent element
        if (config.scoped) {
            if (!config.scoped.contains(node)) {
                return;
            }
        }
        // check the existing configurations on this element
        // to see if it has already been configured by us
        // if it has, do a callback and leave.
        var ctxSet = node["x-rava"];
        if (!ctxSet) {
            ctxSet = [];
            node["x-rava"] = ctxSet;
        }
        for (var i = 0; i < ctxSet.length; i++ ) {
            var ctx = ctxSet[i];
            if (ctx.__config === config) {
                doCallback(node, "added", config, context);
                addReference(node, ctx);
                return;
            }
        }
        
        // get the data object, either directly, creating it, or calling a function
        // then create a child object from it to be used by the configuration process
        var context = config.data || {};
        if (typeof context === "function") {
            context = context.call(node);
        }
        context = Object.create(context);
        context.__config = config;
        if (!context.el) {
            context.el = node;
        }
        // add the new context to the context array for reference
        ctxSet.push(context);

        Object.getOwnPropertyNames(config).forEach(function (name) {
            if (name === "events") {
                handleEvents(node, config, selector, context);
                return;
            }
            if (name === "methods") {
                handleMethods(context, config[name]);
                return;
            }
            if (name === "callbacks") {
                handleCallbacks(node, config, selector, context);
                return;
            }
            if (name === "refs") {
                handleReferences(node, config, selector, context);
                return;
            }
            if (startsWith.call(name, "events_")) {
                handleTopLevelEvents(node, config, selector, context, name);
                return;
            }
            if (name == "created" || name == "added" || name == "removed" || name == "data" || name == "scoped" || name == "target") {
                return;
            }
            if (name == "changes") {
                handleChanges(node, config, selector, context, name);
                return;
            }
            if (rava.debug) {
                console.log("unknown configuration of " + name);
            }
        });

        doCallback(node, "created", config, context);
        doCallback(node, "added", config, context);
    };

    var handleMethods = function (context, funcs) {
        for (var funcName in funcs) {
            context[funcName] = funcs[funcName].bind(context);
        }
    };

    var handleEvents = function (node, config, selector, context) {
        var events = config.events;
        for (var name in events) {
            var value = events[name];
            if (typeof value === "function") {
                node.addEventListener(name, getEventHandler(config, name, context));
            } else if (typeof value === "string") {
                node.addEventListener(name, getEventHandler(context, value, context));
            } else {
                var newConfig = {};
                var child_selector = name;
                if (!startsWith.call(child_selector.trim(), ':root')) {
                    child_selector = child_selector.replace(':scope','');
                    newConfig.scoped = node;
                    child_selector = selector + " " + child_selector;
                    child_selector = format(node, child_selector).trim();
                }
                newConfig.target = node;
                newConfig.events = value;
                newConfig.data = context;
                rava.bind(child_selector, newConfig);
            }
        }
    };

    var handleTopLevelEvents = function (node, config, selector, context, name) {
        var key_name = name.substring(7);
        var target = config.target || node;
        var value = config[name];
        if (typeof value === "function") {
            node.addEventListener(key_name, getEventHandler(config, name, context));
        } else if (typeof value == "string") {
            node.addEventListener(key_name, getEventHandler(context, value, context));
        } else if (typeof value === "object") {
            for (var child_selector in value) {
                var key_value = value[child_selector];
                var newConfig = {};
                if (!startsWith.call(child_selector.trim(), ':root')) {
                    child_selector = child_selector.replace(':scope','');
                    newConfig.scoped = node;
                    child_selector = selector + " " + child_selector;
                    child_selector = format(node, child_selector).trim();
                }
                newConfig.target = node;
                newConfig.events = {};
                newConfig.events[key_name] = key_value;
                newConfig.data = context;
                rava.bind(child_selector, newConfig);
            }
        } else {
            if (rava.debug) {
                console.log("unknown type " + (typeof value) + " for value of " + name + "in config");
            }
        }
    };

    /**
     * Unlike other configurations, we are only interested in mapping a callback if the callback is a scoped child.
     * If it's a function, that function will be called by the callback mechanism. We never directly put the callback on the element we're binding.
     * 
     * @param {*} node 
     * @param {*} config 
     * @param {*} selector 
     * @param {*} data 
     */
    var handleCallbacks = function (node, config, selector, context) {
        var callbacks = config.callbacks;
        if (typeof callbacks === "object") {
            for (var key in callbacks) {
                var value = callbacks[key];
                if (typeof value === "object") {
                    childBinding("callbacks", value, selector, key, node, context);
                }
            }
        } else {
            if (rava.debug) {
                console.log("unknown type " + (typeof events) + " as value for callbacks: in config");
            }
        }
    };

    var handleReferences = function (el, config, selector, context) {
        var refObject = config.refs;
        if (typeof refObject === "string") {
            if (Array.isArray(context[refObject])) {
                context[refObject].push(value);
                return;
            }
            var proto = Object.getPrototypeOf(context);
            if (proto.hasOwnProperty(refObject)) {
                proto[refObject] = el;
                return;
            }
            console.log("warning - attempting to directly bind current el to data context - no binding occurred");
        } else if (typeof refObject === "object") {
            for (var ref in refObject) {
                var ref_selector = refObject[ref];
                if (Array.isArray(ref_selector)) {
                    context[ref] = [];
                    ref_selector.forEach(function (child_selector) {
                        childBinding("refs", ref, selector, child_selector, el, context);
                    });
                } else {
                    context[ref] = null;
                    childBinding("refs", ref, selector, ref_selector, el, context);
                }
            }
        } else {
            if (rava.debug) {
                console.log("unknown type " + (typeof refObject) + " for references");
            }
        }
    };

    //rewrite property 
    var addOrExtendProperty = function (context, name, value) {
        if (Array.isArray(context[name])) {
            context[name].push(value);
            return;
        }
        var object = Object.getPrototypeOf(context);
        if (object.hasOwnProperty(name)) {
            Object.defineProperty(context, name, {
                set: function (value) {
                    object[name] = value;
                },
                enumerable: true
            });
        }
        context[name] = value;
    };

    /**
     * When a child binding is identified, this handles the creation and binding of the child configuration
     * 
     * 
     * @param {string} key 
     * @param {Object} value 
     * @param {string} parent_selector 
     * @param {string} child_selector 
     * @param {HTMLElement} el 
     * @param {Object} data 
     */
    var childBinding = function (propName, propValue, parentSelector, childSelector, targetEl, context) {
        var newConfig = {};
        if (!startsWith.call(childSelector.trim(), ':root')) {
            childSelector = childSelector.replace(':scope','');
            newConfig.scoped = targetEl;
            childSelector = parentSelector + " " + childSelector;
        }
        newConfig.target = targetEl;
        newConfig[propName] = propValue;
        newConfig.data = context;
        rava.bind(childSelector, newConfig);
    }

    var handleChanges = function (node, config, selector, data) {
        if (!data.mutationObserver) {
            data.mutationObserver = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) {
                    handleChangeMutation(mutation, config, data)
                });
            });
        }
    };

    var handleChangeMutation = function (mutation, config, data) {
        if (!data.mutationObserver) {
            data.mutationObserver = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) {

                });
            });
        }

    }

    /**
     * if there is a target this overrides the default element
     * to be the recipient of the callback.
     * 
     * @param {HTMLElement} el 
     * @param {string} name 
     * @param {object} config 
     * @param {object} data 
     */
    var doCallback = function (el, name, config, context) {
        var callbacks = config.callbacks || config;
        if (callbacks[name]) {
            callbacks[name].call(context, el);
        }
    }

    /**
     * Generates a function to handle events.
     * 
     * @param {HTMLElement | Object} source - object which holds the function
     * @param {string} name - name of the function to be called
     * @param {HTMLElement} target - called in the context of this element
     * @param {Object} data - common data object
     */
    var getEventHandler = function (source, name, data) {
        return function (event) {
            source[name].call(data, event);
        };
    };

    if (typeof define === 'function' && define.amd) {
        define(rava);
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            rava: rava
        };
    }
    if (typeof window !== 'undefined') {
        window.rava = rava;
    }
})();