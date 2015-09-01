var s2rTemplateStrings = {};

s2rTemplateStrings.s2fContainer =
	'<iframe frameborder="0" id="s2r-tracking_iframe" name="s2r-tracking_iframe" allowtransparency="true" width="1" height="1"></iframe>' +

	'<form method="post" action="<%= flowServer %>/savetoflow/tracking/" accept-charset="UTF-8" enctype="application/x-www-form-urlencoded" target="s2r-tracking_iframe" name="s2r-tracking_form" id="s2r-tracking_form">' +
		'<input type="hidden" name="found" id="s2r-track_found">' +
		'<input type="hidden" name="selected" id="s2r-track_selected">' +
		'<input type="hidden" name="url" id="s2r-track_url">' +
		'<input type="hidden" name="modified" id="s2r-track_modified">' +
		'<input type="hidden" name="citation" id="s2r-track_citation">' +
	'</form>' +

	'<div class="s2r-header">' +
		'<div class="s2r-logo s2r-diagonal"><img src="<%= flowServer %>/public/img/refworks3-icon.png" width="30" height="30" /></div>' +
		'<div class="s2r-cancel-container"><img src="resource://pme/close-icon-white.png" class="s2r-cancel" id="s2r-cancel"/></div>' +
		'<div class="s2r-brand">' +
			'<div class="s2r-pq-logo"></div>' +
			'<div class="s2r-refworks-name"></div>' +
		'</div>' +
	'</div>' +

	'<div class="s2r-status" id="s2r-status"></div>' +
	'<div class="s2r-error" id="s2r-error"></div>' +
	'<div class="s2r-download" id="s2r-progress">' +
		'<div class="s2r-download-info">Saving to RefWorks...</div>' +
		'<div class="s2r-download-bar"><div class="s2r-download-progress" id="s2r-download-progress"></div></div>' +
	'</div>' +

	'<div id="s2r-container">' +
		'<div class="s2r-nav">' +
			'<div id="s2r-select-all-checkbox"><input type="checkbox" name="s2r-select-all" class="s2r-left-col" id="s2r-select-all" /><label for="s2r-select-all"> Select all</label></div>' +
			'<div id="s2r-back-to-list" class="s2r-left s2r-single-nav"><img src="resource://pme/arrow-left-black.png" /> Return to list</div>' +
			'<span class="s2r-right s2r-single-nav">' +
				'<img src="resource://pme/arrow-left-black.png" class="prev" id="s2r-single-prev"/>' +
				'<img src="resource://pme/arrow-right-black.png" class="next" id="s2r-single-next"/>' +
			'</span>' +
		'</div>' +
		'<div id="s2r-processing">Finding references...</div>' +
		'<div id="s2r-ui-main">' +
			'<p class="s2r-selected-header" id="s2r-header-text"></p>' +
			'<div class="s2r-webref s2r-warn" id="s2r-webref">RefWorks couldn\'t find much here, but you can enter the missing metadata below. </div>' +
			'<div class="s2r-meta" id="s2r-meta"></div>' +
		'</div>' +
		'<div class="s2r-ui-itemlist" id="s2r-ui-itemlist"></div>' +
		'<div class="s2r-button-pane"><button class="btn btn-primary s2r-btn_save" disabled="disabled" id="s2r-save_button">Save to RefWorks</button></div>' +
	'</div>';

s2rTemplateStrings.listItem =
	'<input type="checkbox" id="s2r-cbx_<%= itemId %>"/>' +
	'<img src="resource://pme/arrow-right-black.png" class="s2r-detail"/>' +
	'<label for="s2r-cbx_<%= itemId %>"><%= itemDescription %></label>';

s2rTemplateStrings.fullTextLine =
	'<h2 class="s2r-lbl">Save full text? <span class="s2r-full-text-icon"><%= type %></span></h2>' +
	'<div class="s2r-input-container">' +
		'<label for="s2r-attach">' +
			'<input type="checkbox" name="s2r-attach" id="s2r-attach" checked="<%= checked %>" class="s2r-attach"> ' +
			'<%= label %>' +
		'</label>' +
	'</div>';

s2rTemplateStrings.loginMessage =
	'You must be logged in. <br />' +
	'<form method="get" action="<%= flowServer %>" target="ProQuestFlow">' +
		'<button class="btn btn-primary" id="s2r-view_button" type="submit">Log in now</button>' +
	'</form>';

s2rTemplateStrings.savedMessage =
	'<h2><%= countText %></h2>' +
	'<h3>Nice work!</h3>' +
	'<form method="get" action="<%= flowServer %>/library/recent/" target="ProQuestFlow">' +
		'<button class="btn btn-primary" id="s2r-view_button" type="submit">View in RefWorks</button>' +
	'</form>';

