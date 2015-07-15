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

	window.UISelect = function( id ) {

		var o = objects[ id ];

		var data = {
			id: o.id,
			visible: o.visible,
			position: { x: o.position.x, y: o.position.y, z: o.position.z },
			rotation: { x: o.rotation.x, y: o.rotation.y, z: o.rotation.z },
			scale: { x: o.scale.x, y: o.scale.y, z: o.scale.z }
		}

		window.postMessage( { source: 'ThreejsEditor', method: 'objectSelected', id: id, data: JSON.stringify( data ) }, '*');

	}

	window.ChangeProperty = function( id, data ) {

		var o = objects[ id ];
		var fields = data.property.split( '.' );
		var v = o;
		for( var j = 0; j < fields.length; j++ ) {
			if( j === fields.length - 1 ) {
				v[ fields[ j ] ] = data.value;
			} else {
				v = v[ fields[ j ] ];
			}
		}

	}

	window.addEventListener( 'load', function() {
		window.postMessage( { source: 'ThreejsEditor', method: 'init' }, '*');
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

var verbose = false;
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

}

var objects = {};
var scenes = {};
var treeView = null;
var r = null;
var currentObject = null;

var panel = {
	visible: document.getElementById( 'object3dVisible' ),
	positionX: document.getElementById( 'object3dPositionX' ),
	positionY: document.getElementById( 'object3dPositionY' ),
	positionZ: document.getElementById( 'object3dPositionZ' ),
	rotationX: document.getElementById( 'object3dRotationX' ),
	rotationY: document.getElementById( 'object3dRotationY' ),
	rotationZ: document.getElementById( 'object3dRotationZ' ),
	scaleX: document.getElementById( 'object3dScaleX' ),
	scaleY: document.getElementById( 'object3dScaleY' ),
	scaleZ: document.getElementById( 'object3dScaleZ' ),
};

panel.positionX.setAttribute( 'step', .1 );
panel.positionY.setAttribute( 'step', .1 );
panel.positionZ.setAttribute( 'step', .1 );

panel.visible.addEventListener( 'change', function( e ) {
	chrome.devtools.inspectedWindow.eval( 'ChangeProperty( \'' + currentObject.id + '\', { property: \'visible\', value: ' + this.checked + ' } )' );
} );

panel.positionX.addEventListener( 'change', function( e ) {
	chrome.devtools.inspectedWindow.eval( 'ChangeProperty( \'' + currentObject.id + '\', { property: \'position.x\', value: ' + this.value + ' } )' );
} );

panel.positionY.addEventListener( 'change', function( e ) {
	chrome.devtools.inspectedWindow.eval( 'ChangeProperty( \'' + currentObject.id + '\', { property: \'position.y\', value: ' + this.value + ' } )' );
} );

panel.positionZ.addEventListener( 'change', function( e ) {
	chrome.devtools.inspectedWindow.eval( 'ChangeProperty( \'' + currentObject.id + '\', { property: \'position.z\', value: ' + this.value + ' } )' );
} );

panel.rotationX.addEventListener( 'change', function( e ) {
	chrome.devtools.inspectedWindow.eval( 'ChangeProperty( \'' + currentObject.id + '\', { property: \'rotation.x\', value: ' + this.value + ' } )' );
} );

panel.rotationY.addEventListener( 'change', function( e ) {
	chrome.devtools.inspectedWindow.eval( 'ChangeProperty( \'' + currentObject.id + '\', { property: \'rotation.y\', value: ' + this.value + ' } )' );
} );

panel.rotationZ.addEventListener( 'change', function( e ) {
	chrome.devtools.inspectedWindow.eval( 'ChangeProperty( \'' + currentObject.id + '\', { property: \'rotation.z\', value: ' + this.value + ' } )' );
} );

panel.scaleX.addEventListener( 'change', function( e ) {
	chrome.devtools.inspectedWindow.eval( 'ChangeProperty( \'' + currentObject.id + '\', { property: \'scale.x\', value: ' + this.value + ' } )' );
} );

panel.scaleY.addEventListener( 'change', function( e ) {
	chrome.devtools.inspectedWindow.eval( 'ChangeProperty( \'' + currentObject.id + '\', { property: \'scale.y\', value: ' + this.value + ' } )' );
} );

panel.scaleZ.addEventListener( 'change', function( e ) {
	chrome.devtools.inspectedWindow.eval( 'ChangeProperty( \'' + currentObject.id + '\', { property: \'scale.z\', value: ' + this.value + ' } )' );
} );

backgroundPageConnection.onMessage.addListener( function( msg ) {

	switch( msg.method ) {
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
				objects[ msg.id ].parent = parentId;
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
			logMsg( msg.data );
			currentObject = objects[ msg.id ];
			var data = JSON.parse( msg.data );
			panel.visible.checked = data.visible;
			panel.positionX.value = data.position.x;
			panel.positionY.value = data.position.y;
			panel.positionZ.value = data.position.z;
			panel.rotationX.value = data.rotation.x;
			panel.rotationY.value = data.rotation.y;
			panel.rotationZ.value = data.rotation.z;
			panel.scaleX.value = data.scale.x;
			panel.scaleY.value = data.scale.y;
			panel.scaleZ.value = data.scale.z;
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
