// Install load and unload handlers.
window.addEventListener("load", function(e) { window.metaData.onLoad(e); }, false);
window.addEventListener("unload", function(e) { window.metaData.onUnload(e); }, false);

// Getting the Media Core Manager
var gMM = Components.classes["@songbirdnest.com/Songbird/Mediacore/Manager;1"]  
                    .getService(Components.interfaces.sbIMediacoreManager);  

if (typeof(SBProperties) == "undefined")
{
	Components.utils.import("resource://app/jsmodules/sbProperties.jsm");
	if (!SBProperties)
	throw new Error("Import of sbProperties module failed");
}
  
// Meta data manager
var mediaItemArray = Components.classes["@songbirdnest.com/moz/xpcom/threadsafe-array;1"].createInstance(Components.interfaces.nsIMutableArray);
var metaDataService = Components.classes["@songbirdnest.com/Songbird/FileMetadataService;1"].getService(Components.interfaces.sbIFileMetadataService); 

var openedMediaItem = null;
var writeProperties = [];

// Start and close functions
window.metaData = {   	
  onLoad: function(e) {	
  	
  	// Update fields
	this.updateWindow();
  },
  onUnload: function(e) { 	
  },
  	getPropertiesList: function(e) { 	
  	var list = document.getElementsByAttribute("property", "*");
  	return list;
  },
  updateWindow: function(e) {  	
	var mediaItem = gMM.sequencer.currentItem;
	openedMediaItem = mediaItem;
	
	var list = this.getPropertiesList();
	for (var i = 0; i < list.length; i++) {		
		var node = list[i];		
		var propertyId = node.getAttribute("property");
		var trackValue = mediaItem.getProperty(SBProperties[propertyId]);
		node.setAttribute("value", trackValue);
		
		// Active onchange command
		node.setAttribute("onchange", "window.metaData.saveChanges()");		
	}
	
	// Select first property
	list[0].select();
   },
   saveChanges: function(e) {
	var mediaItem = openedMediaItem;
	mediaItemArray.appendElement(mediaItem, false);
		
	var list = this.getPropertiesList();
	for (var i = 0; i < list.length; i++) {		
		var node = list[i];		
		var propertyId = node.getAttribute("property");
		var trackValue = mediaItem.getProperty(propertyId);
		var newValue = node.value;
		if(trackValue != newValue){			
			writeProperties.push(SBProperties[propertyId]);
          		mediaItem.setProperty(SBProperties[propertyId], newValue);
	   	}       
	}
		
	// Write changes to file	
	if(writeProperties.length){
		var propArray = ArrayConverter.stringEnumerator(writeProperties);
		var job = metaDataService.write(mediaItemArray, propArray);			
	}
		
	// Close window
	window.close();	
	songbird.next();
	songbird.previous();
   }
  
}







