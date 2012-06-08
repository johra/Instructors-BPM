// Install load and unload handlers.
window.addEventListener("load", function(e) { window.musicInfo.onLoad(e); }, false);
window.addEventListener("unload", function(e) { window.musicInfo.onUnload(e); }, false);

// Shorthand
if (typeof(Cc) == "undefined")
  var Cc = Components.classes;
if (typeof(Ci) == "undefined")
  var Ci = Components.interfaces;
if (typeof(Cu) == "undefined")
  var Cu = Components.utils;
if (typeof(Cr) == "undefined")
  var Cr = Components.results;

// Getting the Media Core Manager
var gMM = Components.classes["@songbirdnest.com/Songbird/Mediacore/Manager;1"]  
                    .getService(Components.interfaces.sbIMediacoreManager);
var gPrefs = Cc["@mozilla.org/preferences-service;1"]
           .getService(Ci.nsIPrefBranch);
const SB_NewDataRemote = new Components.Constructor(  
   "@songbirdnest.com/Songbird/DataRemote;1", "sbIDataRemote", "init");  

// Timers and global variables    
var gEnableTimer = false;
var gClockTimer = null;
var gFadeTimer = null;
var gUpdateTimer = null;
var gFullscreenTimer = null;
var gUserVolume = null;
var gUpdatedUI = false;
var gMinRating = 0;

// Reset pref for using selected playlist
var gSelectedPlaylist = gPrefs.getCharPref("instructors-musicinfo.selectedplaylistguid");
gPrefs.setCharPref("instructors-musicinfo.selectedplaylistguid", "");

Cu.import("resource://app/jsmodules/sbLibraryUtils.jsm");  
Cu.import("resource://app/jsmodules/sbProperties.jsm");  
Cu.import("resource://app/jsmodules/ArrayConverter.jsm");    
		            
// Start and close functions
window.musicInfo = {   	
  onLoad: function(e) {  
  	setFocus();	
  	storeUserVolume();
  	startPlaybackCountDown();	
  	UR_Start();
  	loadPreferences();  	
  	updateNowListening();  	
	showFullscreen(false);
	gUpdatedUI = false;
	
  	//Add track change listener	
  	gMM.addListener(this);	
  	
	// initialization code
	this._initialized = true;
  },
  onUnload: function(e) {  	
  	gMM.removeListener(this);	
  	resetPlaybackCountDown();
  	savePreferences();  	
  	
	// initialization code
	this._initialized = false;
  }, 
  onMediacoreEvent: function(e){
	switch (e.type){
		case Ci.sbIMediacoreEvent.TRACK_CHANGE:
			
			// Check if UI is updated
			if(gUpdatedUI)				
				updatePlaylist();			
			else
				updateNowListening();
			
			// Reset timer
			resetPlaybackCountDown();   
			startPlaybackCountDown();
			
			// Restore volume
			restoreUserVolume();
			
			// UI is finished updating
			gUpdatedUI = false;
			
			// Return
			break;
		case Ci.sbIMediacoreEvent.STREAM_PAUSE:
			stopPlaybackCountDown();
			break;
		case Ci.sbIMediacoreEvent.STREAM_START:
			startPlaybackCountDown();
			break;
		case Ci.sbIMediacoreEvent.VOLUME_CHANGE:
			storeUserVolume();
			break;
	}	
   }

}

// -------------------------------------------------------------------------
// Preferences functions
// -------------------------------------------------------------------------
function loadPreferences(){
             
var genre = gPrefs.getCharPref("instructors-musicinfo.genre");
var bpm = gPrefs.getIntPref("instructors-musicinfo.bpm");
var maxtime = gPrefs.getIntPref("instructors-musicinfo.maxtime");
var timer = gPrefs.getIntPref("instructors-musicinfo.timer");
var minrating = gPrefs.getIntPref("instructors-musicinfo.minrating");

document.getElementById("instructors-musicinfo-genre").setAttribute("value", genre);
document.getElementById("instructors-musicinfo-bpm").setAttribute("value", bpm);
document.getElementById("instructors-musicinfo-maxtime").setAttribute("value", maxtime);
updateMinRating(minrating,true); // Use fullscreen so we dont reset value
updateMaxTimeAction(timer, false);
}
function savePreferences(){

var genre = document.getElementById("instructors-musicinfo-genre").getAttribute("value");
var bpm = document.getElementById("instructors-musicinfo-bpm").getAttribute("value");
var maxtime = document.getElementById("instructors-musicinfo-maxtime").getAttribute("value");
var timer = document.getElementById("instructors-musicinfo-timer-check").getAttribute("value");
var minrating = getMinRating();

gPrefs.setCharPref("instructors-musicinfo.genre", genre);
gPrefs.setIntPref("instructors-musicinfo.bpm", bpm);
gPrefs.setIntPref("instructors-musicinfo.maxtime", maxtime);
gPrefs.setIntPref("instructors-musicinfo.timer", timer);
gPrefs.setIntPref("instructors-musicinfo.minrating", minrating);	
}

