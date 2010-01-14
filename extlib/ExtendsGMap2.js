/*
    ExtendsGMap2.js - extends Google Maps API

    $Id: ExtendsGMap2.js 371 2009-10-17 12:00:42Z hwat $
    (c) 2009 WATANABE Hiroaki <hwat at mac dot com>
    This is distributed under the MIT license.
*/
(function (){

    GPolyline.prototype.getIndexOfVertex = function(/*GLatLng*/glatlng,options){
        options = options || {};
        var earthRound = options.earthRound || 6378137;
        var min = earthRound;
        var len = this.getVertexCount() - 1;
        var minindex = -1;
        for( var i = 0; i < len; ++i ){
            var p0 = this.getVertex(i);
            var p1 = glatlng;
            var p2 = this.getVertex(i+1);
            if( p1.equals(p0) ){
                minindex = i;
                break;
            }else if( p1.equals(p2) ){
                minindex = i + 1;
                break;
            }else{
                var b = new GLatLngBounds();
                b.extend(p0);
                b.extend(p2);
                if( b.containsLatLng(p1) ){
                    var p10x = p1.lng() - p0.lng();
                    var p10y = p1.lat() - p0.lat();
                    var p20x = p2.lng() - p0.lng();
                    var p20y = p2.lat() - p0.lat();
                    var m = Math.abs( Math.atan2(p10y,p10x) - Math.atan2(p20y,p20x) );
                    if( m < min ){
                        min = m;
                        minindex = i;
                    }
                }
            }
        }
        if( minindex < 0 ){
            // choose nearest point
            var min = earthRound;
            for( var i = 0; i < len; ++i ){
                var dist = glatlng.distanceFrom(this.getVertex(i),earthRound);
                if( dist < min ){
                    min = dist;
                    minindex = i;
                }
            }
        }        
        var si = -1;
        if( 0 <= minindex ){
            var si  = glatlng.distanceFrom(this.getVertex(minindex  ),earthRound)
                    < glatlng.distanceFrom(this.getVertex(minindex+1),earthRound)
                    ? minindex : minindex +1;
        }
        return si;
    }

})();
