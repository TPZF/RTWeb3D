/******************************************************************************* 
* Copyright 2012, 2013 CNES - CENTRE NATIONAL d'ETUDES SPATIALES 
* 
* This file is part of SITools2. 
* 
* SITools2 is free software: you can redistribute it and/or modify 
* it under the terms of the GNU General Public License as published by 
* the Free Software Foundation, either version 3 of the License, or 
* (at your option) any later version. 
* 
* SITools2 is distributed in the hope that it will be useful, 
* but WITHOUT ANY WARRANTY; without even the implied warranty of 
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the 
* GNU General Public License for more details. 
* 
* You should have received a copy of the GNU General Public License 
* along with SITools2. If not, see <http://www.gnu.org/licenses/>. 
******************************************************************************/ 

/**
 * Histogram module : create histogram to the given image
 */
define([], function() {

// Private variables
var nbBins;

var hist = [];
var hmax; // histogram max to scale in image space

// Origin histogram point
var originX = 0.;
var originY;
var hwidth;

/**************************************************************************************************************/

/**
 *	Get mouse position on canvas
 */
function _getMousePos(canvas, evt) {
var rect = canvas.getBoundingClientRect();
	return {
		x: evt.clientX - rect.left,
		y: evt.clientY - rect.top
	};
}

/**************************************************************************************************************/

/**
 *	TODO: split on HistogramView and Histogram
 *	Histogram contructor
 *	@param options Histogram options
 *		<ul>
 *			<li>image: The image which is represented by current histogram(required)</li>
 *			<li>nbBins: Number of bins, representing the sampling of histogram(optional)</li>
 *		</ul>
 */
var Histogram = function(options)
{
	nbBins = options.nbBins || 256;
	this.image = options.image;

	// Init canvas
	var canvas = document.getElementById(options.canvas);
	this.ctx = canvas.getContext('2d');

	// Init origins
	originY = canvas.height - 10;
	hwidth = nbBins > canvas.width ? canvas.width : nbBins; // clamp to canvas.width
	this.update();

	// Show bin pointed by mouse
	var self = this;
	canvas.addEventListener('mousemove', function(evt) {
		var mousePos = _getMousePos(canvas, evt);

		self.ctx.clearRect(0., originY, canvas.width, 10.);			

		if ( mousePos.y > canvas.height || mousePos.y < 0. || mousePos.x > nbBins || mousePos.x < 0. )
		{
			return;
		}
        
        self.ctx.font = '8pt Calibri';
        self.ctx.fillStyle = 'yellow';
        // Scale from mouse to image
        var thresholdValue = Math.floor(((mousePos.x/256.)*(self.image.tmax-self.image.tmin) + self.image.tmin)*1000)/1000;
        self.ctx.fillText(thresholdValue, canvas.width/2-15., originY+10.);
        self.ctx.fillRect( mousePos.x, originY, 1, 2 );
	});
}

/**************************************************************************************************************/

/**
 *	Draw histogram
 */
Histogram.prototype.drawHistogram = function() {
	this.ctx.fillStyle = "blue";
	for ( var i=0; i<hist.length; i++ )
	{
		// Scale to y-axis height
		var rectHeight = (hist[i]/hmax)*originY;
		this.ctx.fillRect( originX + i, originY, 1, -rectHeight );
	}
}

/**************************************************************************************************************/

/**
 *	Draw histogram axis
 */
Histogram.prototype.drawAxes = function() {

	var leftY, rightX;
	leftY = 0;
	rightX = originX + hwidth;
	// Draw y axis.
	this.ctx.moveTo(originX, leftY);
	this.ctx.lineTo(originX, originY);

	// Draw x axis.
	this.ctx.moveTo(originX, originY);
	this.ctx.lineTo(rightX, originY);

	// Define style and stroke lines.
	this.ctx.strokeStyle = "#fff";
	this.ctx.stroke();
}

/**************************************************************************************************************/

/**
 *	Draw transfer function(linear, log, asin, sqrt, sqr)
 */
Histogram.prototype.drawTransferFunction = function()
{
	// Draw transfer functions
	// "Grey" colormap for now(luminance curve only)
	this.ctx.fillStyle = "red";
	for ( var i=0; i<nbBins; i++ )
	{
		var value = i;
		var posX = originX + value;

		var scaledValue;
		switch( this.image.transferFn )
		{
			case "linear":
				scaledValue = (value/nbBins)*originY;
				break;
			case "log":
				scaledValue = Math.log(value/10.+1)/Math.log(nbBins/10. + 1)*originY;
				break;
			case "sqrt":
				scaledValue = Math.sqrt(value/10.)/Math.sqrt(nbBins/10.)*originY;
				break;
			case "sqr":
				scaledValue = Math.pow(value,2)/Math.pow(nbBins, 2)*originY;
				break;
      		case "asin":
      			scaledValue = Math.log(value + Math.sqrt(Math.pow(value,2)+1.))/Math.log(nbBins + Math.sqrt(Math.pow(nbBins,2)+1.))*originY;
      			break;
			default:
				break;
		}

		if ( !this.image.inverse )
		{
			scaledValue = originY - scaledValue
		}

		this.ctx.fillRect( posX, scaledValue, 1, 1);
	}
}

/**************************************************************************************************************/

/**
 *	Draw the histogram in canvas
 */
Histogram.prototype.draw = function()
{
	this.ctx.clearRect(0,0, this.ctx.canvas.width, this.ctx.canvas.height);
	this.drawHistogram();
	this.drawTransferFunction();
	this.drawAxes();
}

/**************************************************************************************************************/

/**
 *	TODO : create different module
 *	Compute histogram values
 */
function compute(histogram)
{
	var image = histogram.image;
	// Initialize histogram
	hist = new Array(nbBins);
	for ( var i=0; i<hist.length; i++ )
	{
		hist[i] = 0;
	}

	// Compute histogram
	hmax = Number.MIN_VALUE;
	for ( var i=0; i<image.pixels.length; i++ )
	{
		var val = image.pixels[i];
		
		// Skip NaN
		if ( isNaN(val) )
			continue;
		// Take only values which belongs to the interval [tmin,tmax]
		if ( val < image.tmin )
			continue;
		if ( val >= image.tmax )
			continue;

		// Scale to [0,255]
		var bin = Math.floor(nbBins * (val - image.tmin)/(image.tmax - image.tmin));
		hist[bin]++;

		// Compute histogram max value
		if ( hist[bin] > hmax )
		{
			hmax = hist[bin];
		}
	}

	// Logarithmic scale for better layout
	for ( var i=0; i<hist.length; i++ )
	{
		hist[i] = Math.log(1 + hist[i]);
	}
	hmax = Math.log(1 + hmax);
}

/**************************************************************************************************************/

/**
 *	Update the histogram
 */
Histogram.prototype.update = function()
{
	compute(this);
	this.draw();
}

/**************************************************************************************************************/

return Histogram;
});