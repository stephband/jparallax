// jquery.events.frame.js
// 1.0
// Stephen Band
// 
// Project home
// webdev.stephband.info/events/frame

(function(jQuery){

var undefined,
    timer = {
        frameDur: 40,
        start: function(elem, fd){
            if ( !this.clock ) {
                // Init the clock
                this.handler = jQuery.event.special.frame.handler;
                this.frameCount = 0;
                this.array = [elem];
                this.clockFirst = setTimeout(this.trigger, 0);
                this.clock = setInterval(this.trigger, fd || this.frameDur);
            }
            else {
                // Add element to array
                this.array.push(elem);
            }
        },
        stop: function(elem){
            var array = this.array,
                l = array.length;
            
            // Remove element from list
            while (l--) {
                if (array[l] === elem) {
                    array.splice(l, 1);
                    break;
                }
            }
            // Stop clock when list is empty
            if ( array.length === 0 ) {
                clearInterval( this.clock );
                this.clockFirst = null;
                this.clock = null;
            }
        },
        trigger: function(){
            var fn = timer.handler,
                event = jQuery.Event("frame"),
                array = timer.array,
                l = array.length;
            
            // Update event and use it to call handler
            event.frameCount = timer.frameCount++;
            while (l--) { fn.call(array[l], event); }
        }
    };

jQuery.event.special.frame = {
    setup: function(data) {
        timer.start( this, (data && data.frameDuration) );
        //return false;
    },
    teardown: function() {
        timer.stop( this );
        //return false;
    },
    handler: function(event){
        // let jQuery handle the calling of event handlers
        jQuery.event.handle.apply(this, arguments);
    }
};

})(jQuery);