// -------------------------------------------------------------------------
// Generic functions
// -------------------------------------------------------------------------
function disableHotkeys(value){

	// Loop all childs
	var childNodeArray = document.getElementById("instructors-musicinfo-keyset").childNodes;
	for (var j = 0; j < childNodeArray.length; j++) {
		var node = childNodeArray[j];
		node.setAttribute("disabled", value);
	}
		
			
}
function roundBpm(value) {
   var converted = parseFloat(value) / 10; // Make sure we have a number   
   var decimal = (converted - parseInt(converted, 10));
   decimal = Math.round(decimal * 10);
   if (decimal == 5) { return ((parseInt(converted, 10)+0.5) * 10); }
   if ( (decimal < 3) || (decimal > 7) ) {
      return (Math.round(converted) *10);
   } else {
      return ((parseInt(converted, 10)+0.5) * 10);
   }
}
function roundTime(value) {
   var converted = parseFloat(value) / 10;
   return (Math.round(converted) *10);
}  
function getAllGenres(){   
	var list = getLibrary(); 
	var returnList = new Array();
	var genres = list.getDistinctValuesForProperty(SBProperties.genre);
	while (genres.hasMore()) {  
		returnList[returnList.length] = genres.getNext();  
	}
	return returnList;
}
function getBpmRangeMinMax(){ 
	var list = getLibrary();  
	var returnList = new Array();
	var tempos = list.getDistinctValuesForProperty(SBProperties.bpm);
	while (tempos.hasMore()) {  
		var value = tempos.getNext();
		if(value > 10 && value < 500)
		returnList[returnList.length] = value;
	}
	return [returnList[0], returnList[returnList.length-1]];
}
function getBpmSearchRange(){   
	var value = gPrefs.getIntPref("instructors-musicinfo.bpmrange");
	return value;
}
function getFadeUpTime(){   
	var value = gPrefs.getIntPref("instructors-musicinfo.fadeup");
	return value;
}
function getFadeDownTime(){   
	var value = gPrefs.getIntPref("instructors-musicinfo.fadedown");
	return value;
}
function getFadeTime(){   
	var value = gPrefs.getIntPref("instructors-musicinfo.fadetime");
	return value;
}
function getFastForwardTime(){   
	var value = gPrefs.getIntPref("instructors-musicinfo.fastforwardtime");
	return value;
}
function getMinimumTracks(){   
	var value = gPrefs.getIntPref("instructors-musicinfo.minimumtracks");
	return value;
}
function setFocus(){   
	var text = document.getElementById("instructors-musicinfo-bpm");
	window.focus()
	text.focus();
}
function modifyItem(type){	
	var link = "chrome://instructors/content/modify-metadata.xul";
	window.openDialog(link,"ABWPPrefsDialog","chrome,centerscreen,dialog,modal");
}
function remoteControl(){	
	var link = "chrome://instructors/content/remote-control.xul";
	window.openDialog(link,"ABWPPrefsDialog","chrome,centerscreen,dialog,modal");
}

// -------------------------------------------------------------------------
// Volume functions
// -------------------------------------------------------------------------
function getUserVolume() 
{
	return gMM.volumeControl.volume;
}
function setUserVolume(value) 
{
	gMM.volumeControl.volume = value;
}
function storeUserVolume() 
{
	//gUserVolume = getUserVolume();
	gUserVolume = 1;
}
function restoreUserVolume() 
{	
	// Fast fade
	var time = getFadeUpTime();
	fadeTrack(time, gUserVolume);
	
}
function fadeTrack(timeLeft, targetVolume){ 
	var interval = (timeLeft*1000) / 10;
	var volumeChange = (targetVolume - getUserVolume()) / 10;
	
	// Reset old time
	clearTimeout(gFadeTimer);
	
	// New timer
	gFadeTimer = setTimeout("fadeTrackLoop("+targetVolume+","+volumeChange+","+interval+")",interval);	
}

