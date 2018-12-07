rava.decorate("#nav li",{
    events:{
        click: function(event) {
            rava.query(this.parentElement,"li").forEach(function(element) {
                element.classList.remove("is-active");
            });
            this.classList.add("is-active");
        }
    }
});

rava.decorate("section.hero",{
    events:{
        "#nav li" : {
            click: function(event) {
                var targetId = event.currentTarget.dataset.target;
                var tabs = rava.query(this.parentElement,".tab-pane");
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

rava.decorate(".burger", {
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

rava.decorate(".remote-content", {
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
rava.decorate('rava-time',{
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

