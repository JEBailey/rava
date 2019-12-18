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
    var startsWith = String.prototype.startsWith || function(searchString, position){
        position = position || 0;
        return this.substr(position, searchString.length) === searchString;
    };
    //polyfilling for template literals
    var format = function( node, string){
        var regex = /{(\w+)}/g;
        var found = string.match(regex);
        if (found){
            found.forEach(
                function(found){
                    var oldValue = found.slice(1,found.length-1);
                    if(oldValue in node.dataset){
                        string = string.replace(found, node.dataset[oldValue]);
                    } else {
                        console.log("unable to find data-" + oldValue + "in element " + node);
                    }
                }
            )
        }
        return string;
    }
    
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
        forEach.call(document.querySelectorAll(selector), function (node) {
            wrap(node, selector, config);
        });
    };

    /**
     * locates the first element below the given element that matches the selector
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
            }
            if (name === "methods") {
                handleMethods(node, config[name]);
            }
            if (name === "callbacks") {
                handleCallbacks(node, config, selector, data);
            }
        });
        if (config.callbacks) {
            doCallback(node, "created", config, data);
            doCallback(node, "added", config, data);
        }
    };

    var handleMethods = function (node, funcs) {
        for (var funcName in funcs) {
            node[funcName] = funcs[funcName].bind(node);
        }
    };

    var handleEvents = function (node, config, selector, data) {
        var events = config.events;
        var target = config.target || node;
        for (var key in events) {
            var possibleFunc = events[key];
            if (typeof possibleFunc === "function") {
                node.addEventListener(key, getEventHandler(possibleFunc, target, data));
            } else {
                var newConfig = {};
                if (startsWith.call(key.trim(),':scope')){
                    newConfig.scoped = node;
                }
                newConfig.target = node;
                newConfig.events = possibleFunc;
                newConfig.data = data;
                var extendedSelector = format(node,key.replace(':scope', selector)).trim();
                rava.bind(extendedSelector, newConfig);
            }
        }
    };

    var handleCallbacks = function (node, config, selector, data) {
        var callbacks = config.callbacks;
        for (var key in callbacks) {
            var value = callbacks[key];
            if (typeof value === "object") {
                var newConfig = {};
                if (startsWith.call(key.trim(),':scope')){
                    newConfig.scoped = node;
                }
                newConfig.target = config.target || node;
                newConfig.callbacks = value;
                newConfig.data = data;
                var extendedSelector = format(node,key.replace(':scope', selector)).trim();
                rava.bind(extendedSelector, newConfig);
            }
        }
    };

    var doCallback = function (element, name, config, data) {
        if (config.callbacks) {
            if (config.callbacks[name]) {
                config.callbacks[name].call(config.target || element, data, element);
            }
        }
    }

    var getEventHandler = function (func, target, data) {
        return function (event) {
            func.call(target, event, data);
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