function fadeTrackLoop(targetVolume, volumeChange, interval){ 
	
	// Only start if we have a timer
	if (gFadeTimer != null)
	{
		// Reset old time
		clearTimeout(gFadeTimer);
		
		// Check current volume
		var volume = getUserVolume();
						
		// Check volume up or down	
		if(volumeChange > 0){			
			// Raise volume				
			if(volume < targetVolume){
				
				setUserVolume( volume + parseFloat(volumeChange) );
				gFadeTimer = setTimeout("fadeTrackLoop("+targetVolume+","+volumeChange+","+interval+")",interval);	
			}
		}
		else{	
			// Lower volume
			if(volume > targetVolume){		
				
				setUserVolume( volume + parseFloat(volumeChange) );
				gFadeTimer = setTimeout("fadeTrackLoop("+targetVolume+","+volumeChange+","+interval+")",interval);	
			}
		}
	}
}

// -------------------------------------------------------------------------
// Clock functions
// -------------------------------------------------------------------------
function resetPlaybackCountDown() 
{
	stopPlaybackCountDown();
	var maxtime = gPrefs.getIntPref("instructors-musicinfo.maxtime");	
	document.getElementById("instructors-musicinfo-maxtime").setAttribute("value", maxtime);
}
function stopPlaybackCountDown() 
{
	gEnableTimer = false;	
}
function startPlaybackCountDown(){ 	
	
	// Make sure we are stopped first
 	gEnableTimer = false;	
  	
	// Start timer
	var value = document.getElementById("instructors-musicinfo-maxtime").getAttribute("value");	
	if(value != 0 && songbird.playing){	
		gEnableTimer = true;	
	}
		
}
function loopPlaybackCountDown(){ 	

	// Only start if we have a timer
	if (gEnableTimer == true)
	{
		
		// Start timer
		var text = document.getElementById("instructors-musicinfo-maxtime");
		var value = text.getAttribute("value");
		if(value != 0){
			value -= 1;
			text.setAttribute("value", value);				
		}		
		// Change to next track
		else{
			// Timer reached			
			loopPlaybackFinished();
			
		}
		
		// Fade track when only 2 seconds left
		var time = getFadeDownTime();
		if(value == time){
			storeUserVolume();
			fadeTrack(value, 0);
		}
	}	
}
function loopPlaybackFinished(){ 
	
	var node = document.getElementById("instructors-musicinfo-timer-check");
	var value = node.getAttribute("value");
	value = parseInt(value);
	if(value){
		// Fade music for x seconds				
		var fadeTime = getFadeTime();
		fadeTime *= 1000; // Convert to milliseconds		
		stopPlaybackCountDown();	
		clearTimeout(gFadeTimer);
		gFadeTimer = setTimeout("resetPlaybackCountDown();startPlaybackCountDown();restoreUserVolume();", fadeTime);
	}
	else{
		// Next track
		songbird.next();
	}	
}
function fastForward(){ 
	var fastForwardTime = getFastForwardTime() * 1000; // Convert to milliseconds	
	var position = songbird.position	
	songbird.position = (position + fastForwardTime)	
}
function fastRewind(){ 
	var fastForwardTime = getFastForwardTime() * 1000; // Convert to milliseconds	
	var position = songbird.position	
	songbird.position = (position - fastForwardTime)
}
function UR_Start() 
{
	// Reset old time
	clearTimeout(gClockTimer);
  
	// Get current date
	var UR_Nu = new Date;	
	var UR_Indhold = showFilled(UR_Nu.getHours()) + ":" + showFilled(UR_Nu.getMinutes());
	
 	// Update max timer
 	loopPlaybackCountDown();
 	 	
	// Set focus for keyboard
	setFocus();
	 	
 	// New timer
	gClockTimer = setTimeout("UR_Start()",1000);
}
function showFilled(Value) 
{
	return (Value > 9) ? "" + Value : "0" + Value;
}


