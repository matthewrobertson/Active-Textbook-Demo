; // start this bad boy off with a semicolon, thats right a semicolon

(function($) {

	/************ BEGIN VirtualRectangle Class Definition ***********/
	var VirtualRectangle = function(startRect, options) {
		this.options = options;
		this.startRect = startRect;
		this.top 	= startRect.top;
		this.left 	= startRect.left;
		this.width 	= startRect.width;
		this.height = startRect.height;
		this.scale 	= 1.0;
	};

	VirtualRectangle.prototype.applyConstraints = function() {
		
	};

	VirtualRectangle.prototype.getZoom = function() {
		return this.height / this.startRect.height;
	};

	VirtualRectangle.prototype.getOffsetX = function() {
		return (this.left - this.startRect.left) / this.scale;
	};

	VirtualRectangle.prototype.getOffsetY = function() {
		return (this.top - this.startRect.top) / this.scale;
	};

	VirtualRectangle.prototype.pan = function(deltaX, deltaY) {
		this.top += deltaY;
		this.left += deltaX;
	}

	VirtualRectangle.prototype.zoom = function(originX, originY, delta) {
		var scale = (this.width + delta) / this.startRect.width;
		
		var scale = (this.width + delta) / this.startRect.width;
		var width = scale * this.startRect.width;
		var height = scale * this.startRect.height;
		if( width /  this.startRect.width > 2) {
			width = this.startRect.width * 2;
			height = this.startRect.height * 2;
		}

		// we want to keep the transorm origin in th same place on screen
		// so we need to do a transformation to compensate

		var rightShift = (originX)/(this.startRect.width) * (width - this.width);
		var upShift = (originY)/(this.startRect.height) * (height - this.height);
		
		this.width = width;
		this.height = height;
		this.scale = scale;
		this.top -= upShift;
		this.left -= rightShift; 
	};

	VirtualRectangle.prototype.applyScale = function(originX, originY, scale, startRect) {

		//alert("4");
		
		
		var width = scale * startRect.width;
		var height = scale * startRect.height;
//alert("5");
		if( width /  this.startRect.width > this.options.maxScale) {
			width = this.startRect.width * this.options.maxScale;
			height = this.startRect.height * this.options.maxScale;
		}
//alert("6");
		var rightShift = (originX)/(this.startRect.width) * (width - this.width);
		var upShift = (originY)/(this.startRect.height) * (height - this.height);

		
		// we want to keep the transorm origin in th same place on screen
		// so we need to do a transformation to compensate
		// var rightShift =0// 0.5 * (width - this.width);
		// var upShift = 0//.5 * (height - this.height);
		//alert("7");
		this.width = width;
		this.height = height;
		this.scale = this.width / this.startRect.width;
		//alert("8");
		this.top -= upShift;
		this.left -= rightShift;
	};

	/************ END VirtualRectangle Class Definition ***********/

	var getTransformString = function(vrect) {
		var str =  'scale(' + vrect.getZoom() + ') '
			str +=	'translate('+vrect.getOffsetX()+'px, '+vrect.getOffsetY()+'px)'
			return str;
	};
	
	var bindMouseWheelHandler = function($elem, vRect, startRender, stopRender, options) {
		var timeout = null;
		// zoom via mouse wheel events
		$elem.mousewheel(function(event, dt) {

			event.preventDefault();
			if( !options.shouldZoom() ) return;

			
			//var x = event.
			vRect.zoom(event.offsetX, event.offsetY, dt*options.scaleRate);
			//vRect.zoom(event.offsetX, event.offsetY, dt*options.scaleRate);
			
			if(timeout) {
				clearTimeout(timeout);
			}
			startRender();
			// set the timeout to stop running
			timeout = setTimeout(function() {
				stopRender();
			}, 55);
			
		});
	};

	var bindMouseDownHandler = function($elem, vRect, startRender, stopRender, options) {
		var mouseTrack = false;
		var mousePos = {
			x: 0,
			y: 0
		}
		// pan and zoom via click and drag
		$elem.bind("mousedown", function(e) {
			mouseTrack = true;
			mousePos.x = e.clientX;
			mousePos.y = e.clientY;
			startRender();
		}).bind("mouseup", function(e) {
			mouseTrack = false;
			stopRender();
		}).bind("mousemove", function(e) {
			if( !options.shouldPan() ) return;
			if(mouseTrack) {
				var deltaX = e.clientX - mousePos.x;
				var deltaY = e.clientY - mousePos.y;
				vRect.pan(deltaX, deltaY);
				vRect.applyConstraints();
				mousePos.x = e.clientX;
				mousePos.y = e.clientY;
			}
		});
		
	};

	var bindGestureHandler = function($elem, vRect, startRender, stopRender, options) {

		var timeout; // capture this the click handler functions closure
		var startRect = {
			height: vRect.height,
			width: vRect.width
		}

		$elem.on("gesturestart", function(event) {
			event.preventDefault();
			//alert("1");
			
			// need to apply zooms relative to the rectangle
			// size at the start of the gesture
			startRect.height = vRect.height;
			startRect.width = vRect.width;
			startRect.pageX = event.originalEvent.pageX;
			startRect.pageY = event.originalEvent.pageY;
			startRender();
		}).on("gestureend", function(event) {
			event.preventDefault();
			//alert("2");
			stopRender();
		}).on("gesturechange", function(event) {
			event.preventDefault();
			//alert("3");
			vRect.applyScale(event.originalEvent.pageX, event.originalEvent.pageY, event.originalEvent.scale, startRect);
			vRect.pan((event.originalEvent.pageX - startRect.pageX), (event.originalEvent.pageY - startRect.pageY)) ;
			startRect.pageX = event.originalEvent.pageX;
			startRect.pageY = event.originalEvent.pageY;
		});
	}

	$.fn.zoomAndScale = function(options) {

		options = $.extend({}, $.fn.zoomAndScale.defaults, options);

		return this.each(function() {
			var $elem = $(this);
			var dontRender = true;
			
			var startRect = {
				top: 0,
				left: 0,
				width: $elem.width(),
				height: $elem.height()
			};
			var virtualRect = new VirtualRectangle(startRect, options);

			$elem.css('-webkit-transform-origin', "0 0");

			// render loop for the element
			var render = function() {
				if(dontRender) return;
				$elem.css('-webkit-transform', getTransformString(virtualRect) );
				setTimeout(render, options.frameRate);
			};

			var startRender = function() {
				if(dontRender) {
					dontRender = false;
					render();
				}
			};

			var stopRender = function() {
				dontRender = true;
			}

			bindMouseDownHandler($elem, virtualRect, startRender, stopRender, options);
			bindMouseWheelHandler($elem, virtualRect, startRender, stopRender, options);
			bindGestureHandler($elem, virtualRect, startRender, stopRender, options);
		
			
		});
	};

	$.fn.zoomAndScale.defaults = {
		frameRate: 50,
		scaleRate: 50,
		shouldPan: function() { return true; },
		shouldZoom: function() { return true; },
		minScale: 0.3,
		maxScale: 2
	}

})(jQuery);