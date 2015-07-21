function f() {

	window.__Injected = true;

	//function log() { console.log( arguments ); }
	//function error() { console.error( arguments ); }
	function log() {}
	function error() {}

	function log( msg ) { logMsg( 'LOG: ' + msg )}
	function error( msg ) { logMsg( 'ERROR: ' + msg )}

	function logMsg() { 

		var args = [];
		for( var j = 0; j < arguments.length; j++ ) {
			args.push( arguments[ j ] );
		}

		window.postMessage( { source: 'ThreejsEditor', method: 'log', arguments: args }, '*');
	}

/*	var methods = [
		'createProgram', 'linkProgram', 'useProgram',
		'createShader', 'shaderSource', 'compileShader', 'attachShader', 'detachShader',
		'getUniformLocation',
		'getAttribLocation', 'vertexAttribPointer', 'enableVertexAttribArray', 'bindAttribLocation',
		'bindBuffer'
	];

	this.references = {};
	methods.forEach( function( f ) {
		this.references[ f ] = WebGLRenderingContext.prototype[ f ];
	}.bind ( this ) );*/

	function _h( f, c ) {

		return function() {
			var res = f.apply( this, arguments );
			res = c.apply( this, [ res, arguments ] ) || res;
			return res;
		}

	}

	function _h2( f, c ) {

		return function() {
			return c.apply( this, arguments );
		}

	}

	var generateUUID = ( function() {

		// http://www.broofa.com/Tools/Math.uuid.htm

		var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split( '' );
		var uuid = new Array( 36 );
		var rnd = 0, r;

		return function () {

			for ( var i = 0; i < 36; i ++ ) {

				if ( i == 8 || i == 13 || i == 18 || i == 23 ) {

					uuid[ i ] = '-';

				} else if ( i == 14 ) {

					uuid[ i ] = '4';

				} else {

					if ( rnd <= 0x02 ) rnd = 0x2000000 + ( Math.random() * 0x1000000 ) | 0;
					r = rnd & 0xf;
					rnd = rnd >> 4;
					uuid[ i ] = chars[ ( i == 19 ) ? ( r & 0x3 ) | 0x8 : r ];

				}
			}

			return uuid.join( '' );

		};

	} )();

	function sniffType( object ) {

		for( var j in types ) {
			if( object instanceof THREE[ types[ j ] ] ) {
				return types[ j ];
			}
		}

		debugger; // dafuc?

	}

	var objects = {};
	var types = [];

	function checkThreeJs() {

		if( window.THREE && window.THREE.REVISION ) {
			instrument();
		} else {
			setTimeout( checkThreeJs, 10 );
		}
	}

	checkThreeJs();

	function processAddObject( object, parent ) {

		if( !object.uuid ) object.uuid = generateUUID();
		addObject( object, parent );

		object.children.forEach( function( child ) {
			if( child instanceof THREE.Object3D ) {
				processAddObject( child, object  );
			}
		} );

	}

	function processRemoveObject( object, parent ) {

		removeObject( object, parent );

		object.children.forEach( function( child ) {
			if( child instanceof THREE.Object3D ) {
				processRemoveObject( child, object  );
			}
		} );

	}

	function instrumentRendererRender( renderer ) {

		var oldRender = renderer.render;
		renderer.render = function() {
			oldRender.apply( renderer, arguments );
			var scene = arguments[ 0 ];
			var camera = arguments[ 1 ];
			window.postMessage( { source: 'ThreejsEditor', method: 'render', sceneId: scene.uuid, cameraId: camera.uuid }, '*');
		}

	}

	function instrumentLate() {

		for( var j in window ) { 
			if( window[ j ] instanceof THREE.WebGLRenderer ) {
				logMsg( '++ Existing WebGLRenderer' );
				var object = window[ j ];
				instrumentRendererRender( object );			
			}
			if( window[ j ] instanceof THREE.Object3D ) {
				logMsg( '++ Existing Object3D' );
				var object = window[ j ];
				
				processAddObject( object );
			}
		}
	
	}

	function addObject( object, parent ) {

		var type = sniffType( object );
		objects[ object.uuid ] = object;
		
		if( parent && ( type === 'PerspectiveCamera' || type === 'OrthographicCamera' ) ) {
			if( sniffType( parent ) === 'Scene' ) {
				return;
			}
		}

		//logMsg( '++ Adding Object ' + type + ' (' + object.uuid + ') (parent ' + ( parent?parent.uuid:'' ) + ')' );
		window.postMessage( { source: 'ThreejsEditor', method: 'addObject', id: object.uuid, parentId: parent?parent.uuid:null, type: type, label: type }, '*');						

	}

	function removeObject( object, parent ) {

		//objects[ object.uuid ] = object;

		var type = sniffType( object );
		//logMsg( '++ Removing Object ' + type + ' (' + object.uuid + ') (parent ' + ( parent?parent.uuid:'' ) + ')' );
		window.postMessage( { source: 'ThreejsEditor', method: 'removeObject', id: object.uuid, parentId: parent?parent.uuid:null }, '*');						

	}

	function extractTypes() {

		for( var j in THREE ) {
			if( typeof THREE[ j ] === 'function' ) {
				types.unshift( j );
			}
		}

	}

	function instrument() {

		extractTypes();
		logMsg( 'INSTRUMENT LATE' )
		instrumentLate();
		logMsg( 'DONE' );

		THREE.WebGLRenderer = _h( THREE.WebGLRenderer, function() {
			logMsg( '++ NEW WebGLRenderer' );
			instrumentRendererRender( this );
		} );
		
		var oldObject3D = THREE.Object3D;
		THREE.Object3D = _h( THREE.Object3D, function() {
			logMsg( '++ NEW Object3D' );
			var object = this;
			if( !object.uuid ) object.uuid = generateUUID();
			addObject( object );
		} );
		THREE.Object3D.prototype = oldObject3D.prototype;
		for( var j in oldObject3D ) { 
			if( oldObject3D.hasOwnProperty( j ) ) {
				THREE.Object3D[ j ] = oldObject3D[ j ];
			} 
		}

		THREE.Object3D.prototype.add = _h( THREE.Object3D.prototype.add, function() {
			
			var parent = this;
			if( !parent.uuid ) parent.uuid = generateUUID();
			for( var j = 0; j < arguments[ 1 ].length; j++ ) {
				logMsg( '++ Object3D.add' );
				var object = arguments[ 1 ][ j ];
				if( !object.uuid ) object.uuid = generateUUID();
				processAddObject( object, parent );
			}

		} );

		THREE.Object3D.prototype.remove = _h( THREE.Object3D.prototype.remove, function() {
			
			var parent = this;
			for( var j = 0; j < arguments[ 1 ].length; j++ ) {
				logMsg( '++ Object3D.remove' );
				var object = arguments[ 1 ][ j ];
				processRemoveObject( object, parent );
			}

		} );

		THREE.WebGLRenderer.prototype.render = _h( THREE.WebGLRenderer.prototype.render, function() {

			processAddObject( object, parent );			

		} );

	}

	/*
	Object3D: uuid, name, parent, position, rotation, scale, visible, data
	Mesh: uuid, name, parent, position, rotation, scale, visible, data, geometry, material

	PointLight: uuid, name, parent, position, intensity, color, distance, decay, visible, data
	SpotLight: uuid, name, parent, position, intensity, color, distance, angle, exponent, decay, visible, data
	DirectionalLight: uuid, name, parent, position, intensity, color, visible, data
	HemisphereLight: uuid, name, parent, position, intensity, color, ground color, visible, data
	AmbientLight: uuid, name, parent, position, color, visible, data
	PerspectiveCamera: uuid, name, parent, position, rotation, scale, fov, near, far, visible, data
	*/

	var fields = {
		'uuid': { type: 'ti' },
		'name': { type: 'ti' },
		'position': { type: 'v3' },
		'rotation': { type: 'v3' },
		'scale': { type: 'v3' },
		'visible': { type: 'b' },
		'userData': { type: 'tj' },
		'intensity': { type: 'f' },
		'color': { type: 'c' },
		'groundColor': { type: 'c' },
		'distance': { type: 'f' },
		'angle': { type: 'f' },
		'decay': { type: 'f' },
		'exponent': { type: 'f' },
		'fov': { type: 'f' },
		'near': { type: 'f' },
		'far': { type: 'f' },
		'left': { type: 'f' },
		'right': { type: 'f' },
		'top': { type: 'f' },
		'bottom': { type: 'f' },
		'aspect': { type: 'f' },
		'castShadow': { type: 'b' },
		'receiveShadow': { type: 'b' }
	}

	var categories = {
		'object3d': [ 'uuid', 'name', 'visible', 'position', 'rotation', 'scale', 'userData', 'castShadow', 'receiveShadow' ],
		'light': [ 'intensity', 'color', 'groundColor', 'distance', 'angle', 'decay', 'exponent' ],
		'camera': [ 'fov', 'near', 'far', 'left', 'right', 'top', 'bottom', 'aspect' ]
	}

	var properties = {
		'Object3D': [ 'uuid', 'name', 'position', 'visible', 'userData', 'castShadow', 'receiveShadow' ],
		'Mesh': [ 'rotation', 'scale' ],
		'PointCloud': [ 'rotation', 'scale' ],
		'PointLight': [ 'intensity', 'color', 'distance', 'decay' ],
		'SpotLight': [ 'intensity', 'color' ],
		'HemisphereLight': [ 'intensity', 'color', 'groundColor' ],
		'DirectionalLight': [ 'intensity', 'color' ],
		'AmbientLight': [ 'color' ],
		'PerspectiveCamera': [ 'rotation', 'scale', 'fov', 'near', 'far', 'aspect' ],
		'OrthographicCamera': [ 'left', 'right', 'top', 'bottom', 'near', 'far' ]
	}

	window.UISelect = function( id ) {

		var o = objects[ id ];
		var data = {
			id: o.id,
		};

		var p = [];
		for( var j in properties ) {
			if( o instanceof THREE[ j ] ) {
				logMsg( j );
				for( var i in properties[ j ] ) {
					var property = properties[ j ][ i ];
					var type = fields[ property ].type;
					logMsg( property, type );
					switch( type ) {
						case 'f':
						case 't':
						case 'ti':
						case 'b':
						data[ property ] = o[ property ];
						break;
						case 'tj': 
						data[ property ] = JSON.stringify( o[ property ] );
						break;
						case 'v3':
						data[ property ] = { 
							x: o[ property ].x,
							y: o[ property ].y,
							z: o[ property ].z,
						};						
						break;
						case 'c':
						data[ property ] = o[ property ].getHexString();					
						break;
					}
					//data[ property ][ 'instance' ] = j;
				}
			}
		}

		logMsg( JSON.stringify( data ) );

		window.postMessage( { source: 'ThreejsEditor', method: 'objectSelected', id: id, data: JSON.stringify( data ) }, '*');

	}

	window.ChangeProperty = function( id, data ) {

		logMsg( JSON.stringify( data ) );

		var o = objects[ id ];
		var dataFields = data.property.split( '-' );
		var v = o;
		for( var j = 1; j < dataFields.length; j++ ) {
			if( j === dataFields.length - 1 ) {
				var f = fields[ dataFields[ j ] ];
				if( f && f.type === 'c' ) {
					v[ dataFields[ j ] ].set( data.value );
				} else {
					if( f && f.type === 'tj' ) {
						v[ dataFields[ j ] ] = JSON.parse( data.value );
					} else {
						v[ dataFields[ j ] ] = data.value;						
					}
				}
			} else {
				v = v[ dataFields[ j ] ];
			}
		}

		if( dataFields[ 0 ] === 'camera' ) {
			o.updateProjectionMatrix();
			if( o instanceof THREE.PerspectiveCamera ) {
			}
			if( o instanceof THREE.OrthographicCamera ) {
			}
		}

	}

	window.addEventListener( 'load', function() {
		window.postMessage( { source: 'ThreejsEditor', method: 'init' }, '*');
		window.postMessage( { source: 'ThreejsEditor', method: 'activateFields', fields: JSON.stringify( fields ), categories: JSON.stringify( categories ) }, '*');
	} );

}

