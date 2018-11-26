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
(function() {
    var rava = {};
    var tagSelectors = {};

    if (!Element.prototype.matches) {
        Element.prototype.matches = Element.prototype.msMatchesSelector;
    }

    if (typeof NodeList.prototype.forEach !== "function"
            && typeof Array.prototype.forEach === "function") {
        NodeList.prototype.forEach = Array.prototype.forEach;
    }

    rava.decorate = function(selector, config) {
        tagSelectors[selector] = config;
        document.querySelectorAll (selector).forEach (function(node) {
            wrap (node, config);
        });
    };

    new MutationObserver (function(mutations) {
        mutations.forEach (function(mutation) {
            traverse(mutation.addedNodes,added);
            traverse(mutation.removedNodes,removed);
        });
    }).observe (document.body, {
        attributes : false,
        childList : true,
        subtree : true,
        characterData : false
    });

    var traverse = function(nodeList, callback){
        nodeList.forEach (function(node){
            var checkSet = new Set ();
            checkSet.add (node);
            checkSet.forEach (function(foundElement) {
                callback (foundElement);
                var foundElements = foundElement.children;
                if (foundElements) {
                    for (var i = 0; i < foundElements.length; i++) {
                        checkSet.add (foundElements[i]);
                    }
                }
                checkSet["delete"] (foundElement);
            });
        });
    };

    var added = function(foundElement){
        if (foundElement.matches) {
            for ( var selector in tagSelectors) {
                if (foundElement.matches (selector)) {
                    wrap (foundElement, tagSelectors[selector]);
                }
            }
        }
    };

    var removed = function(node){
        var configSet = node["x-rava"];
        if (!configSet) {
            return;
        }
        configSet.forEach(function(config){
            if (config.callbacks && config.callbacks.removed) {
                config.callbacks.removed.call (node);
            }
            return;
        });
    };

    var wrap = function(node, config) {
        var configSet = node["x-rava"];
        if (!configSet) {
            configSet = new Set ();
            node["x-rava"] = configSet;
        }
        if (configSet.has (config)) {
            if (config.callbacks && config.callbacks.added) {
                config.callbacks.added.call (node);
            }
            return;
        }
        configSet.add (config);

        var names = Object.getOwnPropertyNames (config);
        var data = config.data;
        names.forEach (function(name) {
            if (name === "constructor") {
                return;
            }
            if (name === "events") {
                registerEventHandlers (node, data, config[name]);
            }
            if (name === "methods") {
                handleMethods (node, config[name]);
            }
            if (name === "data") {
                node.data = config.data;
            }
        });
        if (config.callbacks) {
            if (config.callbacks.created) {
                config.callbacks.created.call (node);
            }
            if (config.callbacks.added) {
                config.callbacks.added.call (node);
            }
        }
    };

    var targetedEventHandler = function(fn, correctTarget, data) {
        return function(event) {
            if (!event.target.matches (correctTarget)) {
                return;
            }
            fn.call (this, event, data);
        };
    };

    var handleMethods = function(node, funcs) {
        for ( var funcName in funcs) {
            node[funcName] = funcs[funcName].bind(node);
        }
    };

    var registerEventHandlers = function(node, data, events) {
        for ( var eventName in events) {
            var possibleFunc = events[eventName];
            var targetNode = node;
            if (typeof possibleFunc !== "object") {
                targetNode.addEventListener (eventName, function(event) {
                    possibleFunc.call (node, event, data);
                });
            } else {
                var selector = eventName;
                for ( var childEventName in possibleFunc) {
                    var func = targetedEventHandler (
                            possibleFunc[childEventName], selector, data);
                    targetNode.addEventListener (childEventName, (function(
                            func, node, data) {
                        return function(event) {
                            func.call (node, event, data);
                        }
                    }) (func, node, data));
                }
            }
        }
    };

    if (typeof define === 'function' && define.amd) {
        define (rava);
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            rava : rava
        };
    } else {
        window.rava = rava;
    }
})();
