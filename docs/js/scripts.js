
rava.debug = true;

rava.bind(".burger", {
    callbacks: {
        created: function () {
            this.burgerTarget = document.querySelector('#'
                + this.dataset.target);
        }
    },
    events: {
        click: function () {
            this.burgerTarget.classList.toggle('is-active');
            this.classList.toggle('is-active');
        }
    }
});



// first rava example
rava.bind('time', {
    callbacks: {
        created: function () {
            this.start();
        }
    },
    methods: {
        start: function () {
            this.tick();
            this.__timeInterval = setInterval(this.tick, 1000);
        },
        stop: function () {
            this.__timeInterval = clearInterval(this.__timeInterval);
        },
        tick: function () {
            this.textContent = new Date().toLocaleTimeString();
        }
    },
    events: {
        click: function () {
            if (this.__timeInterval) {
                this.stop();
            } else {
                this.start();
            }
        }
    }
});

rava.bind('table', {
    events: {
        // This is an example of direct event handling where the name of the
        // property
        // is the event name that is being listened for, in this case, it's the
        // click
        // event that is being listened for by the table element
        // This should only fire if you clicked on the table header or footer
        click: function () {
            window.alert("clicked");
        },
        // :scope is a proper css psuedo-class which defines those elements that
        // are a child of
        // the given element. Here however, since support is not universal, a
        // prefix of :scope
        // is used to trigger a new scoped binding that is looking for elements
        // beneath the
        // target element to be bound to
        "tbody tr": {
            click: function (event) {
                // allthough we have the event listener on the 'tr' element. The
                // callback is
                // executed with the 'table' being the scope. To find out which
                // 'tr' element
                // was clicked we use the currentTarget of the event.
                var clicked = event.currentTarget;
                rava.findAll(this, 'tr').forEach(function (row) {
                    row.classList.remove('is-selected');
                });
                clicked.classList.add('is-selected');
                // we want to prevent the event bubbling here or it wil be
                // picked up by the
                // 'click' listener on the table
                event.stopPropagation();
            }
        },
        // This is a global intercept. Because no ':scope' is defined, we've
        // created a binding
        // that will occur anywhere in the document.
        ":root .button.is-warning": {
            click: function () {
                window.alert("oh my gosh");
            }
        }
    }
});

rava.bind('modal', {
    events: {
        // This is an example of direct event handling where the name of the
        // property is the event name that is being listened for, in this case, it's the
        // click event that is being listened for by the table element
        // This should only fire if you clicked on the table header or footer
        click: {
            // Caution should be taken when doing a global intercept. the following
            // binding will be applied
            // for each element that matches '.modal' in the parent binding.
            ":root .modal-trigger": {
                click: function () {
                    this.classList.add('is-active');
                }
            },
            ".modal-close": {
                click: function () {
                    this.classList.remove('is-active');
                }
            }
        }
    }
});

// find the switchable element
rava.bind('.switchable', {
    events: {
        // the switchable element has a data-target attribute, let's get the
        // value of that
        // attribute and create a binding with it
        "#{target}": {
            change: function (event) {
                var target = event.target;
                if (target.value === this.dataset.value) {
                    this.classList.remove("is-hidden");
                } else {
                    this.classList.add("is-hidden");
                }
            }
        }
    }
});

rava.bind(".notification", {
    events: {
        ".delete": {
            click: function () {
                this.remove();
            }
        }
    }
});

rava.bind(".remote-content", {
    created: function () {
        this.loadContent();
        var hash = location.hash;
        if (!hash) {
            hash = "welcome";
        } else {
            hash = hash.substring(1);
        }
        if (hash === this.dataset["ref"]) {
            this.classList.add("is-active");
        }
    },
    methods: {
        loadContent: function () {
            var currentElement = this;
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    currentElement.innerHTML = this.responseText;
                }
            };
            xhttp.open("GET", this.dataset.target, true);
            xhttp.send();
        }
    }
});

rava.bind("aside", {
    created: function (data) {
        var hash = location.hash;
        if (hash) {
            this.highlightMenuItem(hash, data)
        }
    },
    refs: {
        ":root .tab-pane": "content",
        ".menu-list a": "menuItems",
    },
    events_click: {
        ":root .menu-list a": "menuItemSelected",
    },
    methods: {
        menuItemSelected: function (event, data) {
            var href = event.target.getAttribute("href");
            if (href) {
                var shortHref = href.substring(1);
                data.content.forEach(function (item) {
                    if (item.dataset["ref"] == shortHref) {
                        item.classList.add("is-active");
                    } else {
                        item.classList.remove("is-active");
                    }
                });
                this.highlightMenuItem(href, data);
            }
        },
        highlightMenuItem: function (id, data) {
            data.menuItems.forEach(function (menuItem) {
                var href = menuItem.getAttribute("href");
                if (href) {
                    if (href == id) {
                        menuItem.classList.add("is-active");
                    } else {
                        menuItem.classList.remove("is-active");
                    }
                }
            });
        }
    }
});

rava.bind(".prettyprint", {
    callbacks: {
        created: function () {
            console.log("pretty printing " + this);
            window.hljs.highlightBlock(this);
        }
    }
});