var links = document.querySelectorAll( 'a[rel=external]' );
for( var j = 0; j < links.length; j++ ) {
	var a = links[ j ];
	a.addEventListener( 'click', function( e ) {
		window.open( this.href, '_blank' );
		e.preventDefault();
	}, false );
}

var button = document.getElementById( 'reload' ),
	container = document.getElementById( 'container' ),
	info = document.getElementById( 'info' ),
	waiting = document.getElementById( 'waiting' ),
	log = document.getElementById( 'log' ),
	ul = document.querySelector( '#container ul' ),
	treeViewContainer = document.getElementById( 'treeView' );

var verbose = !true;
if( verbose ) {
	log.style.left = '50%';
	log.style.display = 'block';
	container.style.right= '50%';
	log.addEventListener( 'click', function() {
		this.textContent = '';
	} );
}

function logMsg() {

	var args = [];
	for( var j = 0; j < arguments.length; j++ ) {
		args.push( arguments[ j ] );
	}
	var p = document.createElement( 'p' );
	p.textContent = args.join( ' ' );
	log.appendChild( p );

}

logMsg( 'starting' );

button.addEventListener( 'click', function( e ) {
	chrome.devtools.inspectedWindow.reload( {
		ignoreCache: false
	} );
} );

var backgroundPageConnection = chrome.runtime.connect({
	name: 'panel'
});

