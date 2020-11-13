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
        var reply = sel.replace(/([^\\])([@-])/g, function (ch, p1, p2) {
            return p1 + "\\" + p2;
        });
        return reply.trim();
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

    var model_attr = "@model";

    /**
     * binds the elements that match the provided css selector with a specific configuration
     * then uses the css selector to find all the matching elements to configure.
     * After the initial configuration, rava then establishes a listener for any additional
     * matching elements.
     * 
     * If you provide an HTMLElement or 
     * 
     * @param {string | HTMLElement} selector - CSS styled selector for an object
     * @param {object} config - Configuration Object
     */
    rava.bind = function (selector, config) {
        if (selector.nodeType) {
            if (selector.nodeType === 1) {
                wrap(selector, "", config);
                return;
            }
            if (selector.nodeType === 11) {
                var children = selector.content || selector.children;
                var length = children.length;
                for (var i = 0; i < length; i++) {
                    var el = children[i];
                    wrap(el, "", config);
                }
                return;
            }
            console.warn("unable to bind - unknown node of type " + selector.nodeType);
            return;
        }
        selector = escape(selector);
        var tagSet = tagSelectors.get(selector);
        if (!tagSet) {
            tagSet = new Set();
            tagSelectors.set(selector, tagSet);
        }
        tagSet.add(config);
        var found = document.querySelectorAll(selector);
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
     * internal function that traverses a node list and performs a callback for each ELEMENT_NODE that's found. 
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
        element["x-rava"].forEach(function (data) {
            doCallback(element, "removed", data.__config, data);
            removeReference(element, data);
        });
    };

    var removeReference = function (el, data) {
        var config = data.__config;
        if (config.refs) {
            if (typeof config.refs === "string") {
                var name = config.refs;
                if (Array.isArray(data[name])) {
                    for (var i = 0; i < data[name].length; i++) {
                        if (data[name][i] === el) {
                            data[name].splice(i, 1);
                            break;
                        }
                    }
                    return;
                }
                data[name] = null;
            }
        }
    }

    var addReference = function (el, data) {
        var config = data.__config;
        if (config.refs) {
            if (typeof config.refs === "string") {
                var name = config.refs;
                if (Array.isArray(data[name])) {
                    data[name].push(el);
                    return;
                }
                data[name] = el;
            }
        }
    }


    var wrap = function (el, selector, config) {
        // in the case that this is a scoped configuration
        // we only match on child elements of the specific 
        // parent element
        if (config.scoped) {
            if (!config.scoped.contains(el)) {
                return;
            }
        }
        // check the existing configurations on this element
        // to see if it has already been configured by us
        // if it has, do a callback and leave.
        var dataSet = el["x-rava"];
        if (!dataSet) {
            dataSet = [];
            el["x-rava"] = dataSet;
        }
        for (var i = 0; i < dataSet.length; i++) {
            var dataItem = dataSet[i];
            if (dataItem.__config === config) {
                doCallback(el, "added", config, data);
                addReference(el, dataItem);
                return;
            }
        }

        // get the data object, either directly, creating it, or calling a 
        // function then create a child object from it to be used by the 
        // configuration process. if the config is a result of a child binding
        // then use the provided data object as is
        var data = config.data || {};

        if (typeof data === "function") {
            data = data.call(el);
        }
        data = Object.create(data);
        data.__config = config;
        if (!data.el) {
            data.el = el;
        }
        // add the new context to the context array for reference
        dataSet.push(data);

        if (config.isChild) {
            data = Object.getPrototypeOf(data);
        }

        Object.getOwnPropertyNames(config).forEach(function (name) {
            if (name === "events") {
                handleEvents(el, config, selector, data);
            } else if (name === "methods") {
                handleMethods(data, config[name]);
            } else if (name === "callbacks") {
                handleCallbacks(el, config, selector, data);
            } else if (name === "refs") {
                handleReferences(el, config, selector, data);
            } else if (name === "model") {
                handleModel(el, config, selector, data);
            } else if (startsWith.call(name, "events_")) {
                handleTopLevelEvents(el, config, selector, data, name);
            } else if (name === "attr_changes") {
                handleChanges(el, config, selector, data, name);
            } else if (name == "created" || name == "added" || name == "removed" || name == "data" || name == "scoped" || name == "isChild") {
                return;
            } else if (rava.debug) {
                console.log("unknown configuration of " + name);
            }
        });

        if (el.hasAttribute && el.hasAttribute(model_attr)) {
            handleModelAttribute(el, selector, data);
        }

        doCallback(el, "created", config, data);
        doCallback(el, "added", config, data);
    };

    var handleModelAttribute = function (el, selector, data) {
        var attr_value = el.getAttribute(model_attr);
        var attr_selector = escape("[" + model_attr + "=\"" + attr_value + "\"]");
        if (selector.indexOf(attr_selector) >= 0) {
            if (!data.model.cache[attr_value]) {
                data.model.cache[attr_value] = [];
            }
            data.model.cache[attr_value].push(el);
            addModelEvent(el, selector, data, attr_value);
            var tagName = el.tagName.toLowerCase();
            var modelValue = data.model[attr_value];

            if (tagName === "input") {
                if (el.value) {
                    data.model[attr_value] = el.value;
                } else if (modelValue) {
                    el.value = modelValue;
                }
            } else {
                if (modelValue) {
                    el.innerText = modelValue;
                }
            }

        }
    }

    var addModelEvent = function (el, selector, data, value) {
        var newConfig = {};
        newConfig.events = {};
        newConfig.events.input = modelCallback(value);
        handleEvents(el, newConfig, selector, data);
    }

    var modelCallback = function (value) {
        return function (event) {
            var update = event.target.value;
            this.model[value] = update;
        }
    }


    var handleModel = function (el, config, selector, data) {
        if (!config.model.cache) {
            Object.defineProperty(config.model, "cache", {
                value: {},
                writeable: false,
                enumerable: false
            });
        };
        var model = Object.create(config.model);
        data.model = model;
        for (var name in model) {
            var descriptor = Object.getOwnPropertyDescriptor(model, name);
            if (!descriptor) {
                descriptor = Object.getOwnPropertyDescriptor(config.model, name);
            }
            if (descriptor) {
                extendProperty(model, name);
                var newConfig = {};
                var child_selector = "[$1=\"$2\"]".replace("$1", model_attr).replace("$2", name);
                newConfig.isChild = true;
                newConfig.scoped = el;
                child_selector = selector + " " + child_selector;
                newConfig.data = data;
                rava.bind(child_selector, newConfig);
            }
        }
    };

    //rewrite property 
    var extendProperty = function (model, name) {
        var object = Object.getPrototypeOf(model);
        Object.defineProperty(model, name, {
            set: function (value) {
                var cache = object.cache;
                if (!cache[name]){
                    cache[name] = [];
                }
                var array = cache[name];
                array.forEach(function (el) {
                    el.innerText = value;
                });
                object[name] = value;
            },
            get: function () {
                return object[name];
            },
            enumerable: true
        });
    };

    var handleMethods = function (data, funcs) {
        for (var funcName in funcs) {
            data[funcName] = funcs[funcName].bind(data);
        }
    };

    var handleEvents = function (el, config, selector, data) {
        var configObject = config["events"];
        for (var key in configObject) {
            var value = configObject[key];
            if (typeof value === "function") {
                el.addEventListener(key, getEventHandler(configObject, key, data));
            } else if (typeof value === "string") {
                el.addEventListener(key, getEventHandler(data, value, data));
            } else {
                var newConfig = {};
                var child_selector = key;
                if (!startsWith.call(child_selector.trim(), ':root')) {
                    child_selector = child_selector.replace(':scope', '');
                    newConfig.scoped = el;
                    child_selector = selector + " " + child_selector;
                    child_selector = format(el, child_selector).trim();
                }
                newConfig.isChild = true;
                newConfig.events = value;
                newConfig.data = data;
                rava.bind(child_selector, newConfig);
            }
        }
    };

    var handleChanges = function (el, config, selector, data) {
        var configObject = config["attr_changes"];
        for (var key in configObject) {
            var possibleFunc = configObject[key];
            if (typeof possibleFunc === "function") {
                registerChangeListener(el, key);
                el.addEventListener("attr_change_" + key, getEventHandler(configObject, name, data));
            } else if (typeof value === "string") {
                el.addEventListener("attr_change_" + key, getEventHandler(data, value, data));
            } else {
                var newConfig = {};
                if (startsWith.call(key.trim(), ':scope')) {
                    newConfig.scoped = el;
                }
                newConfig.isChild = true;
                newConfig.changes = possibleFunc;
                newConfig.data = data;
                var extendedSelector = format(el, key.replace(':scope', selector)).trim();
                rava.bind(extendedSelector, newConfig);
            }
        }
    }

    var handleTopLevelEvents = function (el, config, selector, data, name) {
        var key_name = name.substring(7);
        var value = config[name];
        var newConfig = {};
        var newEvents = newConfig.events = {};
        if (typeof value === "function" || typeof value === "string") {
            newEvents[key_name] = value;
        } else if (typeof value === "object") {
            for (var child_selector in value) {
                var key_value = value[child_selector];
                newEvents[child_selector] = {};
                newEvents[child_selector][key_name] = key_value;
            }
        } else {
            if (rava.debug) {
                console.log("unknown type " + (typeof value) + " for value of " + name + "in config");
            }
        }
        handleEvents(el, newConfig, selector, data);
    };

    /**
     * Unlike other configurations, we are only interested in mapping a callback if the callback is a scoped child.
     * If it's a function, that function will be called by the callback mechanism. We never directly put the callback on the element we're binding.
     * 
     * @param {*} el 
     * @param {*} config 
     * @param {*} selector 
     * @param {*} data 
     */
    var handleCallbacks = function (el, config, selector, data) {
        var callbacks = config.callbacks;
        if (typeof callbacks === "object") {
            for (var key in callbacks) {
                var value = callbacks[key];
                if (typeof value === "object") {
                    childBinding("callbacks", value, selector, key, el, data);
                }
            }
        } else {
            if (rava.debug) {
                console.log("unknown type " + (typeof events) + " as value for callbacks: in config");
            }
        }
    };

    var handleReferences = function (el, config, selector, data) {
        var refObject = config.refs;
        if (typeof refObject === "string") {
            if (Array.isArray(data[refObject])) {
                data[refObject].push(el);
                return;
            }
            if (!data[refObject]) {
                data[refObject] = el;
                return;
            }
            console.log("unable to bind " + el + " to existing binding of " + refObject);
        } else if (typeof refObject === "object") {
            for (var ref in refObject) {
                var ref_selector = refObject[ref];
                if (Array.isArray(ref_selector)) {
                    data[ref] = [];
                    ref_selector.forEach(function (child_selector) {
                        childBinding("refs", ref, selector, child_selector, el, data);
                    });
                } else {
                    data[ref] = null;
                    childBinding("refs", ref, selector, ref_selector, el, data);
                }
            }
        } else {
            if (rava.debug) {
                console.log("unknown type " + (typeof refObject) + " for references");
            }
        }
    };

    /**
     * When a child binding is identified, this handles the creation and binding of the child configuration
     * 
     * 
     * @param {string} propName 
     * @param {Object} propValue 
     * @param {string} parentSelector 
     * @param {string} childSelector 
     * @param {HTMLElement} targetEl 
     * @param {Object} data 
     */
    var childBinding = function (propName, propValue, parentSelector, childSelector, targetEl, data) {
        var newConfig = {};
        if (!startsWith.call(childSelector.trim(), ':root')) {
            childSelector = childSelector.replace(':scope', '');
            newConfig.scoped = targetEl;
            childSelector = parentSelector + " " + childSelector;
        }
        newConfig.isChild = true;
        newConfig[propName] = propValue;
        newConfig.data = data;
        rava.bind(childSelector, newConfig);
    }

    var registerChangeListener = function (node, key) {
        var attributeConfig = {
            attributes: true,
            attributeOldValue: true,
        };

        attributeConfig.filter = [key];
        attributeListener.observe(node, attributeConfig)
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
    var doCallback = function (el, name, config, data) {
        var callbacks = config.callbacks || config;
        if (callbacks[name]) {
            callbacks[name].call(data, el);
        }
    }

    /**
     * Generates a function to handle events.
     * 
     * @param {HTMLElement | Object} source - object which holds the function
     * @param {string} name - name of the function to be called
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