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
        mouseport:              jQuery(window),         // Mouseport
        xparallax:              true,                   // Sets directions to travel in
        yparallax:              true,                   //
        xtravel:                1,                      // Factor by which travel is 'amplified'
        ytravel:                1,                      //
        xorigin:                0.5,                    // Sets default alignment - only comes into play when travel is not 1
        yorigin:                0.5,                    //
        takeoverDecay:          0.66,                   // 0 - instant, 1 - forever. Sets rate of decay curve for catching up with target mouse position
        takeoverThresh:         0.002,                  // Sets the distance within which virtualmouse is considered to be on target, as a multiple of mouseport width
        frameDuration:          30,                     // In milliseconds
        freezeClass:            'freeze'                // Class added to layer when frozen
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
    abs = Math.abs,
    pointer = [0.5, 0.5];

// CONSTRUCTORS

function Mouse(options){
    var parallax = options.parallax;
    
    this.ontarget = false;
    this.thresh = options.takeoverThresh || 0.01;
    this.decay = options.takeoverDecay || 0.666;
    this.pointer = options.pointer || [0, 0];
    this.update = function(pointer){
        var decay = this.decay;
        
        // Pointer is already on target
        if (this.ontarget) {
            this.pointer = pointer;
        }
        // Pointer has arrived within the target threshold
        else if ( quickDistance(this.pointer, pointer) < this.thresh ) {
            this.ontarget = true;
            this.pointer = pointer;
        }
        // Pointer is nowhere near the target
        else {
            var lagPointer = [],
                x = 2;
            
            while (x--) {
                if ( parallax[x] ) {
                    lagPointer[x] = pointer[x] + decay * (this.pointer[x] - pointer[x]) ;
                }
            }
            this.pointer = lagPointer;
        }
    };
}
    
function Port(elem, options){
    var self = this,
        inside = 0,
        parallax = options.parallax,
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
            return;
        }
        // No.
        this.active = false;
    };
    this.updateSize = function(){
        self.size = [elem.width(), elem.height()];
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
    var parallax = options.parallax ;
    
    this.trav   = options.travel || [1, 1];
    this.trpx   = options.travelpx || [false, false];
    this.offset = [0, 0];
    this.update = function(pointer){
        var pos = [],
            size = this.size,
            trpx = this.trpx,
            css = {},
            position,
            margin,
            x = 2;
        
        while (x--) {
            if ( parallax[x] ) {
                pos[x] = this.trav[x] * pointer[x] + this.offset[x];
                
                // Calculate css
                position = (trpx[x]) ? undefined : pos[x] * 100 + '%' ;
                margin = (trpx[x]) ? pos[x] * -1 + 'px' : pos[x] * size[x] * -1 + 'px' ;
                
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
    this.updateSize = function(size){
        this.size = size || [elem.outerWidth(), elem.outerHeight()];
    };
    
    this.updateSize(options.size);
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

// EVENT HANDLERS

function update(e){
    
    var elem = jQuery(this),
        global = e.data,
        local = elem.data(plugin),
        port = global.port,
        mouse = local && local.mouse;
    
    // Layer has it's own mouse
    if ( mouse ) {
        // Process mouse
        mouse.update( local.freeze ? local.freeze.pointer : port.pointer );

        // Destroy it when it hits target
        if ( mouse.ontarget ) {
            local.mouse = null;

            // And stop animating frozen layers
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
        
        // Process global objects once per frame
        if ( global.timeStamp !== e.timeStamp ) {
            global.timeStamp = e.timeStamp;
            
            // Process mouseport
            port.update(pointer);
            
            // And mouse pointer
            if ( port.active || !mouse.ontarget ) {
                mouse.update(port.pointer);
            }
        }
        
        // When no longer active, unbind
        if ( mouse.ontarget && !port.active ) {
            elem.unbind('frame.'+plugin);
        }
    }
    
    //log.html(
    //    'pointer [' + pointer[0].toFixed(2) + ', ' + pointer[1].toFixed(2) + '] ' +
    //    'port.pointer [' + port.pointer[0].toFixed(2) + ', ' + port.pointer[1].toFixed(2) + '] ' + 
    //    'mouse.pointer [' + mouse.pointer[0].toFixed(2) + ', ' + mouse.pointer[1].toFixed(2) + '] '
    //);
    
    local.layer.update(mouse.pointer);
}

function parseValue(value) { return this.lib[value]; }
parseValue.lib = value;


// PLUG DEFINITION

jQuery.fn[plugin] = function(o){
    var global = jQuery.extend({}, jQuery.fn[plugin].options, o, {
            parallax: [ ( o && o.xparallax === false ? false : true ), ( o && o.yparallax === false ? false : true ) ]
        }),
        layers = this,
        port = new Port(global.mouseport, global),
        mouse = new Mouse(global);
    
    global.port = port;
    global.mouse = mouse;
    
    global.mouseport
    .bind("mouseenter", function(e){
        mouse.ontarget = false;
        
        // Animate unfrozen layers
        this
        .not('.'+global.freezeClass)
        .bind('frame.'+plugin, global, update);
    }, layers);
    
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
        .bind('frame.'+plugin, global, update);
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
            local.freeze = null;
            
            // Animate
            elem
            .removeClass(options.freezeClass)
            .bind('frame.'+plugin, global, update);
        }
    })
    .each(function(){
        var layer = jQuery(this),
            layerData = new Layer(layer, global);
        
        layer.data(plugin, {
            layer: layerData
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