// -------------------------------------------------------------------------
// Update UI functions
// -------------------------------------------------------------------------
function updateNowListening(){   


    try {       
      	// Get now playing info
    	var mediaItem = gMM.sequencer.currentItem;
    	var artist = mediaItem.getProperty("http://songbirdnest.com/data/1.0#artistName");
    	var song = mediaItem.getProperty("http://songbirdnest.com/data/1.0#trackName");
    	var genre = mediaItem.getProperty("http://songbirdnest.com/data/1.0#genre");
    	var bpm = mediaItem.getProperty("http://songbirdnest.com/data/1.0#bpm");
    	
    	// Set artist and track
    	var text = document.getElementById("instructors-musicinfo-artist");
    	var track = (artist + " - " + song);
     	text.setAttribute("value", track);
    	
      	// Set genre	
    	var text = document.getElementById("instructors-musicinfo-genre");
    	text.setAttribute("value", genre);
    	
    	// Set bpm
    	var text = document.getElementById("instructors-musicinfo-bpm");
    	text.setAttribute("value", bpm);
    	
    	// Set focus for keyboard
    	setFocus();    	
    	 
    	return mediaItem;
    } catch (e) {
          return null;
    }	
}
function scrollArtistTrack(){   
	
	var node = document.getElementById("instructors-musicinfo-artist");
	var text = node.getAttribute("value");
	
	var firstLetter = text[0];	
	text = text.substr(1,(text.length-1));
	text = (text + firstLetter);
	node.setAttribute("value", text);
	
	setTimeout("scrollArtistTrack()",600);	
}
function updateGenre(action, fullscreen){
			
	var valueChange = 0;
	if(action == "up"){
		valueChange = -1;
	}
	else if(action == "down"){
		valueChange = 1;
	}
	
	// Get current index
	var text = document.getElementById("instructors-musicinfo-genre");
	var currentGenre = text.getAttribute("value");
	var allGenres = getAllGenres();	
	var index = allGenres.indexOf(currentGenre);
	
	// Set new value
	var newIndex = index+valueChange;
	
	// Scroll to top if we reach bottom
	if(newIndex < 0)
		newIndex = allGenres.length -1;
	else if(newIndex >= allGenres.length)
		newIndex = 0;
	
	// Update
	updateNode(text, allGenres[newIndex], fullscreen);
		
	// UI Updated
	gUpdatedUI = true;			
}

function updateBpm(action, fullscreen)
{
	
	var valueChange = 0;
	if(action == "up"){
		valueChange = 5;
	}
	else if(action == "down"){
		valueChange = -5;
	}
	
	// Get original value
	var text = document.getElementById("instructors-musicinfo-bpm");
	var value = text.getAttribute("value");
	
	// Round off to nearest 5 and set new value
	var newValue = roundBpm(value);
	newValue = parseInt(newValue) + valueChange;
	
	// Limit range
	var range = new Array();
	range = getBpmRangeMinMax();
	if(range[0] < newValue && newValue < range[1]){	
		// Set new attribute
		updateNode(text, newValue, fullscreen);
	}	
	
	// Set minimum value (is outside range)
	if(newValue < range[0])
		updateNode(text, range[0], fullscreen);
	
	// Set maximum value (is outside range)
	if(newValue > range[1])
		updateNode(text, range[1], fullscreen);	
					
	// UI Updated
	gUpdatedUI = true;        
}

function updateMaxTime(action, fullscreen)
{
	
  	// Reset to last saved vaule
	resetPlaybackCountDown();
	
	// Get value and round to nearest time
	var text = document.getElementById("instructors-musicinfo-maxtime");
	var value = text.getAttribute("value");	
	value = roundTime(value);
	
	// Lower or raise time
	var valueChange = 0;
	if(action == "up"){
		valueChange = 10;
		storeUserVolume();
	}
	else if(action == "down"){
		valueChange = -10;
		storeUserVolume();
	}
	else if(action == "clear"){
		valueChange = parseInt(value) *-1;
		restoreUserVolume();
	}
	
	// Apply difference
	value = parseInt(value) + valueChange;
	
	// Limit minimun to 0
	if(value < 0)
	value = 0;
	
	// Store settings
	updateNode(text, value, fullscreen);
	gPrefs.setIntPref("instructors-musicinfo.maxtime", value);
		
	// Set focus for keyboard
	setFocus();
	
	// Start timer after 1 second
	clearTimeout(gUpdateTimer);
  	gUpdateTimer = setTimeout("startPlaybackCountDown()", 1000);
}

