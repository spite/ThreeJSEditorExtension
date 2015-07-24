function TreeViewItem( label, id ) {

	this.label = label || '';
	this.children = [];
	this.collapsed = false;
	this.id = id || null;

	this.li = document.createElement( 'li' );
	var p = document.createElement( 'p' );
	p.textContent = this.label;
	this.span = document.createElement( 'span' );
	this.span.className = 'icon item';
	this.li.appendChild( this.span );
	this.li.appendChild( p );

	this.ul = null;
	this.parent = null;
	this.parentNode = null;

	var li = this.li;

	p.addEventListener( 'click', function( e ) {

		this.parent.clear();
		p.classList.add( 'active' );

		this.parent.onSelect( this.id );

		e.preventDefault();

	}.bind( this ) );

	this.span.addEventListener( 'click', function( e ) {

		if( this.children.length ) {
			li.classList.toggle( 'collapsed' );
		}

		e.preventDefault();

	}.bind( this ) );

}

TreeViewItem.prototype.createRootNode = function() {

	this.ul = document.createElement( 'ul' );

}

TreeViewItem.prototype.render = function() {


}

TreeViewItem.prototype.setVisible = function( boolean ) {

	this.li.classList.toggle( 'visible', boolean );
	return this;

}

TreeViewItem.prototype.appendChild = function( child ) {

	child.parent = this.parent;
	child.parentNode = this;

	if( this.ul === null ) {
		this.ul = document.createElement( 'ul' );
		this.li.appendChild( this.ul );
	}

	this.children.push( child );
	this.ul.appendChild( child.li );

	this.span.className = 'icon button';

}

TreeViewItem.prototype.removeChild = function( child ) {

	child.parent = null;
	child.parentNode = null;

	if( this.ul === null ) {
		this.li.removeChild( this.ul );
	}

	for( var j = 0; j < this.children.length; j++ ) {
		if( this.children[ j ] === child ) {
			this.children.splice( j, 1 );
			break;
		}
	}
	this.ul.removeChild( child.li );

	if( this.children.length ) {
		this.span.className = 'icon item';
	}

}

function TreeView( base ) {

	this.base = base;
	this.root = new TreeViewItem( 'WebGLRenderer');
	this.root.createRootNode();
	this.root.ul.classList.add( 'treeView' );
	this.root.parent = this;
	this.base.appendChild( this.root.ul );

}

TreeView.prototype.clear = function() {

	var sel = this.root.ul.querySelector( '.active' );
	if( sel ) sel.classList.remove( 'active' );

}

TreeView.prototype.getRoot = function() {

	return this.root;

}

TreeView.prototype.render = function() {

}

TreeView.prototype.onSelect = function() {

}
