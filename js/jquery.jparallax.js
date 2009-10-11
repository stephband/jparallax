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
        frameDuration:          30,                     // In milliseconds
        freezeClass:            'freeze'                // Class added to layer when frozen
    },
    value = {left: 0, top: 0, middle: 0.5, center: 0.5, centre: 0.5, right: 1, bottom: 1},
    abs = Math.abs,
    regex = {
        px:         /^\d+\s?px$/,
        percent:    /^\d+\s?%$/
    },
    pointer = [0.5, 0.5],
    // Event handlers
    actions = {
        freeze: function(e){
            var elem = jQuery(this),
                local = elem.data(plugin),
                global = e.data,
                mouse = local.mouse || local.freeze || global.mouse,
                x = regex.percent.exec(e.x) ? parseFloat(e.x.replace(/%$/, ''))/100 : (e.x || mouse.pointer[0]) ,
                y = regex.percent.exec(e.y) ? parseFloat(e.y.replace(/%$/, ''))/100 : (e.y || mouse.pointer[1]) ;
            
            // Store position, copying mouse pointer
            local.freeze = {
                pointer: [x, y]
            }
            
            // Create local mouse, passing in current pointer with options
            global.pointer = mouse.pointer;
            local.mouse = new Mouse(global);
                
            elem
            .bind('frame.'+plugin, global, actions.update);
        },
        unfreeze: function(e){
            var elem = jQuery(this),
                local = elem.data(plugin),
                global = e.data;
            
            if (local.freeze) {
                // Create local mouse, passing local freeze pointer with options
                global.pointer = local.mouse ? local.mouse.pointer : local.freeze.pointer ;
                local.mouse = new Mouse(global);
                
                // Destroy local.freeze
                local.freeze = null;
                
                // Animate
                elem
                .removeClass(options.freezeClass)
                .bind('frame.'+plugin, global, actions.update);
            }
        },
        activate: function(e){
            var global = e.data;
            
            global.mouse.ontarget = false;
            
            // Animate unfrozen layers
            this
            .not('.'+global.freezeClass)
            .bind('frame.'+plugin, global, actions.update);
        },
        update: function(e){
            var elem = jQuery(this),
                global = e.data,
                local = elem.data(plugin),
                port = global.port,
                mouse = local.mouse;
            
            // Layer has it's own mouse
            if ( mouse ) {
                // Process mouse and destroy it when it hits target
                if ( mouse.update( local.freeze ? local.freeze.pointer : port.pointer ) ) {
                    local.mouse = null;
                    if (local.freeze) {
                        elem
                        .unbind('frame.'+plugin)
                        .addClass(global.freezeClass);
                    }
                }
            }
            // Layer responds to global mouse
            else {
                mouse = global.mouse;
                
                // Only process global objects once per frame
                if ( global.timeStamp !== e.timeStamp ) {
                    global.timeStamp = e.timeStamp;
                    
                    // console.log('Frame: '+e.frameCount);
                    
                    // The port is active
                    if ( port.update(pointer) || !mouse.ontarget ) {
                        mouse.update(port.pointer);
                    }
                }
                
                // When no longer active, unbind
                if ( mouse.ontarget && !port.active ) {
                    elem.unbind('frame.'+plugin);
                }
            }
            
            local.layer.update(mouse.pointer);
            
            return false;
        }
    };

// CONSTRUCTORS

function Mouse(options){
    this.ontarget = false;
    this.thresh = options.takeoverThresh || 0.01;
    this.decay = options.takeoverDecay || 0.666;
    this.pointer = options.pointer || [0, 0];
    
    this.update = function(pointer){
        var decay = this.decay,
        
        // Pointer is already on target
        if (this.ontarget) {
            this.pointer = pointer;
        }
        // Pointer has arrived within the target threshold
        else if ( distance(this.pointer, pointer) < this.thresh ) {
            this.ontarget = true;
            // console.log('ONTARGET');
            this.pointer = pointer;
        }
        // Pointer is nowhere near the target
        else {
            var lagPointer = [],
                x = 2;
            while (x--) {
                lagPointer[x] = pointer[x] + decay * (this.pointer[x] - pointer[x]);
            }
            this.pointer = lagPointer;
        }
        
        return this.ontarget;
    };
}
    