function updateMaxTimeAction(value, fullscreen)
{	
	
	// Get node
	var text = document.getElementById("instructors-musicinfo-timer-check");

	// Switch value
	if(value == "null"){
		var oldValue = text.getAttribute("value");
		oldValue = parseInt(oldValue);
		value = 1;
		if(oldValue == 1){
			value = 0;
		}
	}
	
	// Set new value
	text.setAttribute("value", value);	
							
	// Show in fullscreen
	if(fullscreen){
		if(value)
			value="--_--";
		else
			value="--->|";
		updateNode(null, value, fullscreen);
	}
}

// -------------------------------------------------------------------------
// Generate playlist functions
// -------------------------------------------------------------------------

function updatePlaylist()
{		
	// Store play state
	var playing = songbird.playing;
					
	// User has changed UI, re-generate playlist
	if(gUpdatedUI){	
					
		// Loading screen
		showLoadingScreen(true);
			
		// Disable hotkeys
		disableHotkeys(true);	
		
		// Pause
		fadeTrack(1, 0);
		
		// Use timer so that the loading screen is disabled first	
		gUpdateTimer = setTimeout("updatePlaylistUI(" + playing + ");",1000);	
	}	
	else{
		// Nothing changed. Toggle play pause
		if(playing){
			
			// Reset old timers
			clearTimeout(gUpdateTimer);
			
			// Fade volume
			storeUserVolume();
			fadeTrack(1, 0);
			
			// Pause music			
			gUpdateTimer = setTimeout("songbird.pause();",1000);			
		}		
		else{
			clearTimeout(gFadeTimer);
			clearTimeout(gUpdateTimer);
			restoreUserVolume();
			songbird.play();
		}
	}	
		       
}
function updatePlaylistUI( playing )
{		
	
	// Get values
	var genre = document.getElementById("instructors-musicinfo-genre").getAttribute("value");
	var bpm = document.getElementById("instructors-musicinfo-bpm").getAttribute("value");
	var minRating = getMinRating();
	
	// Add tracks
	var mediaList = addTracksToPlaylist( genre, bpm, minRating );
		
	//Play it
	var playIndex = Math.floor(Math.random()*mediaList.length);
	var mediaView = mediaList.createView()
	gMM.sequencer.playView(mediaView,playIndex);	
	gMM.sequencer.next();
	
	// Check play state
	if(! playing)
		songbird.pause();
				
	// Enable hotkeys
	disableHotkeys(false);
		
	// Restore UI
	showFullscreen(false);		
		
	// UI is finished updating
	gUpdatedUI = false;
}

