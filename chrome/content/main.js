// Make a namespace.
if (typeof Instructors == 'undefined') {
  var Instructors = {};
}
if (typeof(gBrowser) == "undefined"){
    var gBrowser =  Cc["@mozilla.org/appshell/window-mediator;1"]  
            .getService(Ci.nsIWindowMediator)  
            .getMostRecentWindow("Songbird:Main").window.gBrowser;
}
/**
 * UI controller that is loaded into the main player window
 */
Instructors.Controller = {

  /**
   * Called when the window finishes loading
   */
  onLoad: function() {

 
    // Perform extra actions the first time the extension is run
    //if (Application.prefs.get("extensions.instructors.firstrun").value) {
    //  Application.prefs.setValue("extensions.instructors.firstrun", false);
      this._firstRunSetup();
    //}
            
    // Make a local variable for this controller so that
    // it is easy to access from closures.
    var controller = this;
    
    // Update title
    this.updateTitle();
  
    // Attach doHelloWorld to our helloworld command
    this._helloWorldCmd = document.getElementById("instructors-startup-cmd");
    this._helloWorldCmd.addEventListener("command", 
         function() { Instructors.Controller.doHelloWorld(false); }, false);

    this._helloWorldCmd = document.getElementById("instructors-startup-playlist-cmd");
    this._helloWorldCmd.addEventListener("command", 
         function() { Instructors.Controller.doHelloWorld(true); }, false);
  },
  

  /**
   * Called when the window is about to close
   */
  onUnLoad: function() {
	// Open servicepane	
	var splitter = document.getElementById("servicepane_splitter");  
	splitter.setAttribute("state", "open");      
	
	// Show navigation bar	
	var navbar = document.getElementById( "nav-bar" );		
	navbar.hidden = false;      
	
	// initialization code
	this._initialized = false; 
  },
  
 /**
   * Called when the window is about to close
   */
  selectedPlaylist: function( value ) { 	
  	
  	if(value){
		// Get selected playlist  	
	  	var currMediaList = gBrowser.currentMediaListView.mediaList;
	  	var guid = currMediaList.guid;
	  	
		// Save setting for using selected playlist	
		gPrefs.setCharPref("instructors-musicinfo.selectedplaylistguid", guid);
	}
	else{
		// Clear pref
		gPrefs.setCharPref("instructors-musicinfo.selectedplaylistguid", "");
	}
	
  },
  /**
   * Sample command action
   */
  doHelloWorld : function( value ) { 	
  	
	// Close any open tab
	this.closeAllTabs();
	
	// Load window
	var navbar = document.getElementById( "nav-bar" );
	var splitter = document.getElementById("servicepane_splitter");  
	if(! this._initialized){
		
		// Get selected playlist
	        this.selectedPlaylist(value);
	        
       		// Open page
		top.loadURI("chrome://instructors/content/musicinfo.xul");		
		
		// Close servicepane     
		splitter.setAttribute("state", "collapsed"); 
				
		// Hide navigation bar		
		navbar.hidden = true;
				
		// initialization code
		this._initialized = true;
	}
	else{		
		
		// Show library
		Components.utils.import("resource://app/jsmodules/sbLibraryUtils.jsm");  
		var myView = LibraryUtils.mainLibrary.createView();  		  
		gBrowser.loadMediaList(LibraryUtils.mainLibrary, null, null, myView,  
		    "chrome://songbird/content/mediapages/filtersPage.xul"); 
			
		// Open servicepane
		splitter.setAttribute("state", "open"); 		
		
		// Close any open tab
		this.closeAllTabs(); 		
		
		// Show navigation bar			
		navbar.hidden = false;
				
		// initialization code
		this._initialized = false;
	}
	
  },
  
  
  /**
   * Close any open tabs
   */
  closeAllTabs : function() {
	var num = gBrowser.browsers.length;
	for (var i = 0; i < num; i++) {
		var b = gBrowser.getBrowserAtIndex(i);
		try {
			gBrowser.removeTab(b);
		} catch(e) {
		}
	}
  },
  
  /**
   * Set title bar
   */
  updateTitle : function() {
	   
	var profileService = Components.classes["@mozilla.org/toolkit/profile-service;1"]
	                                     .getService(Components.interfaces.nsIToolkitProfileService);
	var title = profileService.selectedProfile.name;
	
	var titlebar=document.getElementsByTagName("sb-sys-titlebar")[0];
	titlebar.setAttribute("value", title);	       
  },

  
  /**
   * Perform extra setup the first time the extension is run
   */
  _firstRunSetup : function() {
  
    // Call this.doHelloWorld() after a 3 second timeout
    setTimeout(function(controller) { Instructors.Controller.doHelloWorld(); }, 3000, this); 
  
  }
  
};

window.addEventListener("load", function(e) { Instructors.Controller.onLoad(e); }, false);
window.addEventListener("unload", function(e) { Instructors.Controller.onUnLoad(e); }, false);