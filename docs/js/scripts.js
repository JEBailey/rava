rava.bind("#nav li",{
    events:{
        click: function(event) {
            rava.findAll(this.parentElement,"li").forEach(function(element) {
                element.classList.remove("is-active");
            });
            this.classList.add("is-active");
        }
    }
});

rava.bind("section.hero",{
    events:{
        // :scope is used here to limit which list items we're interested in.
        // In Rava the :scope keyword is replaced by the existing selector
        // this is done due to inconsistent handling of :scope. i.e. I hate IE
        ":scope #nav li" : {
            click: function(event) {
                var targetId = event.currentTarget.dataset.target;
                var tabs = rava.findAll(this.parentElement,".tab-pane");
                tabs.forEach(function(tab) {
                    if (tab.id == targetId) {
                      tab.style.display = "block";
                      tab.classList.add("is-active");
                    } else {
                      tab.style.display = "none";
                      tab.classList.remove("is-active");
                    }
                });
            }
        }
    }
});

rava.bind(".burger", {
    callbacks: {
        created : function(){
            this.burgerTarget = document.querySelector('#'+this.dataset.target);
        }
    },
    events : {
        click: function(){
            this.burgerTarget.classList.toggle('is-active');
            this.classList.toggle('is-active');
        }
    }
});

rava.bind(".remote-content", {
    callbacks: {
        created : function(){
            var currentElement = this;
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
              if (this.readyState == 4 && this.status == 200) {
                currentElement.innerHTML = this.responseText;
              }
            };
            xhttp.open("GET", this.dataset.target, true);
            xhttp.send();
        }
    }
});

//first rava example
rava.bind('rava-time',{
    callbacks:{
        created: function(){
            this.start();
        }
    },
    methods : {
        start : function() {
            this.tick();
            this.__timeInterval = setInterval(this.tick,1000);
        },
        stop : function() {
            this.__timeInterval = clearInterval(this.__timeInterval);
        },
        tick : function() {
            this.textContent = new Date().toLocaleTimeString();
        }
    },
    events : {
        click : function() {
            if (this.__timeInterval){
                this.stop();
            } else {
                this.start();
            }
        }
    }
});

//this isn't rava based
window.onload = function() {
    Particles.init({
      selector: '.background',
      maxParticles: 40,
      sizeVariations : 6,
      minDistance: 60,
      connectParticles : true
    });
  };

  rava.bind('table',{
    events : {
        click : function() {
            window.alert("clicked");
        },
        // :scope is a proper css psuedo-class which defines those elements that are a child of 
        // the given element. Here however, since support is not universal, a prefix of :scope is
        // used to trigger a separate process internally to identify the child elements
        ":scope tbody tr" : {
            click : function(event){
                // allthough we have the event listener on the 'tr' element. The callback is executed 
                // with the 'table' being the scope. To find out which 'tr' element was clicked we
                // use currentTarget of the event.  
                var clicked = event.currentTarget;
                rava.findAll(this,'tr').forEach(function(row){
                    row.classList.remove('is-selected');
                });
                clicked.classList.add('is-selected');
                // we want to prevent the event bubbling here or it wil be picked up by the other listener
                event.preventDefault();
            }
        }
    }
});