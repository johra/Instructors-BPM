// Install load and unload handlers.
window.addEventListener("load", function(e) { window.Sidebar.onLoad(e); }, false);
window.addEventListener("unload", function(e) { window.Sidebar.onUnload(e); }, false);


// Shorthand
if (typeof(Cc) == "undefined")
  var Cc = Components.classes;
if (typeof(Ci) == "undefined")
  var Ci = Components.interfaces;
if (typeof(Cu) == "undefined")
  var Cu = Components.utils;
if (typeof(Cr) == "undefined")
  var Cr = Components.results;

var gPrefs = Cc["@mozilla.org/preferences-service;1"]
   	.getService(Ci.nsIPrefBranch);
var gMM = Components.classes["@songbirdnest.com/Songbird/Mediacore/Manager;1"]  
                    .getService(Components.interfaces.sbIMediacoreManager);
           
// Start and close functions
window.Sidebar = { 

  // The sb-playlist XBL binding
  _playlist: null, 
  
  _mediaList: null, 
  
  _myView: null, 
  	
  onLoad:  function(e) {
		
  	//Add track change listener	
  	gMM.addListener(this);	
  	    	
	// Find playlist
	this._mediaList = this.getPlaylist();

    	// Create view                
	this._myView = this._mediaList.createView();
    	
    	// Bind to XUL object
    	this._playlist = document.getElementById("instructors-playlist");
    	this._playlist.bind(this._myView, null);
	
  },
  onUnload: function(e) { 
  	gMM.removeListener(this);
  },
  getPlaylist: function(e) {   	
           
  	// Find playlist
	var guid = gPrefs.getCharPref("instructors-musicinfo.guid");
	var library = LibraryUtils.mainLibrary;
	try {
		var item = library.getMediaItem(guid);
		var list = item.QueryInterface(Ci.sbIMediaList);
		
		return list;		
		
	} catch (e) {
		// Nothing	
	}
  },
  onMediacoreEvent: function(e){
	switch (e.type){
		case Ci.sbIMediacoreEvent.TRACK_CHANGE:
			
			// Highlight what is currently playing
			var mediaItem = gMM.sequencer.currentItem;
			var index = this._myView.getIndexForItem(mediaItem);			
			this.highlightItem(index);
			
			// Return
			break;
	}	
   },
    
  
  /** 
   * Show/highlight the MediaItem at the given MediaListView index.
   * Called by the Find Current Track button.
   */
  highlightItem: function(aIndex) {
    this._playlist.highlightItem(aIndex);
  },
    
  
  /** 
   * Called when something is dragged over the tabbrowser tab for this window
   */
  canDrop: function(aEvent, aSession) {
    return this._playlist.canDrop(aEvent, aSession);
  },
    
  
  /** 
   * Called when something is dropped on the tabbrowser tab for this window
   */
  onDrop: function(aEvent, aSession) {
    return this._playlist.
        _dropOnTree(this._playlist.mediaListView.length,
                Ci.sbIMediaListViewTreeViewObserver.DROP_AFTER);
  }
}