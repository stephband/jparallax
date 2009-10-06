// jquery.jparallax.js
// dev
// Stephen Band
//
// Project and documentation site:
// webdev.stephband.info/jparallax/
//
// Dependencies:
// jQuery 1.2.6 - 1.3.x (jquery.com)

//(function(jQuery) {

// VAR

var plugin = "parallax",
    undefined,
    options = {
        mouseport:              jQuery(),               // Mouseport
        xparallax:              true,                   // Sets directions to move in
        yparallax:              true,                   //
        xorigin:                0.5,                    // Sets default alignment - only comes into play when travel is not 1
        yorigin:                0.5,                    //
        xtravel:                1,                      // Factor by which travel is amplified
        ytravel:                1,                      //
        takeoverFactor:         0.66,                   // Sets rate of decay curve for catching up with target mouse position
        takeoverThresh:         0.002,                  // Sets the distance within which virtualmouse is considered to be on target, as a multiple of mouseport width.
        frameDuration:          25,                     // In milliseconds
        layerFreezeClass:       'freeze',               // Class added to layer when frozen
        layerCss:               {position: "absolute"}  // CSS given to layers
    },
    value = {left: 0, top: 0, middle: 0.5, center: 0.5, centre: 0.5, right: 1, bottom: 1},
    regex = {
        px:         /^\d+\s?px$/,
        percent:    /^\d+\s?%$/,
        html:       /\.html?\s?$/,
        hash:       /^#/
    },
    mouseObj = function(){
        this.ontarget   = false;
        this.thresh     = 0.01;
        this.decay      = 0.666;
        this.pos        = [0.5, 0.5];
        this.updatePos  = function(portSize, pointerPos){
            var pos = [], x;
            
            // Calculate position as ratio
            x = 2; while (x--) { pos[x] = pointerPos[x] / portSize[x]; }
            
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
    portObj = function(elem){
        var offset = elem.is('*') ? elem.offset() : {left: 0, top: 0} ;         // Check if elem is a DOM element. If not (ie. window or document), offset [0, 0].
        
        this.elem           = elem;
        this.size           = [elem.width(), elem.height()];
        this.pos            = [offset.left, offset.top];
        this.activeOutside  = false;
        this.active         = function(pointer){
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
        
        var thing = 6;
        
        this.enter = function(e){
            var port = e.data.port;
            
            port.inside = 1;
            
            //port.pointer = [e.pageX - port.pos[0], e.pageY - port.pos[1]];
            
            //console.log(port.pointer);
        };
        this.leave = function(e){
            var port = e.data.port,
                x;
            
            port.inside = -1;
            
            // TODO: If port is not a DOM element, mouseleave coords (e.pageX and e.pageY) are really spurious in Safari.  
            port.pointer = [e.pageX - port.pos[0], e.pageY - port.pos[1]];
            
            // Truncate exit pos at port boundaries
            x = 2; while (x--) { port.pointer[x] = port.pointer[x] < 0 ? 0 : port.pointer[x] > port.size[x] ? port.size[x] : port.pointer[x] ; }
            
            console.log(port.pointer);            
        };
        
        elem
        .bind('mouseenter', {port: this}, this.enter)
        .bind('mouseleave', {port: this}, this.leave);
    },
    layerObj = function(elem){
        this.elem   = elem;
        this.size   = [elem.width(), elem.height()];
        this.trav   = [1, 1];
        this.trpx   = [false, false];
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
            return false;
        },
        unfreeze: function(e){
            return false;
        }
    };

// FUNCTIONS

function distance(start, end){                                              // Takes two coord arrays of the form [x, y]
    var d = [end[0] - start[0], end[1] - start[1]];
    return Math.sqrt( d[0] * d[0] + d[1] * d[1] ) ;
}

function quickDistance(start, end){                                         // Takes two coord arrays of the form [x, y]
    var x = absolute(end[0] - start[0]),
        y = absolute(end[1] - start[1]);
    
    return x > y ? x : y ;
}

function parseValue(value) { return this.lib[value]; }

function absolute(x) { return x < 0 ? -x : x; }

parseValue.lib = value;


// PLUG DEFINITION

jQuery.fn[plugin] = function(o){                                      // TEST: test_plug.html
    
    var options = jQuery.extend({}, jQuery.fn[plugin].options, o);
    
    var mport = new portObj(options.mouseport);
    var mouse = new mouseObj();
    
    jQuery.timer.init({frameDuration: options.frameDuration});
    
    return this.each(function(){
        
        var layer = new layerObj(jQuery(this));
        
        jQuery.extend(layer, {
            trav: [1, 1],
            trpx: [false, false],
            offset: [0, 0]
        });
        
        jQuery()
        .bind('frame', function(e){
            var pointer = jQuery.pointer();
            
            if (mport.active(pointer)) {
                mouse.updatePos(mport.size, mport.pointer);
                layer.updatePos(mouse.pos);
                layer.updateCss();
            };
        });
    })
    .bind("freeze", actions.freeze)
    .bind("unfreeze", actions.unfreeze)
    .css(options.layerCss);
}

jQuery.fn[plugin].options = options;

// RUN

jQuery.pointer.init();

jQuery(document).ready(function(){

});



//})(jQuery);