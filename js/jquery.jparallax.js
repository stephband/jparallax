// jquery.jparallax.js
// dev
// Stephen Band
//
// Project and documentation site:
// webdev.stephband.info/jparallax/
//
// Dependencies:
// jQuery > 1.3.3 (jquery-nightly.js)

(function(jQuery) {

// VAR

// Plugin name
var plugin = "parallax";

var undefined,
    options = {
        mouseport:              jQuery(window),         // Mouseport
        xparallax:              true,                   // Sets directions to travel in
        yparallax:              true,                   //
        xorigin:                0.5,                    // Sets default alignment - only comes into play when travel is not 1
        yorigin:                0.5,                    //
        xtravel:                1,                      // Factor by which travel is 'amplified'
        ytravel:                1,                      //
        takeoverDecay:          0.66,                   // Sets rate of decay curve for catching up with target mouse position
        takeoverThresh:         0.002,                  // Sets the distance within which virtualmouse is considered to be on target, as a multiple of mouseport width
        frameDuration:          25,                     // In milliseconds
        layerFreezeClass:       'freeze'                // Class added to layer when frozen
    },
    value = {left: 0, top: 0, middle: 0.5, center: 0.5, centre: 0.5, right: 1, bottom: 1},
    abs = Math.abs,
    regex = {
        px:         /^\d+\s?px$/,
        percent:    /^\d+\s?%$/,
        html:       /\.html?\s?$/,
        hash:       /^#/
    },
    pointer = [],
    Mouse = function(options){
        this.ontarget   = false;
        this.thresh     = options.takeoverThresh || 0.01;
        this.decay      = options.takeoverDecay || 0.666;
        this.pos        = [0.5, 0.5];
        this.updatePos  = function(portSize, pointerPos){
            var pos = [], x = 2;
            
            // Calculate position as ratio
            while (x--) { pos[x] = pointerPos[x] / portSize[x]; }
            
            if (!this.ontarget) {
                if ( distance(this.pos, pos ) < this.thresh) {
                    // Lock mouse to pointer
                    this.ontarget = true;
                }
                else {
                    // Follow pointer with mouse, lagging according to decay
                    x = 2; while (x--) { pos[x] = pos[x] + this.decay * (this.pos[x] - pos[x]); }
                };
            }
            this.pos = pos;
            return pos;
        };
    },
    Port = function(elem, options){
        var self = this;
        this.elem = elem;
        this.updateSize = function(){
            self.size = [self.elem.width(), self.elem.height()];
        };
        this.updatePos = function(){
            var elem = self.elem;
                offset = elem.offset() || {left: 0, top: 0};
            
            this.pos = [offset.left, offset.top];
        };
        this.activeOutside = (options && options.activeOutside) || false;
        this.active = function(pointer){
            var pos = this.pos,
                size = this.size,
                activeOutside = this.activeOutside,
                inside = [],
                x;
            // Is mouse inside port?
            
            // Method 1 (uses pointer position calculations)
            // x = 2; while (x--) {
            //     var d = pointer[x] - pos[x];
            //     if (activeOutside || d > 0 && d < size[x]) { inside[x] = d; }
            //     // No
            //     else { return false; }
            // }
            // // Yes
            // this.pointer = inside;
            // return inside;
            
            // Method 2 (uses flags from mouseenter and mouseleave events)
            // Yes.
            if (activeOutside || this.inside > 0) {
                x = 2; while (x--) {
                    inside[x] = pointer[x] - pos[x];
                }
                this.pointer = inside;
                return inside;
            }
            // No, but it only just went outside so make one last move.
            if (this.inside < 0) {
                this.inside = 0;
                return this.pointer;
            }
            // No.
            return false;
        };
        this.enter = function(e){
            var port = e.data.port;
            
            port.inside = 1;
            
            //port.pointer = [e.pageX - port.pos[0], e.pageY - port.pos[1]];
        };
        this.leave = function(e){
            var port = e.data.port,
                x = 2;
            
            port.inside = -1;
            
            // TODO: If port is not a DOM element, mouseleave coords (e.pageX and e.pageY) are really spurious in Safari.  
            port.pointer = [e.pageX - port.pos[0], e.pageY - port.pos[1]];
            
            // Truncate exit pos at port boundaries
            while (x--) { port.pointer[x] = port.pointer[x] < 0 ? 0 : port.pointer[x] > port.size[x] ? port.size[x] : port.pointer[x] ; }
            
            //console.log(port.pointer);            
        };
        
        jQuery(window)
        .bind('resize', this.updateSize)
        .bind('resize', this.updatePos);
        
        elem
        .bind('mouseenter', {port: this}, this.enter)
        .bind('mouseleave', {port: this}, this.leave);
        
        this.updateSize();
        this.updatePos();
    },
    Layer = function(elem, options){
        this.elem   = elem;
        this.size   = options.size || [elem.width(), elem.height()];
        this.trav   = options.travel || [1, 1];
        this.trpx   = options.travelpx || [false, false];
        this.offset = [0, 0];
        this.pos    = [];
        this.updatePos = function(mousePos){
            var pos = [], x;
            x = 2; while (x--) { pos[x] = this.trav[x] * mousePos[x] + this.offset[x]; }
            this.pos = pos;
            return pos;
        };
        this.updateCss = function(){
            var pos = this.pos,
                size = this.size,
                trpx = this.trpx,
                css =  {
                    left:       (trpx[0]) ? undefined : pos[0] * 100 + '%' ,
                    marginLeft: (trpx[0]) ? pos[0] * -1 + 'px' : pos[0] * size[0] * -1 + 'px' ,
                    top:        (trpx[1]) ? undefined : pos[1] * 100 + '%' ,
                    marginTop:  (trpx[1]) ? pos[1] * -1 + 'px' : pos[1] * size[1] * -1 + 'px'
                };
            this.elem.css(css);
            return css;
        };
    },
    actions = {
        freeze: function(e){
            jQuery(this).unbind('frame.'+plugin);
            return false;
        },
        unfreeze: function(e){
            // Start animating layer, passing options in as e.data
            // Special event 'frame' will pick up and use frameDuration
            jQuery(this).bind('frame.'+plugin, e.data, actions.update);
            return false;
        },
        update: function(e){
            var data = jQuery(this).data(plugin),
                options = e.data,
                layer = data.layer,
                mouse = data.mouse,
                port = options.port;
            
            if (port.active(pointer)) {
                mouse.updatePos(port.size, port.pointer);
                layer.updatePos(mouse.pos);
                layer.updateCss();
            };
        }
    };

// FUNCTIONS

// Takes two coord arrays of the form [x, y], returns vector distance
function distance(start, end){
    var d = [end[0] - start[0], end[1] - start[1]];
    return Math.sqrt( d[0] * d[0] + d[1] * d[1] );
}

// Takes two coord arrays of the form [x, y], returns shortest difference
function quickDistance(start, end){
    var x = abs(end[0] - start[0]),
        y = abs(end[1] - start[1]);
    
    return x > y ? x : y ;
}

function parseValue(value) { return this.lib[value]; }
parseValue.lib = value;


// PLUG DEFINITION

jQuery.fn[plugin] = function(o){
    
    var options = jQuery.extend({}, jQuery.fn[plugin].options, o);
    
    var port = new Port(options.mouseport, options);
    var mouse = new Mouse(options);
    
    options.port = port;
    
    return this.each(function(){
        
        var layer = new Layer(jQuery(this), options);
        
        jQuery(this).data(plugin, {
            layer: layer,
            mouse: mouse
        });
        
    })
    .bind("freeze", options, actions.freeze)
    .bind("unfreeze", options, actions.unfreeze)
    .trigger("unfreeze");
}

// RUN

jQuery.fn[plugin].options = options;

// READY

jQuery(document).ready(function(){
    jQuery(window)
    .mousemove(function(e){
        pointer = [e.pageX, e.pageY];
    });
});

})(jQuery);