function updateNode(id, value, fullscreen){	
	
	// Update value
	if(id != null)
		id.setAttribute("value", value);	
	
	// Fullscreen update
	if(fullscreen){
		
		// Enable GUI
		showFullscreen(true);
		var table = document.getElementById("instructors-musicinfo-fullscreen-text");
		table.setAttribute("value", value);	
		
		// Close window	
		clearTimeout(gFullscreenTimer);	
		gFullscreenTimer = setTimeout("showFullscreen(false);",1000);	
	}
	
}
function showFullscreen(value){	

	// Restore UI
	var table = document.getElementById("instructors-musicinfo-fullscreen-table");
	table.hidden = (! value);
	var table = document.getElementById("instructors-musicinfo-table");
	table.hidden = value;	
	
	// Loading screen
	var loading = document.getElementById("instructors-musicinfo-loading-screen");
	loading.setAttribute("value", false);	
		
}
function showLoadingScreen(value){	
	
	// Enable GUI
	var table = document.getElementById("instructors-musicinfo-fullscreen-text");
	table.setAttribute("value", "");	
		
	// Toggle fullscreen
	showFullscreen(value);	
		 					
	// Loading screen
	var loading = document.getElementById("instructors-musicinfo-loading-screen");
	loading.setAttribute("value", value);		
				
	
}
function updateTrackRating(value, fullscreen)
{	
	 
	// Get now playing info
    	var mediaItem = gMM.sequencer.currentItem;
    	var currentValue = mediaItem.getProperty("http://songbirdnest.com/data/1.0#rating");
	if(currentValue == null)
		currentValue = 0;
	
	// Check if we should increase or decrease current value
	currentValue = parseInt(currentValue);
	if(value == '-'){
		value = currentValue -1;
	}
	if(value == '+'){
		value = currentValue +1;
	}
	
	// Always convert to Int after we have checked + or -
	value = parseInt(value);
	
	// Min Max limits
	if(value < 0){
		value = 0;
	}
	if(value > 5){
		value = 5;
	}
	
	// Set new rating	
	mediaItem.setProperty("http://songbirdnest.com/data/1.0#rating", value);
		
	// Update fullscreen
	if(fullscreen)
		updateNode(null, ('* '+value+' *'), fullscreen);
	
}
function updateMinRating(value, fullscreen)
{	
	var currentValue = getMinRating();	
	currentValue = parseInt(currentValue);
	var min1 = document.getElementById("min-rating-1");
	var min2 = document.getElementById("min-rating-2");
	var min3 = document.getElementById("min-rating-3");
	var min4 = document.getElementById("min-rating-4");
	var min5 = document.getElementById("min-rating-5");
		
	// Check if we should increase or decrease current value
	if(value == '-'){
		value = currentValue -1;
	}
	if(value == '+'){
		value = currentValue +1;
	}
	
	// Always convert to Int after we have checked (+) or (-)
	value = parseInt(value);	
	
	// Min Max limits
	if(value < 0){
		value = 0;
	}
	if(value > 5){
		value = 5;
	}
		
	// Check if we should reset 
	if(value == currentValue && !fullscreen){
		min1.setAttribute("value",0);	
		min2.setAttribute("value",0);	
		min3.setAttribute("value",0);	
		min4.setAttribute("value",0);	
		min5.setAttribute("value",0);	
		value = 0;
	}
	
	// Set values
	if(value == 0){
		min1.setAttribute("value",0);	
		min2.setAttribute("value",0);	
		min3.setAttribute("value",0);	
		min4.setAttribute("value",0);	
		min5.setAttribute("value",0);			
	}
	if(value == 1){
		min1.setAttribute("value",1);	
		min2.setAttribute("value",0);	
		min3.setAttribute("value",0);	
		min4.setAttribute("value",0);	
		min5.setAttribute("value",0);			
	}
	else if(value == 2){
		min1.setAttribute("value",1);	
		min2.setAttribute("value",1);	
		min3.setAttribute("value",0);	
		min4.setAttribute("value",0);	
		min5.setAttribute("value",0);			
	}
	else if(value == 3){
		min1.setAttribute("value",1);	
		min2.setAttribute("value",1);	
		min3.setAttribute("value",1);	
		min4.setAttribute("value",0);	
		min5.setAttribute("value",0);			
	}
	else if(value == 4){
		min1.setAttribute("value",1);	
		min2.setAttribute("value",1);	
		min3.setAttribute("value",1);	
		min4.setAttribute("value",1);	
		min5.setAttribute("value",0);			
	}
	else if(value == 5){
		min1.setAttribute("value",1);	
		min2.setAttribute("value",1);	
		min3.setAttribute("value",1);	
		min4.setAttribute("value",1);	
		min5.setAttribute("value",1);			
	}	
	
	// Save global variable
	gMinRating = value;
	
	// Update fullscreen
	if(fullscreen)
		updateNode(null, ('> '+value+' *'), fullscreen);
	
	// UI Updated
	gUpdatedUI = true;
	
	// Set focus for keyboard
	setFocus(); 	
}
function getMinRating()
{
	return gMinRating;
}
function getSelectedPlaylist()
{	
	var playlist = LibraryUtils.mainLibrary.getItemByGuid(gSelectedPlaylist);
	return playlist;
}
function getLibrary()
{
	var list = null;
	
	if(gSelectedPlaylist){		
		list = getSelectedPlaylist();		
	}
	else{
		list = LibraryUtils.mainLibrary; 
	}	
	return list
}
function getRecommendedTracks( genre, bpm, minRating )
{		
	var range = getBpmSearchRange();
	var bpmMin = parseInt(bpm)-parseInt(range);
	var bpmMax = parseInt(bpm)+parseInt(range);
	var arrayAddedStart = null;
	var arrayAddedEnd = null;	
	var minRating = getMinRating();	
	var list = getLibrary();
	var items = list.getItemsByProperty(SBProperties.genre, genre);	
	var itemEnum = items.enumerate(); 
	var minimumTracks = getMinimumTracks();
	
	// Loop tracks and find matches
	var list = loopRecommendedTracks(itemEnum,bpmMin,bpmMax,minRating);
	
	// Make sure we find minimumtracks by trying max 10 times
	var numTries = 0;	
	while (list.length < minimumTracks && numTries < 10){
		
  		// Increase bpm range +1
  		bpmMin -= 1;
  		bpmMax += 1;
  		minRating -= 1;
  		
  		// Try new search criteria	
		var itemEnum = items.enumerate(); 
  		list = loopRecommendedTracks(itemEnum,bpmMin,bpmMax,minRating);
  				
		// Increase tries
		numTries++; 
	}
	
	// Return added list	
	return list;	
	
}	    
function loopRecommendedTracks( itemEnum, bpmMin, bpmMax, minRating )
{
	//var today = new Date();	
	//var lastPlayed;
	
	var list = new Array();
	while (itemEnum.hasMoreElements()){
		
		// Get item
		var item = itemEnum.getNext();	
		 
		// Check bpm range
		var itemBpm = item.getProperty("http://songbirdnest.com/data/1.0#bpm");		
		if((itemBpm >= bpmMin) && (itemBpm <= bpmMax)){
			
			// Check minimun rating
			var itemRating = item.getProperty("http://songbirdnest.com/data/1.0#rating");			
			if(itemRating >= minRating){
				list[list.length] = item;
			}
			
			// Remove last play time within 30 minutes
			//lastPlayed = item.getProperty("http://songbirdnest.com/data/1.0#lastPlayTime");
		}
	}
	//var sinceLastPlay = ((today.getTime() - lastPlayed) / 1000) / 60;
	//alert(sinceLastPlay);
	return list;
}
function addTracksToPlaylist( genre, bpm, minRating )
{        
	// Make sure we always have a playlist
	var playlist = createPlaylist();
	
	// Add tracks that match genre and bpm      
	var mediaItems = getRecommendedTracks(genre, bpm, minRating);	
	playlist.addSome(ArrayConverter.enumerator(mediaItems));
	
	return playlist;
}

