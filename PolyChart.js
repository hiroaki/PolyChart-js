/*
    PolyChart - draw the chart by using Goole Maps API

    $Id: PolyChart.js 371 2009-10-17 12:00:42Z hwat $
    (c) 2009 WATANABE Hiroaki < hwat at mac dot com >
    This is distributed under the MIT license.
*/

PolyChart = function (){
    this.initialize.apply(this,arguments);
}
PolyChart.extendObject = function (base_object, extensions){
    for (var prop in extensions) {
        base_object[prop] = extensions[prop];
    }
    return base_object;
}
PolyChart.NAME = 'PolyChart';
PolyChart.VERSION = '0.4.1';
PolyChart.prototype = {
    initialize: function (map,data,options){
        this.map        = map;
        this.data       = data;     // data like [ [{x:x0,y:y0},{x:x1,y:y1},{x:xN,y:yN}],[...],[...]...]
        this.options    = PolyChart.extendObject({
                            "width":null,
                            "height":null,
                            "centerLatLng":new GLatLng(35.6841306,139.774103),  // the origin of road of Japan
                            "zoomLevel":8,
                            "useDivContainer":false,
                            "mapPadding":0,
                            "fieldPadding":null,
                            "fieldPaddingTop":20,
                            "fieldPaddingLeft":60,
                            "fieldPaddingBottom":40,
                            "fieldPaddingRight":20,
                            // styles
                            "lineColor":['#009900'],
                            "lineWeight":[1],
                            "lineOpacity":[1],
                            "xAxisY":0,
                            "xAxisColor":'#333333',
                            "xAxisWeight":1,
                            "xAxisOpacity":1,
                            "yAxisX":0,
                            "yAxisColor":'#333333',
                            "yAxisWeight":1,
                            "yAxisOpacity":1,
                            "fieldStrokeColor":'#e5e3df',
                            "fieldStrokeWeight":0,
                            "fieldStrokeOpacity":0,
                            "fieldFillColor":'#e5e3df',
                            "fieldFillOpacity":1
                            }, options || {});

        if( ! (this.options.lineColor instanceof Array) )
            this.options.lineColor = [this.options.lineColor];
        if( ! (this.options.lineWeight instanceof Array) )
            this.options.lineWeight = [this.options.lineWeight];
        if( ! (this.options.lineOpacity instanceof Array) )
            this.options.lineOpacity = [this.options.lineOpacity];

        if( ! this.map.isLoaded() ){
            this.map.setCenter(this.options.centerLatLng,this.options.zoomLevel);
        }

        // GPolyline for Charts
        this.graph = [];
        // GPolyline for X/Y-Axis
        this.x_axis = null;
        this.y_axis = null;
        // GPolygon for Field
        this.field = null;
        // GLatLngBounds of Field
        this.glatlngbounds = null;
        // GTileLayer for Ground
        this.layer = null;

        // which function is right?
        this.map.convertPixelToLatLng = this.options.useDivContainer
                                        ? this.map.fromContainerPixelToLatLng
                                        : this.map.fromDivPixelToLatLng;

        // init Ground
        this.layer = new GTileLayer(new GCopyrightCollection(), 4, 12);
        this.layer.getTileUrl = function (){ return ''; };
        this.maptype = new GMapType([this.layer], this.map.getCurrentMapType().getProjection(), 'Chart');
        this.map.addMapType(this.maptype);
        this.map.setMapType(this.maptype);

        // when zoomend, z-index order of GPolygon and GPolylines is changed by the version of API
        /*
        GEvent.bind(this.map,'zoomend',this,function (oldlevel,newlevel){
            this.clear();
            this.overlay();
        })
        GEvent.bind(this.map,'moveend',this,function (oldlevel,newlevel){
            this.clear();
            this.overlay();
        })
        */

        this.reset();
    },
    reset: function (){

        this.clear();
        this.graph  = [];
        this.x_axis = null;
        this.y_axis = null;
        this.field  = null;
        this.glatlngbounds = new GLatLngBounds();

        if( this.options.centerLatLng instanceof GLatLng ){
            this.map.setCenter( this.options.centerLatLng, this.options.zoomLevel );
        }

        if( this.options.fieldPadding != null ){
            this.options.fieldPaddingTop    = this.options.fieldPadding;
            this.options.fieldPaddingLeft   = this.options.fieldPadding;
            this.options.fieldPaddingBottom = this.options.fieldPadding;
            this.options.fieldPaddingRight  = this.options.fieldPadding;
        }

//        if( ! (this.data instanceof Array) || this.data.length < 1 ){
        if( this.data.length < 1 ){
            this.data = [];
            return;
        }

        // util
        var get_size_from_range = function (min,max){
            if( min < 0 ){
                if( max < 0 ){
                    return Math.abs(min) - Math.abs(max);   // - -
                }else{
                    return Math.abs(min) + Math.abs(max);   // - +
                }
            }else{
                if( max < 0 ){
                    throw new Error(PolyChart.NAME +': this is a bug.');
                }else{
                    return Math.abs(max) - Math.abs(min);   // + +
                }
            }
        };

        // range of data
        var graph_max_x  = 0;
        var graph_max_y  = 0;
        var graph_min_x  = 0;
        var graph_min_y  = 0;
        var graph_width  = 0;
        var graph_height = 0;
        if( 0 < this.data.length && 0 < this.data[0].length ){
            graph_max_x = this.data[0][0].x;
            graph_max_y = this.data[0][0].y;
            graph_min_x = this.data[0][0].x;
            graph_min_y = this.data[0][0].y;
            for( var i = 0; i < this.data.length; ++i ){
                var idata = this.data[i];
                for( var j = 0; j < idata.length; ++j ){
                    if( graph_max_x < idata[j].x ) graph_max_x = idata[j].x;
                    if( graph_max_y < idata[j].y ) graph_max_y = idata[j].y;
                    if( idata[j].x < graph_min_x ) graph_min_x = idata[j].x;
                    if( idata[j].y < graph_min_y ) graph_min_y = idata[j].y;
                }
            }
        }
        graph_width  = get_size_from_range(graph_min_x,graph_max_x);
        graph_height = get_size_from_range(graph_min_y,graph_max_y);

        // range of field
        var field_max_x = this.options.width || this.map.getSize().width;
        var field_max_y = this.options.height || this.map.getSize().height;
        var field_min_x = 0;
        var field_min_y = 0;
        var field_width  = get_size_from_range(field_min_x, field_max_x);
        var field_height = get_size_from_range(field_min_y, field_max_y);

        // fix scale rate and offset
        var fieldPad_x = this.options.fieldPaddingLeft + this.options.fieldPaddingRight  + this.options.mapPadding * 2;
        var fieldPad_y = this.options.fieldPaddingTop + this.options.fieldPaddingBottom + this.options.mapPadding * 2;
        var scale_rate_x = graph_width  / (field_width   - fieldPad_x );
        var scale_rate_y = graph_height / (field_height  - fieldPad_y );
        var offset_x = graph_min_x / scale_rate_x;
        var offset_y = graph_min_y / scale_rate_y;

        // function of transform coordinates
        var adjusted_x = GEvent.callback(this,function (origin_x){
            return origin_x / scale_rate_x - offset_x + this.options.fieldPaddingLeft + this.options.mapPadding;
        });
        var adjusted_y = GEvent.callback(this,function (origin_y){
            return field_height - (origin_y / scale_rate_y) + offset_y - this.options.fieldPaddingBottom - this.options.mapPadding;
        });

        //-- create overlays
        try{

            // create x-axis
            this.x_axis = new GPolyline([
                this.map.convertPixelToLatLng(new GPoint(adjusted_x(graph_min_x),adjusted_y(this.options.xAxisY))),
                this.map.convertPixelToLatLng(new GPoint(adjusted_x(graph_max_x),adjusted_y(this.options.xAxisY)))
                ], this.options.xAxisColor,this.options.xAxisWeight,this.options.xAxisOpacity);

            // create y-axis
            this.y_axis = new GPolyline([
                this.map.convertPixelToLatLng(new GPoint(adjusted_x(this.options.yAxisX),adjusted_y(graph_min_y))),
                this.map.convertPixelToLatLng(new GPoint(adjusted_x(this.options.yAxisX),adjusted_y(graph_max_y)))
                ], this.options.yAxisColor,this.options.yAxisWeight,this.options.yAxisOpacity);

            // create field
            this.glatlngbounds.extend(this.map.convertPixelToLatLng(new GPoint(field_max_x,field_min_y)));
            this.glatlngbounds.extend(this.map.convertPixelToLatLng(new GPoint(field_min_x,field_max_y)));
            var ne = this.glatlngbounds.getNorthEast();
            var sw = this.glatlngbounds.getSouthWest();
            this.field = new GPolygon(
                [
                    new GLatLng(ne.lat(),sw.lng()),
                    new GLatLng(ne.lat(),ne.lng()),
                    new GLatLng(sw.lat(),ne.lng()),
                    new GLatLng(sw.lat(),sw.lng()),
                    new GLatLng(ne.lat(),sw.lng())
                ],
            this.options.fieldStrokeColor,
            this.options.fieldStrokeWeight,
            this.options.fieldStrokeOpacity,
            this.options.fieldFillColor,
            this.options.fieldFillOpacity,
            {"clickable":false}
            );

            // create graph
            for( var i = 0; i < this.data.length; ++i ){
                var points = [];
                for( var j = 0; j < this.data[i].length; ++j ){
                    points.push(this.map.convertPixelToLatLng(
                        new GPoint(adjusted_x(this.data[i][j].x),adjusted_y(this.data[i][j].y))));
                }
                this.graph.push(this.createGPolyline(points,i));
            }
        }catch(e){
            this.graph = [];
        }
    },
    // createGPolyline(glatlngs, i [,{}])
    // this method is assumed to be override
    createGPolyline: function (glatlngs,i,options){
        options = PolyChart.extendObject({
                    }, options || {});
        var c = this.options.lineColor[0];
        var w = this.options.lineWeight[0];
        var o = this.options.lineOpacity[0];
        if( i != null ){
            if( this.options.lineColor[i]   ) c = this.options.lineColor[i];
            if( this.options.lineWeight[i]  ) w = this.options.lineWeight[i];
            if( this.options.lineOpacity[i] ) o = this.options.lineOpacity[i];
        }
        return new GPolyline(glatlngs,c,w,o);
    },
    clear: function (){
        this.removeOverlayField();
        this.removeOverlayAxis();
        this.removeOverlayGraph();
    },
    overlay: function (){
        this.addOverlayField();
        this.addOverlayAxis();
        this.addOverlayGraph();
    },
    addOverlayGraph: function (){
        for( var i=0; i < this.graph.length; ++i ){
            if( this.graph[i] instanceof GOverlay ) this.map.addOverlay( this.graph[i] );
        }
    },
    addOverlayAxis: function (){
        if( this.x_axis instanceof GOverlay ) this.map.addOverlay( this.x_axis );
        if( this.y_axis instanceof GOverlay ) this.map.addOverlay( this.y_axis );
    },
    addOverlayField: function (){
        if( this.field instanceof GOverlay ) this.map.addOverlay( this.field );
    },
    removeOverlayGraph: function (){
        for( var i = 0; i < this.graph.length; ++i ){
            if( this.graph[i] instanceof GOverlay ) this.map.removeOverlay( this.graph[i] );
        }
    },
    removeOverlayAxis: function (){
        if( this.x_axis instanceof GOverlay ) this.map.removeOverlay( this.x_axis );
        if( this.y_axis instanceof GOverlay ) this.map.removeOverlay( this.y_axis );
    },
    removeOverlayField: function (){
        if( this.field instanceof GOverlay ) this.map.removeOverlay( this.field );
    },
    setCenter: function (){
        this.map.setCenter( this.glatlngbounds.getCenter(), this.map.getBoundsZoomLevel(this.glatlngbounds) );
    },
    getVertex: function (i,j){
        return this.graph[i].getVertex(j);
    },

    // TODO now axises are coincidence in fit to rectangule of chart
    getMinLon: function (){
        return this.x_axis.getVertex(0).lng();
    },
    getMaxLon: function (){
        return this.x_axis.getVertex(1).lng();
    },
    getMinLat: function (){
        return this.y_axis.getVertex(0).lat();
    },
    getMaxLat: function (){
        return this.y_axis.getVertex(1).lat();
    }
}
