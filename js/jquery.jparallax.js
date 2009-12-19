// jquery.jparallax.js
// 1.0 - pre
// Stephen Band
//
// Project and documentation site:
// webdev.stephband.info/jparallax/
//
// Repository:
// github.com/stephband/jparallax
//
// Dependencies:
// jquery.event.frame
// webdev.stephband.info/events/frame/

(function(jQuery, undefined) {

// Plugin name
var plugin = "parallax";

// VAR

var options = {
        mouseport:      jQuery(window),     // jQuery object or selector string - page element to use as mouse detector
        xparallax:      true,               // boolean | 0-1 | 'npx' | 'n%' - Sets axis of reaction and by how much they react
        yparallax:      true,               //
        xorigin:        0.5,                // 0-1 - Sets default alignment. Only works when parallax is something other than 1 or true
        yorigin:        0.5,                //
        takeoverDecay:  0.66,               // 0-1 (0 instant, 1 forever) - Sets rate of decay curve for catching up with target mouse position
        frameDuration:  30,                 // Int (milliseconds)
        freezeClass:    'freeze'            // String - Class added to layer when frozen
    },
    value = {
        left: 0,
        top: 0,
        middle: 0.5,
        center: 0.5,
        right: 1,
        bottom: 1
    },
    regex = {
        px:         /^\d+\s?px$/,
        percent:    /^\d+\s?%$/
    },
    frameEvent = 'frame.'+plugin,
    abs = Math.abs,
    pointer = [0, 0];

// CONSTRUCTORS

function Mouse(options, pointer){
    // console.log('new Mouse(' + options + ', ' + pointer + ')');
    
    var parallax = [!(options.xparallax === false || options.xparallax === 0),
                    !(options.yparallax === false || options.yparallax === 0)];
    
    this.ontarget = false;
    this.decay = options.takeoverDecay;
    this.pointer = pointer || options.pointer || [0, 0];
    this.update = function(pointer, threshold){
        // Pointer is already on target
        if (this.ontarget) {
            this.pointer = pointer;
        }
        // Pointer has arrived within the target thresholds
        else if ( (!parallax[0] || abs(pointer[0] - this.pointer[0]) < threshold[0]) &&
                  (!parallax[1] || abs(pointer[1] - this.pointer[1]) < threshold[1]) ) {
            this.ontarget = true;
            this.pointer = pointer;
        }
        // Pointer is nowhere near the target
        else {
            var lagPointer = [],
                x = 2;
            
            while (x--) {
                if ( parallax[x] ) {
                    lagPointer[x] = pointer[x] + this.decay * (this.pointer[x] - pointer[x]) ;
                }
            }
            this.pointer = lagPointer;
        }
    };
}
    
function Port(object, options){
    var self = this,
        elem = ( typeof object === 'string' ) ? jQuery(object) : object ,
        inside = 0,
        parallax = [!(options.xparallax === false || options.xparallax === 0),
                    !(options.yparallax === false || options.yparallax === 0)],
        leaveCoords;
    
    this.pointer = options.pointer || [0, 0];
    this.active = false;
    this.activeOutside = (options && options.activeOutside) || false;
    this.update = function(coords){
        var pos = this.pos,
            size = this.size,
            pointer = [],
            x = 2;
        
        // Is mouse inside port?
        // Yes.
        if ( inside > 0 ) {
            // But it just went outside, so make this the last move, use coords stored by mouseleave event
            if ( inside === 2 ) {
                inside = 0;
                if (leaveCoords) coords = leaveCoords;
            }
            
            while (x--) {
                if ( parallax[x] ) {
                    pointer[x] = (coords[x] - pos[x]) / size[x] ;
                    pointer[x] = pointer[x] < 0 ? 0 : pointer[x] > 1 ? 1 : pointer[x] ;
                }
            }
            
            this.active = true;
            this.pointer = pointer;
        }
        // No.
        else {
            this.active = false;
        }
    };
    this.updateSize = function(){
        var width = elem.width(),
            height = elem.height();
        
        self.size = [width, height];
        self.threshold = [ 1/width, 1/height ];
    };
    this.updatePos = function(){
        var offset = elem.offset() || {left: 0, top: 0},
            left = parseInt(elem.css('borderLeftWidth')) + parseInt(elem.css('paddingLeft')),
            top = parseInt(elem.css('borderTopWidth')) + parseInt(elem.css('paddingTop'));
        
        self.pos = [offset.left + left, offset.top + top];
    };
    
    jQuery(window)
    .bind('resize', self.updateSize)
    .bind('resize', self.updatePos);
    
    elem
    .bind('mouseenter', function(e){
        inside = 1;
    })
    .bind('mouseleave', function(e){
        inside = 2;
        leaveCoords = [e.pageX, e.pageY];
    });
    
    this.updateSize();
    this.updatePos();
}

function Layer(elem, options){
    var parallax = [],
        px = [];
    
    this.offset = [0, 0];
    this.update = function(pointer){
        var pos = [],
            size = this.size,
            css = {},
            position,
            margin,
            x = 2;
        
        while (x--) {
            if ( parallax[x] ) {
                pos[x] = parallax[x] * pointer[x] + this.offset[x];
                
                // Calculate css
                position = ( px[x] ) ? undefined : pos[x] * 100 + '%' ;
                margin = ( px[x] ) ? pos[x] * -1 + 'px' : pos[x] * size[x] * -1 + 'px' ;
                
                // Fill in css object
                if ( x === 0 ) {
                    css.left = position;
                    css.marginLeft = margin;
                }
                else {
                    css.top = position;
                    css.marginTop = margin;
                }
            }
        }
        
        elem.css(css);
    };
    this.setParallax = function(x, y){
        var p, i = 2;
        
        // Work out what units we're dealing with
        while (i--) {
            p = arguments[i];
        
            parallax[i] = 
                // Boolean true - convert to ratio 1
                p === true ? 1 :
                // Percentages - convert to ratio 0-1
                regex.percent.test(p) ? parseFloat(p)/100 :
                // Pixels
                regex.px.test(p) ? parseInt(p) :
                // Any other value
                p ;
            
            // Set px flags
            px[i] = regex.px.test(p);
        }
    }
    this.getPointer = function(){
        // Calculates layer pointer from current position of layer
        var vp = elem.offsetParent(),
            pos = elem.position(),
            pointer = [ pos.left / (vp.outerWidth() - this.size[0]) , pos.top / (vp.outerHeight() - this.size[1]) ];
        
        return pointer;
    };
    this.updateSize = function(size){
        this.size = size || [elem.outerWidth(), elem.outerHeight()];
    };
    
    this.updateSize(options.size);
    this.setParallax(options.xparallax, options.yparallax);
}

// EVENT HANDLERS

function update(e){
    
    var elem = jQuery(this),
        global = e.data,
        local = elem.data(plugin),
        port = global.port,
        mouse = global.mouse,
        localmouse = local.mouse,
        process = global.timeStamp !== e.timeStamp;
    
    // Global objects have yet to be processed for this frame
    if ( process ) {
        // Set timeStamp to current time
        global.timeStamp = e.timeStamp;
    
        // Process mouseport
        port.update(pointer);
        
        // Process mouse
        if ( port.active || !mouse.ontarget ) {
            mouse.update(port.pointer, port.threshold);
        }
    }
    
    // Layer has it's own mouse
    if ( localmouse !== undefined ) {
    
        // Process mouse
        localmouse.update( local.freeze ? local.freeze.pointer : port.pointer, port.threshold );
    
        // If it hits target
        if ( localmouse.ontarget ) {
            
            // Destroy it
            delete local.mouse;
    
            // And stop animating frozen layers
            if (local.freeze) {
                elem
                .unbind(frameEvent)
                .addClass(global.freezeClass);
            }
        }
        
        // Use localmouse in place of mouse
        mouse = localmouse;
    }
    // Layer is responding to global mouse
    else {
        // When no longer active, unbind
        if ( mouse.ontarget && !port.active ) {
            elem.unbind(frameEvent);
        }
    }
    
    local.layer.update(mouse.pointer);
}

function parseValue(value) { return this.lib[value]; }
parseValue.lib = value;


// PLUG DEFINITION

jQuery.fn[plugin] = function(o){
    var global = jQuery.extend({}, jQuery.fn[plugin].options, o),
        args = arguments,
        layers = this,
        port = new Port(global.mouseport, global),
        mouse = new Mouse(global);
    
    global.port = port;
    global.mouse = mouse;
    
    global.mouseport
    .bind("mouseenter", function(e){
        mouse.ontarget = false;
        
        // Animate unfrozen layers
        layers
        .each(function(i){
            var layer = jQuery(this);
            
            if ( !layer.data(plugin).freeze ) {
                layer
                .bind(frameEvent, global, update);
            }
        });
    });
    
    return layers
    .bind("freeze", function(e){
        var elem = jQuery(this),
            local = elem.data(plugin),
            mouse = local.mouse || local.freeze || global.mouse,
            x = regex.percent.exec(e.x) ? parseFloat(e.x.replace(/%$/, ''))/100 : (e.x || mouse.pointer[0]) ,
            y = regex.percent.exec(e.y) ? parseFloat(e.y.replace(/%$/, ''))/100 : (e.y || mouse.pointer[1]) ,
            decay = e.decay;
        
        // Store position
        local.freeze = {
            pointer: [x, y]
        };
        
        // Create local mouse, passing in current pointer with options
        local.mouse = new Mouse(global);
        local.mouse.pointer = mouse.pointer;
        if (decay !== undefined) local.mouse.decay = decay;
            
        elem
        .bind(frameEvent, global, update);
    })
    .bind("unfreeze", function(e){
        var elem = jQuery(this),
            local = elem.data(plugin),
            decay = e.decay,
            pointer;
        
        if (local.freeze) {
            // Create local mouse, passing local freeze pointer with options
            pointer = local.mouse ? local.mouse.pointer : local.freeze.pointer ;
            local.mouse = new Mouse(global);
            local.mouse.pointer = pointer;
            if (decay !== undefined) local.mouse.decay = decay;
            
            // Destroy local.freeze
            delete local.freeze;
            
            // Animate
            elem
            .removeClass(options.freezeClass)
            .bind(frameEvent, global, update);
        }
    })
    .each(function(i){
        var elem = jQuery(this),
            layerOptions = jQuery.extend({}, global, args[i+1]),
            layer = new Layer(elem, layerOptions);
        
        // Set up layer data
        // Giving it a local mouse initialises it as an independent layer
        elem.data(plugin, {
            layer: layer,
            mouse: new Mouse(layerOptions, layer.getPointer())
        });
    });
};

// EXPOSE

jQuery.fn[plugin].options = options;

// RUN

jQuery(document).ready(function(){
    // Pick up and store mouse position on jQuery(document)
    // IE does not register mousemove on jQuery(window)
    jQuery(document)
    .mousemove(function(e){
        pointer = [e.pageX, e.pageY];
    });
});

}(jQuery));