function createPlaylist()
{
    var useNowPlayingList = false;
    var returnList;
    
    if(useNowPlayingList){
    	
    	// Slower    	 	
    	var pqSvc = Cc["@songbirdnest.com/Songbird/playqueue/service;1"]
                        .getService(Ci.sbIPlayQueueService),
        returnList = pqSvc.mediaList;  
    }
    else{
    	    // Faster
	    const playlistType = "instructors";
	    var hidden = 1;
	    
	    // Get the media list by looking up its guid, if it does not exist then
	    // create a new one
	    var guid = gPrefs.getCharPref("instructors-musicinfo.guid");    
	    var library = LibraryUtils.mainLibrary; 
	    try {
	      var item = library.getMediaItem(guid);
	      var list = item.QueryInterface(Ci.sbIMediaList);
	      list.setProperty(SBProperties.hidden, hidden);
	      
	      // set custom type
	      list.setProperty(SBProperties.customType, playlistType);
	      
	      returnList = list;
	    } catch (e) {
	      // The list doesn't exist, create a new one
	
	      var listProperties =
	        Cc["@songbirdnest.com/Songbird/Properties/MutablePropertyArray;1"]
	        .createInstance(Components.interfaces.sbIPropertyArray);
	      listProperties.appendProperty(SBProperties.hidden, hidden);
	
	      var list = library.createMediaList("simple", listProperties);
	      list.name = "Automatic Playlist";
	
	      // save the guid of the media list so it can be looked up next time
	      gPrefs.setCharPref("instructors-musicinfo.guid", list.guid);
	
	      // set up default column specifications
	      var columnSpec = SBProperties.bpm + " 40 " +
	                       SBProperties.trackName + " 180";
	                       SBProperties.artistName + " 180";
	      list.setProperty(SBProperties.columnSpec, columnSpec);
	      list.setProperty(SBProperties.defaultColumnSpec, columnSpec);
	      
	      // set custom type
	      list.setProperty(SBProperties.customType, playlistType);
	
	      returnList = list;
	    }
    }
    returnList.clear();    
    return returnList;
}