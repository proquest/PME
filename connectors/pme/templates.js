var s2fTemplateStrings = {};

s2fTemplateStrings.s2fContainer =
	'<iframe frameborder="0" id="s2r-tracking_iframe" name="s2r-tracking_iframe" allowtransparency="true" width="1" height="1"></iframe>' +

	'<form method="post" action="<%= flowServer %>/savetoflow/tracking/" accept-charset="UTF-8" enctype="application/x-www-form-urlencoded" target="s2r-tracking_iframe" name="s2r-tracking_form" id="s2r-tracking_form">' +
		'<input type="hidden" name="found" id="s2r-track_found">' +
		'<input type="hidden" name="selected" id="s2r-track_selected">' +
		'<input type="hidden" name="url" id="s2r-track_url">' +
		'<input type="hidden" name="modified" id="s2r-track_modified">' +
		'<input type="hidden" name="citation" id="s2r-track_citation">' +
	'</form>' +

	'<div class="s2r-status" id="s2r-status"></div>' +
	'<div class="s2r-error" id="s2r-error"></div>' +
	'<div class="s2r-download" id="s2r-progress">' +
		'<div class="s2r-download-info">Saving to Flow</div>' +
		'<div class="s2r-download-bar"><div class="s2r-download-progress" id="s2r-download-progress"></div></div>' +
	'</div>' +

	'<div id="s2r-container">' +

		'<div id="s2r-header"><img src="<%= flowServer %>/public/img/PQ-StF.png"/><img src="<%= flowServer %>/public/img/close.png" class="s2r-cancel" id="s2r-cancel"/></div>' +
		'<div class="s2r-ui-logo-wrapper">' +
			'<p class="s2r-selected-header s2r-left" id="s2r-header_text">Select articles</p>' +
			'<a class="s2r-ui-pick_all all s2r-right" href="javascript:void(0);" id="s2r-select-all">Select All</a>' +
			'<span class="s2r-right s2r-single-nav">' +
				'<img src="<%= flowServer %>/public/img/arrow-up.png" class="prev" id="s2r-single_prev"/>' +
				'<img src="<%= flowServer %>/public/img/arrow-down.png" class="next" id="s2r-single_next"/>' +
			'</span>' +
		'</div>' +
		'<div id="s2r-processing">Finding references</div>' +
		'<div id="s2r-ui-main">' +
			'<div class="s2r-webref s2r-warn" id="s2r-webref">Flow couldn\'t find much here, but you can enter the missing metadata below. </div>' +
			'<div class="s2r-meta" id="s2r-meta"></div>' +
		'</div>' +
		'<div class="s2r-ui-itemlist" id="s2r-ui-itemlist"></div>' +
		'<div class="s2r-button-pane"><button class="s2r-btn_save" disabled="disabled" id="s2r-save_button">Save to Flow</button></div>' +
	'</div>';