function Port(elem, options){
    var self = this,
        inside = 0,
        leaveCoords;
    
    this.elem = elem;
    this.updateSize = function(){
        self.size = [self.elem.width(), self.elem.height()];
    };
    this.updatePos = function(){
        var elem = self.elem,
            offset = elem.offset() || {left: 0, top: 0};
        
        self.pos = [offset.left, offset.top];
    };
    this.pointer = options.pointer || [0, 0],
    this.active = false,
    this.activeOutside = (options && options.activeOutside) || false;
    this.update = function(coords){
        var pos = this.pos,
            size = this.size,
            pointer = [],
            x = 2;
        
        // Is mouse inside port?
        // Yes. Calculate pointer as ratio.
        if ( inside > 0 ) {
            while (x--) {
                pointer[x] = (coords[x] - pos[x]) / size[x];
            }
            this.pointer = pointer;
            this.active = true;
            return true;
        }
        // No, but it only just went outside, so make one last move.
        if ( inside < 0 ) {
            this.inside = 0;
            this.active = true;
            
            // Get coords stored by mouseleave event
            if (leaveCoords) coords = leaveCoords;
            
            // Truncate pointer at port boundary
            while (x--) {
                pointer[x] = (coords[x] - pos[x]) / size[x];
                pointer[x] = pointer[x] < 0 ? 0 : pointer[x] > 1 ? 1 : pointer[x] ;
            }
            this.pointer = pointer;
            return true;
        }
        // No.
        this.active = false;
        return false;
    };
    
    jQuery(window)
    .bind('resize', self.updateSize)
    .bind('resize', self.updatePos);
    
    elem
    .bind('mouseenter', function(e){
        inside = 1;
    })
    .bind('mouseleave', function(e){
        inside = -1;
        leaveCoords = [e.pageX, e.pageY];
    });
    
    this.updateSize();
    this.updatePos();
}

function Layer(elem, options){
    this.elem   = elem;
    this.size   = options.size || [elem.width(), elem.height()];
    this.trav   = options.travel || [1, 1];
    this.trpx   = options.travelpx || [false, false];
    this.offset = [0, 0];
    this.update = function(pointer){
        var pos = [],
            size = this.size,
            trpx = this.trpx,
            css,
            x = 2;
        
        while (x--) {
            pos[x] = this.trav[x] * pointer[x] + this.offset[x];
        }
        
        css =  {
            left:       (trpx[0]) ? undefined : pos[0] * 100 + '%' ,
            marginLeft: (trpx[0]) ? pos[0] * -1 + 'px' : pos[0] * size[0] * -1 + 'px' ,
            top:        (trpx[1]) ? undefined : pos[1] * 100 + '%' ,
            marginTop:  (trpx[1]) ? pos[1] * -1 + 'px' : pos[1] * size[1] * -1 + 'px'
        };
        
        this.elem.css(css);
    };
}

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
    
    var global = jQuery.extend({}, jQuery.fn[plugin].options, o),
        layers = this,
        port = new Port(global.mouseport, global),
        mouse = new Mouse(global);
    
    global.port = port;
    global.mouse = mouse;
    
    global.mouseport
    .bind("mouseenter", global, actions.activate, layers);
    
    return layers
    .bind("freeze", global, actions.freeze)
    .bind("unfreeze", global, actions.unfreeze)
    .each(function(){
        var layer = jQuery(this),
            layerData = new Layer(layer, global);
        
        layer.data(plugin, {
            layer: layerData
        });
    });
}

// EXPOSE

jQuery.fn[plugin].options = options;

// RUN

jQuery(document).ready(function(){
    jQuery(window)
    .mousemove(function(e){
        pointer = [e.pageX, e.pageY];
    });
});

})(jQuery);