backgroundPageConnection.postMessage({
	name: 'init',
	tabId: chrome.devtools.inspectedWindow.tabId
});

var settings = {
}

/*var stored = chrome.storage.sync.get( 'highlight', function( i ) {

	logMsg( 'retrieved' );
	logMsg( i );
	settings.highlight = i;
	document.getElementById( 'highlightButton' ).style.opacity = settings.highlight ? 1 : .5;

} );*/

var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function encodeSource(input) {
	var str = String(input);
	for (
		var block, charCode, idx = 0, map = chars, output = '';
		str.charAt(idx | 0) || (map = '=', idx % 1);
		output += map.charAt(63 & block >> 8 - idx % 1 * 8)
		) {
			charCode = str.charCodeAt(idx += 3/4);
		if (charCode > 0xFF) {
			throw new InvalidCharacterError("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
		}
		block = block << 8 | charCode;
	}
	return output;
}

function tearDown() {

	log.textContent = '';
	logMsg( '>> tear down' );
	
	while( treeViewContainer.firstChild ) treeViewContainer.removeChild( treeViewContainer.firstChild );
	objects = {};
	scenes = {};

	treeView = new TreeView( treeViewContainer );
	treeView.onSelect = function( id ) {
		logMsg( 'SELECTED ' + id );
		chrome.devtools.inspectedWindow.eval( 'UISelect( \'' + id + '\' )' );
	}
	r = new TreeViewItem( 'Renderer', null );
	treeView.getRoot().appendChild( r );

	for( var i in categories ){
		var el = document.getElementById( i + '-panel' );
		el.style.display = 'none';
	}

}

var objects = {};
var scenes = {};
var treeView = null;
var r = null;
var currentObject = null;

var panel = {};
var fields = {};
var categories = {};

function hashCode(str) { // java String#hashCode
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
       hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
} 

function intToRGB(i){
    var c = (i & 0x00FFFFFF)
        .toString(16)
        .toUpperCase();

    return "00000".substring(0, 6 - c.length) + c;
}

function parseFields( ) {

	 var category = null;

	for( var j in fields ) {
		var t = fields[ j ].type;
		for( var i in categories ) {
			var c = i;
			for( var k in categories[ i ] ) {
				if( categories[ i ][ k ] === j ) {
					category = c;
				}
			}
		}

		var id = category + '-' + j;
		logMsg( j, t, category, id );

		switch( t ) {
			case 't':
			case 'ti':
			case 'f':
			panel[ j ] = document.getElementById( id );
			( function( id ) { panel[ j ].addEventListener( 'change', function( e ) {
				chrome.devtools.inspectedWindow.eval( 'ChangeProperty( \'' + currentObject.id + '\', { property: \'' + id + '\', value: ' + this.value + ' } )' );
			} ) } )( id );
			break;
			case 'tj':
			panel[ j ] = document.getElementById( id );
			( function( id ) { panel[ j ].addEventListener( 'change', function( e ) {
				chrome.devtools.inspectedWindow.eval( 'ChangeProperty( \'' + currentObject.id + '\', { property: \'' + id + '\', value: \'' + this.value + '\' } )' );
			} ) } )( id );
			break;
			case 'c':
			panel[ j ] = document.getElementById( id );
			( function( id ) { panel[ j ].addEventListener( 'change', function( e ) {
				var c = this.value.toString();
				chrome.devtools.inspectedWindow.eval( 'ChangeProperty( \'' + currentObject.id + '\', { property: \'' + id + '\', value: \'' + c + '\' } )' );
			} ) } )( id );
			break;
			case 'b':
			panel[ j ] = document.getElementById( id );
			( function( id ) { panel[ j ].addEventListener( 'change', function( e ) {
				chrome.devtools.inspectedWindow.eval( 'ChangeProperty( \'' + currentObject.id + '\', { property: \'' + id + '\', value: ' + this.checked + ' } )' );
			} ) } )( id );
			break;
			case 'v3':
			panel[ j + 'x' ] = document.getElementById( id + '-x' );
			panel[ j + 'y' ] = document.getElementById( id + '-y' );
			panel[ j + 'z' ] = document.getElementById( id + '-z' );
			( function( id ) { panel[ j + 'x' ].addEventListener( 'change', function( e ) {
				chrome.devtools.inspectedWindow.eval( 'ChangeProperty( \'' + currentObject.id + '\', { property: \'' + id + '-x\', value: ' + this.value + ' } )' );
			} ) } )( id );
			( function( id ) { panel[ j + 'y' ].addEventListener( 'change', function( e ) {
				chrome.devtools.inspectedWindow.eval( 'ChangeProperty( \'' + currentObject.id + '\', { property: \'' + id + '-y\', value: ' + this.value + ' } )' );
			} ) } )( id );
			( function( id ) { panel[ j + 'z' ].addEventListener( 'change', function( e ) {
				chrome.devtools.inspectedWindow.eval( 'ChangeProperty( \'' + currentObject.id + '\', { property: \'' + id + '-z\', value: ' + this.value + ' } )' );
			} ) } )( id );
			break;
		}

	}

	logMsg( 'PANEL', JSON.stringify( panel ) );

}

backgroundPageConnection.onMessage.addListener( function( msg ) {

	switch( msg.method ) {
		case 'activateFields': 
			fields = JSON.parse( msg.fields );
			categories = JSON.parse( msg.categories );
			parseFields();
			break;
		case 'inject':
			logMsg( '>> inject' );
			tearDown();
			logMsg( chrome.devtools.inspectedWindow.eval( '(' + f.toString() + ')()' ) ); 
			break;
		case 'init':
			logMsg( '>> init' );
			info.style.display = 'none';
			waiting.style.display = 'none';
			container.style.display = 'block';
			break;
		case 'addObject':
			//logMsg( '>> ADD OBJECT', JSON.stringify( msg ) );
			logMsg( '>> ADD OBJECT', msg.type, msg.id, msg.parentId );

			//logMsg( ' -- OBJECTS RIGHT NOW: ', JSON.stringify( objects ) );
			if( objects[ msg.id ] === undefined ) {
				
				var n = new TreeViewItem( msg.label, msg.id );
				data = {
					type: msg.type,
					node: n
				}
			
				objects[ msg.id ] = {
					id: msg.id,
					parent: msg.parentId,
					data: data
				}
				//logMsg( '>> ADDED' );
			} 

			if( msg.parentId ) {
				objects[ msg.id ].data.parent = msg.parentId;
			}
		
			if( msg.parentId ) {
				//logMsg( '>> CONNECT #', objects[ msg.parentId ], '#', objects[ msg.id ], '#' );
				if( objects[ msg.id ].data.node.parentNode ) objects[ msg.id ].data.node.parentNode.removeChild( objects[ msg.id ].data.node );
				objects[ msg.parentId ].data.node.appendChild( objects[ msg.id ].data.node );
				objects[ msg.id ].parent = msg.parentId;
			} else {
				if( !objects[ msg.id ].data.node.parentNode ) r.appendChild( objects[ msg.id ].data.node );
			}
			//logMsg( '>> DONE' );
			break;
		case 'removeObject':
			logMsg( '>> REMOVE OBJECT', msg.id );
			//logMsg( ' -- OBJECTS RIGHT NOW: ', JSON.stringify( objects ) );
			if( objects[ msg.id ] !== undefined ) {
				if( objects[ msg.id ].data.node.parentNode ) objects[ msg.id ].data.node.parentNode.removeChild( objects[ msg.id ].data.node );
				objects[ msg.id ] = undefined;
				//logMsg( '>> REMOVED' );
			} else {
				//logMsg( '  -- CACHED' );
			}
			/*if( msg.parentId ) {
				logMsg( '>> CONNECT #', objects[ msg.parentId ], '#', objects[ msg.id ], '#' );
				g.setEdge( msg.parentId, msg.id, { lineInterpolate: 'basis', arrowhead: 'normal' } );
				objects[ msg.id ].parent = parentId;
			}*/
			logMsg( '>> DONE' );
			break;
		case 'objectSelected' :
			logMsg( '>>> OBJECT SELECTED' );
			currentObject = objects[ msg.id ];
			var data = JSON.parse( msg.data );
			for( var j in panel ) {
				panel[ j ].parentElement.parentElement.style.display = 'none';
			}
			for( var i in categories ){
				var el = document.getElementById( i + '-panel' );
				el.style.display = 'none';
				logMsg( 'HIDE ' + i );
			}

			for( var j in data ) {
				if( fields[ j ] != undefined ) {
					var type = fields[ j ].type;
					logMsg( j, panel[ j ], type );
					switch( type ) {
						case 't':
						case 'ti':
						case 'tj':
						case 'f':
							panel[ j ].value = data[ j ];
							panel[ j ].parentElement.parentElement.style.display = 'block';
						break;
						case 'b':
							panel[ j ].checked = data[ j ] === true;
							panel[ j ].parentElement.parentElement.style.display = 'block';
						break;
						case 'c':
							panel[ j ].value = '#' + data[ j ];
							panel[ j ].parentElement.parentElement.style.display = 'block';
							break;
						case 'v3':
							panel[ j + 'x' ].value = data[ j ].x;
							panel[ j + 'y' ].value = data[ j ].y;
							panel[ j + 'z' ].value = data[ j ].z;
							panel[ j + 'x' ].parentElement.parentElement.style.display = 'block';
							panel[ j + 'y' ].parentElement.parentElement.style.display = 'block';
							panel[ j + 'z' ].parentElement.parentElement.style.display = 'block';
						break;
					}
				}

				for( var i in categories ){
					for (var k in categories[ i ] ) {
						if( categories[ i ][ k ] === j ) {
							var el = document.getElementById( i + '-panel' );
							el.style.display = 'block';
							logMsg( 'SHOW ' + i );
						}
					}
				}
			}

			break;
		case 'render':
			/*g.setEdge( msg.cameraId, msg.sceneId, { 
				lineInterpolate: 'basis', 
				arrowhead: 'normal', 
				style: "stroke-dasharray: 5, 5;",
			} );*/
			break;
		case 'log':
			logMsg( msg.arguments );
			break;
	}

} );
