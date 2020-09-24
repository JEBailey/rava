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

    //During selector querying a class with an unescaped dash '-' in the name is not correctly found 
    var escape = function (sel) {
        return sel.replace(/(?<!\\)-/g, function (ch) {
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
        traverse(element, function (el) {
            if (matches.call(el, selector)) {
                return el;
            }
        });
        return null;
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
     * Generates a Function from the string/
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

    // internal function that traversals a node list and
    // performs a callback for each ELEMENT_NODE that's found
    var traverse = function (element, callback) {
        var checkSet = new Set();
        checkSet.add(element);
        checkSet.forEach(function (el) {
            callback(el);
            for (var i = 0; i < el.children.length; i++) {
                checkSet.add(el.children[i]);
            }
            checkSet["delete"](el);
        });
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
        element["x-rava"].forEach(function (config) {
            doCallback(element, "removed", config);
        });
    };

    var wrap = function (node, selector, config) {
        // in the case that this is a scoped configuration
        // we only match on child elements of the specific 
        // parent element
        if (config.scoped) {
            if (!config.scoped.contains(node)) {
                return;
            }
        }
        var data = config.data || {};

        var configSet = node["x-rava"];
        if (!configSet) {
            configSet = new Set();
            node["x-rava"] = configSet;
        }
        if (configSet.has(config)) {
            doCallback(node, "added", config, data);
            return;
        }
        configSet.add(config);

        if (typeof data === "function") {
            data = data.call(node);
        }

        Object.getOwnPropertyNames(config).forEach(function (name) {
            if (name === "events") {
                handleEvents(node, config, selector, data);
                return;
            }
            if (name === "methods") {
                handleMethods(node, config[name]);
                return;
            }
            if (name === "callbacks") {
                handleCallbacks(node, config, selector, data);
                return;
            }
            if (name === "ref") {
                handleReference(node, config, data);
                return;
            }
            if (name === "refs") {
                handleReferences(node, config, selector, data);
                return;
            }
            if (startsWith.call(name, "$")) {
                handleInlineEvents(node, config, selector, data, name);
                return;
            }
            if (name == "created" || name == "added" || name == "removed" || name == "data" || name == "scoped" || name == "target") {
                return;
            }
            if (typeof config[name] === "function") {
                if (rava.debug) {
                    console.log("directly mapping function " + name);
                }
                handleMethod(node, name, config[name]);
                return;
            }
            if (rava.debug) {
                console.log("unknown configuration of " + name);
            }
        });

        if (node.hasAttributes()) {
            var attrs = node.attributes;
            for (var i = attrs.length - 1; i >= 0; i--) {
                if (startsWith.call(attrs[i].name, "rava-on:")) {
                    handleAttrBinding(node, config, selector, attrs[i].name, data);
                }
            }
        }

        doCallback(node, "created", config, data);
        doCallback(node, "added", config, data);
    };

    var handleMethods = function (node, funcs) {
        for (var funcName in funcs) {
            node[funcName] = funcs[funcName].bind(node);
        }
    };

    var handleMethod = function (node, name, func) {
        node[name] = func.bind(node);
    };

    var handleEvents = function (node, config, selector, data) {
        var events = config.events;
        var target = config.target || node;
        for (var key in events) {
            var keyType = events[key];
            if (typeof keyType === "function") {
                node.addEventListener(key, getEventHandler(key, target, data));
            } else if (typeof keyType === "string") {
                node.addEventListener(key, getEventHandler(keyType, target, data));
            } else {
                var newConfig = {};
                if (startsWith.call(key.trim(), ':scope')) {
                    newConfig.scoped = node;
                }
                newConfig.target = node;
                newConfig.events = keyType;
                newConfig.data = data;
                var extendedSelector = format(node, key.replace(':scope', selector)).trim();
                rava.bind(extendedSelector, newConfig);
            }
        }
    };

    var handleInlineEvents = function (node, config, selector, data, name) {
        var key_name = name.substring(1);
        var events = config[name];
        if (typeof events === "object") {
            for (var ref_selector in events) {
                var value = events[ref_selector];
                var newConfig = {};
                if (startsWith.call(ref_selector.trim(), ':scope')) {
                    newConfig.scoped = node;
                    ref_selector = format(node, ref_selector.replace(':scope', selector)).trim();
                }
                newConfig.target = node;
                newConfig.events = {};
                newConfig.events[key_name] = value;
                newConfig.data = data;
                rava.bind(ref_selector, newConfig);
            }
        } else {
            if (rava.debug) {
                console.log("unknown type " + (typeof events) + " for event collector");
            }
        }
    };

    var handleCallbacks = function (node, config, selector, data) {
        var callbacks = config.callbacks;
        for (var key in callbacks) {
            var value = callbacks[key];
            if (typeof value === "object") {
                var newConfig = {};
                if (startsWith.call(key.trim(), ':scope')) {
                    newConfig.scoped = node;
                }
                newConfig.target = config.target || node;
                newConfig.callbacks = value;
                newConfig.data = data;
                var extendedSelector = format(node, key.replace(':scope', selector)).trim();
                rava.bind(extendedSelector, newConfig);
            }
        }
    };

    var handleReference = function (node, config, data) {
        var reference = config.ref;
        if (typeof reference === "string") {
            if (data[reference]) {
                if (!Array.isArray(data[reference])) {
                    temp = data[reference];
                    data[reference] = [temp];
                }
                data[reference].push(node);
            } else {
                data[reference] = node;
            }
            return;
        } else {
            if (rava.debug) {
                console.log("unknown type " + (typeof reference) + " for reference");
            }
        }
    };

    var handleReferences = function (node, config, selector, data) {
        var references = config.refs;
        if (typeof references === "object") {
            for (var ref_selector in references) {
                var value = references[ref_selector];
                var newConfig = {};
                if (!startsWith.call(ref_selector.trim(), ':root')) {
                    ref_selector = selector + " " + ref_selector;
                    newConfig.scoped = node;
                }
                newConfig.target = node;
                newConfig.ref = value;
                newConfig.data = data;
                rava.bind(ref_selector, newConfig);
            }
        } else {
            if (rava.debug) {
                console.log("unknown type " + (typeof references) + " for references");
            }
        }
    };

    // bindings by attribute
    var handleAttrBinding = function (node, config, selector, name, data) {
        var key = name.substring(8);
        let value = node.getAttribute(name);
        var target = node;
        var possibleFunc = target[value];
        if (typeof possibleFunc === "function") {
            node.addEventListener(key, getEventHandler(value, target, data));
            node.removeAttribute(name);
        } else {
            if (rava.debug) {
                console.log("unable to find matching function " + value + " for ")
                console.log(selector + " with attr " + name);
            }
        }
    };

    var doCallback = function (element, name, config, data) {
        if (config.callbacks) {
            if (config.callbacks[name]) {
                config.callbacks[name].call(config.target || element, data, element);
            }
        } else {
            if (config[name]) {
                config[name].call(config.target || element, data, element);
            }
        }
    }

    var getEventHandler = function (funcName, target, data) {
        return function (event) {
            target[funcName](event, data);
        };
    };

    //standard string to use 
    var functionStart = "var __out='";
    var functionEnd = "';return __out;";

    //this determins the matching elements that surround the word to be swapped out
    var interpolate = /\$\{(.+?)\}/g

    // converts first property to bracket notation against the inherent object being passed in
    // ${foo.bar} => ${__obj['foo'].bar
    var startProp = /([^\.\[]+)/;

    // convert dot notation to bracket notation property names
    // ${foo.bar} => ${foo['bar']}
    var prop2Index = /\.([^\.\[\(]+)/g;
    //capture .numeric notation(why would you do this?)
    //${foo.1} => ${foo[1]}
    var num2Index = /\.(\d+)/g;
    // searches for just a default value
    var defValue = /([^\|]+?)\|([^\|]+)/;
    //searches for the last right bracket
    var lastBracket = /(\][^\]])*$/

    // scriptlets
    // if a default value is defined wrap the object access in a try catch
    var defValueFunction = "' + (function(){ var _reply = null; try { _reply = '$1'; $3 } catch (e) { _reply = '$2' }; return _reply; })() + '";

    function bodyOfFunction(str) {
        var response = functionStart + str.replace(interpolate, objectReplacer) + functionEnd;
        if (rava.debug) {
            console.log("post compilation : " + response);
        }
        response = response.replace(/(?:\r|\n)/g, '');
        return response;
    }

    function objectReplacer(_overallMatch, match1) {
        var options, defStr = null;
        if (defValue.test(match1)) {
            options = match1.match(defValue);
            match1 = options[1];
            defStr = options[2];
        }
        // we're modifying the first property declaration and append it to the internal object identifier
        // we do this so that accessing the passed in property is easier and doesn't rely on using the
        // 'with' command.
        var response = match1.trim().replace(startProp, "' + __obj['$1']");
        // replacing any dot notation with bracket notation. If the dot notation has a numeric value we
        // don't quote it
        response = response.replace(num2Index, "\[$1\]").replace(prop2Index, "['$1']");

        // find the last bracket and add the beginning of a string to coerce the response into a string
        response = response.replace(lastBracket, " +'");

        // if we have a default value identified then we wrap the initial object access into a try catch
        // and assign the default value in the catch
        if (defStr && defStr.length > 0) {
            response = defValueFunction.replace("\$1", response).replace("\$2", defStr.trim());
        }
        return response;
    }

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
