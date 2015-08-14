
///// DO NOT EDIT this comment or anything above it. (The build script looks for the '/////' string and ignores anything above it)
// The sharedRefData object is located in the Flow codebase and gets copied into PME. If this object must be changed,
// update the file ref-type-fields.js in Flow and those changes will propagate to PME.

var s2F = {};

s2F.templateStrings = {};

s2F.templateStrings.s2fContainer =
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
		'<div class="s2r-download_info">Saving to Flow</div>' +
		'<div class="s2r-download_bar"><div class="s2r-download_progress" id="s2r-download_progress"></div></div>' +
	'</div>' +

	'<div id="s2r-container">' +
		'<div class="s2r-ui_logo_wrapper">' +
			'<img src="<%= flowServer %>/public/img/PQ-StF.png"/><img src="<%= flowServer %>/public/img/close.png" class="s2r-cancel" id="s2r-cancel"/>' +
			'<p class="s2r-selected_header s2r-left" id="s2r-header_text">Select articles</p>' +
			'<a class="s2r-ui_pick_all all s2r-right" href="javascript:void(0);" id="s2r-select_all">Select All</a>' +
			'<span class="s2r-right s2r-single_nav">' +
				'<img src="<%= flowServer %>/public/img/arrow-up.png" class="prev" id="s2r-single_prev"/>' +
				'<img src="<%= flowServer %>/public/img/arrow-down.png" class="next" id="s2r-single_next"/>' +
			'</span>' +
		'</div>' +
		'<div id="s2r-processing">Finding references</div>' +
		'<div id="s2r-ui_main">' +
			'<div class="s2r-webref s2r-warn" id="s2r-webref">Flow couldn\'t find much here, but you can enter the missing metadata below. </div>' +
			'<div class="s2r-meta" id="s2r-meta"></div>' +
		'</div>' +
		'<div class="s2r-ui_itemlist" id="s2r-ui_itemlist"></div>' +
		'<div class="s2r-button_pane"><button class="s2r-btn_save" disabled="disabled" id="s2r-save_button">Save to Flow</button></div>' +
	'</div>';

s2F.Utils = {};

/**
 * Compiles JavaScript templates into functions that can be evaluated for rendering.
 * Useful for rendering complicated bits of HTML from JSON data sources. Template
 * functions can interpolate values, using <%= … %>.
 * When you evaluate a template function, pass in a data object that has properties
 * corresponding to the template's free variables.
 *
 * A slightly modified version of Underscore templates.
 *
 * ex:
 * var helloTemplate = Utils.template("hello: <%= name %>");
 * var helloJessica = helloTemplate({name:"Jessica"});
 *
 * @param templateString A string to be evaluated for rendering.
 * @returns an executable function that will render the string with passed properties.
 */
s2F.Utils.template = function(text) {

	// Certain characters need to be escaped so that they can be put into a
	// string literal.
	var escapes = {
		"'": "'",
		'\\': '\\',
		'\r': 'r',
		'\n': 'n',
		'\u2028': 'u2028',
		'\u2029': 'u2029'
	};

	var escapeRegExp = /\\|'|\r|\n|\u2028|\u2029/g;

	var escapeChar = function(match) {
		return '\\' + escapes[match];
	};

	var settings = {
		evaluate: /<%([\s\S]+?)%>/g,
		interpolate: /<%=([\s\S]+?)%>/g
	};

	// Combine delimiters into one regular expression via alternation.
	var matcher = RegExp([
		(settings.interpolate || noMatch).source,
		(settings.evaluate || noMatch).source
	].join('|') + '|$', 'g');

	// Compile the template source, escaping string literals appropriately.
	var index = 0;
	var source = "__p+='";
	text.replace(matcher, function(match, interpolate, evaluate, offset) {
		source += text.slice(index, offset).replace(escapeRegExp, escapeChar);
		index = offset + match.length;

		if (interpolate) {
			source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
		} else if (evaluate) {
			source += "';\n" + evaluate + "\n__p+='";
		}

		// Adobe VMs need the match returned to produce the correct offset.
		return match;
	});
	source += "';\n";

	// If a variable is not specified, place data values in local scope.
	if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

	source = "var __t,__p='',__j=Array.prototype.join," +
	"print=function(){__p+=__j.call(arguments,'');};\n" +
	source + 'return __p;\n';

	var render;
	try {
		render = new Function(settings.variable || 'obj', '_', source);
	} catch (e) {
		e.source = source;
		throw e;
	}

	var template = function(data) {
		return render.call(this, data);
	};

	// Provide the compiled source as a convenience for precompilation.
	var argument = settings.variable || 'obj';
	template.source = 'function(' + argument + '){\n' + source + '}';

	return template;
};

var SaveToFlow = (function() {

	var FLOW_SERVER = "https://flow.proquest.com",
		MODE = "DEBUG";

	function setSaveTimeout(doc,delay){
		delay = delay || 10000;
		if(delay == -1) {
			doc.getElementById("s2r-container").setAttribute("not_loaded", "false");
			return;
		}
		else {
			doc.getElementById("s2r-container").setAttribute("not_loaded", "true");
		}
		ZU.setTimeout(function () {
			var notLoaded = doc.getElementById("s2r-container").getAttribute("not_loaded");
			if (notLoaded == "true") {
				//got stuck at done, has items, just something prevented the complete.
				Zotero.done();
				ZU.setTimeout(function () {
					var notLoaded = doc.getElementById("s2r-container").getAttribute("not_loaded");
					if (notLoaded == "true") {
						doc.getElementById("s2r-container").style.display = "none";
						doc.getElementById("s2r-progress").style.display = "block";
						saveFailed(doc);
					}
				}, 10000);
			}
		}, delay);
	}

	function entry(doc, url) {
		if (doc && !doc.getElementById("s2r-capture")) {
			style(doc);
			container(doc);

			ZU.setTimeout(function () {
				var className = doc.getElementById("s2r-capture").className;
				doc.getElementById("s2r-capture").className = (className ? className + " " : "") + "s2r-show";
			}, 100);

			setSaveTimeout(doc);
		}
		return "Save to Flow Loaded"
	}

	function style(doc) {
		try {
			var linkedStyle = doc.createElement("link");
			linkedStyle.type = "text/css";
			linkedStyle.rel = "stylesheet";
			linkedStyle.href = "resource://pme/style.css";
			doc.head.appendChild(linkedStyle);
		}
		catch (e) {
			error(doc, e);
		}
	}

	function container(doc) {
		try {
			var container = doc.createElement("div");
			container.id = "s2r-capture";
			container.className = "notranslate";
			container.innerHTML = s2F.Utils.template(s2F.templateStrings.s2fContainer)({flowServer: FLOW_SERVER});
			doc.body.appendChild(container);
			attachCloseEvent(doc, "s2r-cancel");
		}
		catch (e) {
			error(doc, e);
		}
	}

	function attachCloseEvent(doc, id) {
		doc.getElementById(id).addEventListener("click", function (e) {
			close(doc);
		}, true);
	}

	function close(doc) {
		try {
			var elem = doc.getElementById("s2r-capture");
			if (elem) {
				var className = elem.className;
				elem.className = className.replace("s2r-show", "");
				ZU.setTimeout(function () {
					try {
						//need to recheck if the element still there, it could've been removed by now
						var elem = doc.getElementById("s2r-capture");
						if (elem) {
							doc.body.removeChild(elem);
							doc.head.removeChild(doc.getElementById("s2r-style"));
							Z.done();
						}
					}
					catch (e) {
						error(doc, e);
					}
				}, 1000);
			}
		}
		catch (e) {
			error(doc, e);
		}
	}

	function debug(doc, str) {
		var debug = doc.getElementById("s2r-debug");
		if (!debug) {
			doc.body.innerHTML += '<div id="s2r-debug"></div>';
			debug = doc.getElementById("s2r-debug")
		}
		debug.innerHTML += "<div>" + str + "</div>";
	}

	function error(doc, e) {
		//severity levels?
		try {
			var errorObj = {
				name: e.name,
				message: e.message,
				func: arguments.callee && arguments.callee.caller ? arguments.callee.caller.name : "",
				lineNumber: e.lineNumber,
				severity: "error"//,
				//url:url
			}
			if (MODE == "debug") {
				debug(doc, JSON.stringify(errorObj));
			}
			else
				ZU.HTTP.doPost("https://flow.proquest.com/api/2/logservice/", JSON.stringify(errorObj), function () {
				}, {"Content-Type": "application/json"});//send to server to be logged
		}
		catch (e) {
		}
	}

	function tracking(doc, tracking) {
		try {
			doc.getElementById("s2r-track_found").value = tracking.found;
			doc.getElementById("s2r-track_selected").value = tracking.selected;
			doc.getElementById("s2r-track_url").value = tracking.url;
			doc.getElementById("s2r-track_citation").value = tracking.citation;
			doc.getElementById("s2r-track_modified").value = JSON.stringify(tracking.modified);
			//doc.getElementById("s2r-tracking_form").submit();
		}
		catch (e) {
			error(doc, e);
		}
	}

	function save(item, doc, url) {
		try {
			startProgress(doc);
			//move this check up to the save event so it only needs to happen once.
			ZU.HTTP.doGet(FLOW_SERVER + '/login/session/', function (data_login) {//check for logged in
				try {
					if (JSON.parse(data_login).result == "success")
						newDocument(doc, url, item);
					else
						loginDialog(doc);
				}
				catch (e) {
					saveFailed(doc);
					error(doc, e);
				}
			});
		}
		catch (e) {
			saveFailed(doc);
			error(doc, e);
		}
	}

	function newDocument(doc, url, item) {
		try {
			ZU.HTTP.doGet(FLOW_SERVER + '/api/1/doc/newid/', function (data_id) {
				try {
					var resp = JSON.parse(data_id), id = resp.data;
					//no id = failure
					if (id)
						updateDocument(doc, url, item, id);
					else
						saveFailed(doc);
				}
				catch (e) {
					saveFailed(doc);
					error(doc, e);
				}
			});
		}
		catch (e) {
			saveFailed(doc);
			error(doc, e);
		}
	}

	function updateDocument(doc, url, item, id) {
		try {
			var attachment;
			progressDialog(doc, 0.2);
			if (item.attachments && item.attach) {
				//take pdf over html
				for (var i = 0; i < item.attachments.length; i++) {
					if (item.attachments[i].mimeType && item.attachments[i].mimeType.indexOf("pdf") >= 0)
						attachment = {url: item.attachments[i].url, mimeType: item.attachments[i].mimeType};
				}

				if (!attachment)
					for (var i = 0; i < item.attachments.length; i++) {
						if (item.attachments[i].mimeType && item.attachments[i].mimeType.indexOf("html") >= 0)
							attachment = {url: item.attachments[i].url, mimeType: item.attachments[i].mimeType};
					}

			}
			if (!attachment && item.attach) {//types other than pdf?
				attachment = {html: doc.documentElement.outerHTML || (new XMLSerializer().serializeToString(doc)), url: url};
			}

			delete item.attachments;
			delete item.attach;
			delete item.modifiedFields;
			ZU.HTTP.doPost(FLOW_SERVER + '/edit/' + id + '/?project=all',
				JSON.stringify(item),
				function (data_edit) {
					try {
						if (attachment) {
							progressDialog(doc, 0.5);
							getAttachment(doc, attachment, id);
						}
						else {
							completeProgress(doc);
						}
					}
					catch (e) {
						error(doc, e);
					}
				}, {"Content-Type": "application/json"});
		}
		catch (e) {
			error(doc, e);
		}
	}

	function startProgress(doc) {
		setSaveTimeout(doc,60000);
		doc.getElementById("s2r-container").style.display = "none";
		doc.getElementById("s2r-progress").style.display = "block";
	}

	function completeProgress(doc) {
		var stf = doc.getElementById("s2r-capture"),
			done = parseInt(stf.getAttribute("data-saving-done"));
		stf.setAttribute("data-saving-done", (isNaN(done) ? 1 : done + 1));
		progressDialog(doc, 0.5);
	}

	function getAttachment(doc, attachment, id) {
		try {
			if (attachment.html)
				saveAttachment(doc, id, attachment.html, "text/html", attachment.url);
			else {
				//for those insane relative paths...
				var a = doc.createElement('a');
				a.href = attachment.url;
				attachment.url = a.href;
				ZU.HTTP.promise("GET", attachment.url, {responseType: "blob", headers: {"Content-Type": attachment.mimeType}}, function (blob) {
					if (!blob) {
						attachmentFailed(doc);
						//error(doc, e);
					}
					else {
						try {
							progressDialog(doc, 0.7);
							saveAttachment(doc, id, blob, attachment.mimeType, attachment.url);
						}
						catch (e) {
							attachmentFailed(doc)
							error(doc, e);
						}
					}
				});
			}
		}
		catch (e) {
			attachmentFailed(doc)
			error(doc, e);
		}
	}

	function saveAttachment(doc, id, body, mimeType, attachUrl) {
		try {
			var url = mimeType.indexOf("html") > 0 ?
				FLOW_SERVER + "/edit/" + id + "/html/?url=" + encodeURIComponent(attachUrl) :
				FLOW_SERVER + "/savetoflow/attachment/" + id + "/";
			ZU.HTTP.promise("POST", url, {debug: true, headers: {"Content-Type": mimeType}, body: body}, function (blob) {
				try {
					if (!blob)
						attachmentFailed(doc);
					else
						completeProgress(doc);
				}
				catch (e) {
					attachmentFailed(doc);
					error(doc, e);
				}
			});
		}
		catch (e) {
			attachmentFailed(doc);
			error(doc, e);
		}
	}

	function saveFailed(doc) {
		progressDialog(doc, 1);//allow completion
		try {
			var errorDialog = doc.getElementById("s2r-error");
			doc.getElementById("s2r-progress").style.display = "none";
			errorDialog.style.display = "block";
			errorDialog.innerHTML = '<img src="' + FLOW_SERVER + '/public/img/close.png" class="s2r-cancel" id="s2r-err_cancel"/>We\'re sorry, we were unable to save to Flow. We tried, but came up empty.';
			attachCloseEvent(doc, "s2r-err_cancel");
		}
		catch (e) {
			error(doc, e);
		}
	}

	function attachmentFailed(doc) {
		progressDialog(doc, 1);//allow completion
		try {
			var errorDialog = doc.getElementById("s2r-error");
			errorDialog.style.display = "block";
			errorDialog.style.top = '85px';
			errorDialog.innerHTML = "We're sorry, we were unable to get some of the full-text. We tried, but came up empty.";
			errorDialog.innerHTML = '<img src="' + FLOW_SERVER + '/public/img/close.png" class="s2r-cancel" id="s2r-err_cancel"/>We\'re sorry, we were unable to get some of the full-text. We tried, but came up empty.';
			attachCloseEvent(doc, "s2r-err_cancel");
		}
		catch (e) {
			error(doc, e);
		}
		completeProgress(doc);
	}

	function progressDialog(doc, ratio) {
		var stf = doc.getElementById("s2r-capture"),
			count = stf.getAttribute("data-saving-count"),
			done = stf.getAttribute("data-saving-done");
		if (count) {
			count = parseInt(count), done = parseInt(done);
			if (isNaN(done))
				done = 0;
			ratio = done / count;
		}
		if (!count && parseInt(done) == 1)
			ratio = 1;

		doc.getElementById("s2r-download_progress").style.width = Math.round(ratio * 315) + "px";
		if (ratio == 1)
			completeDialog(doc);
	}

	function completeDialog(doc) {
		try {
			var count = doc.getElementById("s2r-capture").getAttribute("data-saving-count"),
				status = doc.getElementById("s2r-status"),
				countText = count ? count + " articles saved." : "1 article saved.";

			doc.getElementById("s2r-progress").style.display = "none";
			status.style.display = "block";
			status.innerHTML = countText + '<form method="get" action="' + FLOW_SERVER + '/library/recent/" target="ProQuestFlow"><button id="s2r-view_button" type="submit">View in Flow</button></form>';

			ZU.setTimeout(function () {
				try {
					status.style.display = "none";
					close(doc)
					Z.done();
				}
				catch (e) {
					error(doc, e);
				}
			}, 8000);
		}
		catch (e) {
			error(doc, e);
		}
	}

	function loginDialog(doc) {
		try {
			setSaveTimeout(doc,-1);
			var status = doc.getElementById("s2r-status");
			doc.getElementById("s2r-progress").style.display = "none";
			status.style.display = "block";
			status.innerHTML = 'You must be logged in. <form method="get" action="' + FLOW_SERVER + '" target="ProQuestFlow"><button id="s2r-view_button" type="submit">Log in now</button></form>';

			ZU.setTimeout(function () {
				try {
					status.style.display = "none";
					doc.getElementById("s2r-container").style.display = "block";
				}
				catch (e) {
					error(doc, e);
				}
			}, 4000);
		}
		catch (e) {
			error(doc, e);
		}
	}

	function selection(doc, url, items, callback) {
		setSaveTimeout(doc,-1);
		try {
			//callback should complete items, so we'll basically want to use it when we want to see of save an item.
			var container = doc.getElementById("s2r-ui_itemlist"), stf = doc.getElementById("s2r-capture"), ix = 1;
			if (container.getElementsByClassName("s2r-ui_item").length > 0) {
				Z.debug("selection called after already loaded.");
				return;
			}
			stf.className = " s2r-listView";
			for (itemId in items) {
				try {
					var item = doc.createElement("div");
					item.className = "s2r-ui_item";
					item.setAttribute("data-id", itemId);
					item.setAttribute("data-ix", ix++);
					item.addEventListener("click", function (e) {
						try {
							if (e.target.className == "s2r-detail") {//go to reference
								stf.className += " s2r-singleView s2r-toggle";
								doc.getElementById("s2r-processing").innerHTML = "Loading reference";
								var thisItemId = this.getAttribute("data-id");
								stf.setAttribute("data-id", thisItemId);
								stf.setAttribute("data-ix", this.getAttribute("data-ix"));
								//set a timeout to wait for single, if single never shows, show error.
								setSaveTimeout(doc);
								if (savedReferences[thisItemId]) {
									single(doc, url, savedReferences[thisItemId]);
								}
								else {
									var thisItem = {};
									thisItem[thisItemId] = items[thisItemId];
									callback(thisItem);
								}
							}
							else {//update count of selected. enable button if > 0
								setListButton(doc);
							}
						}
						catch (e) {
							error(doc, e);
						}
					}, true);
					item.innerHTML = '<p><input type="checkbox" id="s2r-cbx_' + itemId + '"/><label for="s2r-cbx_' + itemId + '">' + items[itemId] + '</label></p>'
						+ '<img src="' + FLOW_SERVER + '/public/img/oval-arrow-grey.png" class="s2r-detail"/>';
					container.appendChild(item);
				}
				catch (e) {
					error(doc, e);
				}
			}
			stf.setAttribute("data-count", ix - 1);
			var savedReferences = {};

			doc.getElementById("s2r-select_all").addEventListener("click", function (e) {
				try {
					if (this.getAttribute("unselect") == "true") {
						this.innerHTML = "Select All";
						this.setAttribute("unselect", "false");
						setListButton(doc, false);
					}
					else {
						this.innerHTML = "Unselect All";
						this.setAttribute("unselect", "true");
						setListButton(doc, true);
					}
				}
				catch (e) {
					error(doc, e);
				}
			}, true);
			doc.getElementById("s2r-single_next").addEventListener("click", function (e) {
				try {
					var item_id = stf.getAttribute("data-id");
					savedReferences[item_id] = getModified(doc);
					move(doc, url, callback, items, 1, savedReferences);
				}
				catch (e) {
					error(doc, e);
				}
			}, true);
			doc.getElementById("s2r-single_prev").addEventListener("click", function (e) {
				try {
					var item_id = stf.getAttribute("data-id");
					savedReferences[item_id] = getModified(doc);
					move(doc, url, callback, items, -1, savedReferences);
				}
				catch (e) {
					error(doc, e);
				}
			}, true);
			doc.getElementById("s2r-save_button").addEventListener("click", function (e) {
				try {
					var stf = doc.getElementById("s2r-capture");
					if (stf.className.indexOf("s2r-listView") >= 0 && stf.className.indexOf("singleView") >= 0) {
						var item_id = stf.getAttribute("data-id");
						savedReferences[item_id] = getModified(doc);
						stf.className = "s2r-listView s2r-show";//save and back to list
						doc.getElementById("s2r-header_text").innerHTML = "Select articles";
						setListButton(doc);
					}
					else if (stf.className.indexOf("s2r-listView") >= 0) {
						stf.setAttribute("data-saving", "true");
						stf.setAttribute("data-saving-count", 1);
						startProgress(doc);
						var cbx = doc.getElementById("s2r-ui_itemlist").getElementsByTagName("input"),
							count = 0,
							modified = [],
							list = {};
						for (var i = 0; i < cbx.length; i++) {
							if (cbx[i].checked) {
								count++;
								var item_id = cbx[i].id.replace("s2r-cbx_", "");
								if (savedReferences[item_id]) {
									if (savedReferences[item_id].modifiedFields)
										modified.push(savedReferences[item_id].modifiedFields)

									var reference = conversion.convert(savedReferences[item_id])
									reference.attachments = savedReferences[item_id].attachments;
									save(reference, doc, url);
								}
								else {
									list[item_id] = items[item_id];
								}
							}
						}
						callback(list);
						stf.setAttribute("data-saving-count", count);
						var found = stf.getAttribute("data-count"),
							selected = count;
						tracking(doc, {"url": url, "found": found, "selected": selected, "citation": "regular", "modified": modified});
						//Zotero.done();
					}
				}
				catch (e) {
					error(doc, e);
				}
			}, true);
		}
		catch (e) {
			error(doc, e);
		}
		return "Translator results displayed";
	}

	function move(doc, url, callback, items, offset, savedReferences) {
		var cbx = doc.getElementById("s2r-ui_itemlist").getElementsByTagName("input"),
			stf = doc.getElementById("s2r-capture"),
			id = stf.getAttribute("data-id");
		for (var i = 0; i < cbx.length; i++) {
			try {
				if (cbx[i].id == "s2r-cbx_" + id) {
					if (i + offset < 0 || i + offset >= cbx.length)
						return;
					stf.className += " s2r-toggle";
					var thisItem = {}, thisItemId = cbx[i + offset].id.replace("s2r-cbx_", "");
					stf.setAttribute("data-id", thisItemId);
					stf.setAttribute("data-ix", i + (1 + offset));
					if (savedReferences[thisItemId]) {
						single(doc, url, savedReferences[thisItemId]);
					}
					else {
						thisItem[thisItemId] = items[thisItemId];
						callback(thisItem);
					}
				}
			}
			catch (e) {
				error(doc, e);
			}
		}
	}

	function setListButton(doc, check) {
		try {
			var cbx = doc.getElementById("s2r-ui_itemlist").getElementsByTagName("input"), count = 0;
			for (var i = 0; i < cbx.length; i++) {
				if (check !== undefined)
					cbx[i].checked = check;
				if (cbx[i].checked)
					count++;
			}
			var button = doc.getElementById("s2r-save_button");
			if (count > 0) {
				button.disabled = false;
				button.className = "s2r-btn_save s2r-enable";
			}
			else {
				button.disabled = true;
				button.className = "s2r-btn_save";
			}
			button.innerHTML = "Save to Flow (" + count + ")";
		}
		catch (e) {
			error(doc, e);
		}
	}

	function singleHeader(doc, refType, attachments) {
		try {
			var stf = doc.getElementById("s2r-capture"),
				containerClass = stf.className,
				output = [];
			containerClass = containerClass.replace(" s2r-toggle", "");
			if (containerClass.indexOf("s2r-singleView") < 0)
				stf.className = containerClass + " s2r-singleView";
			else
				stf.className = containerClass;
			if (containerClass.indexOf("s2r-listView") >= 0) {
				var ix = parseInt(stf.getAttribute("data-ix")),
					count = parseInt(stf.getAttribute("data-count"));
				doc.getElementById("s2r-header_text").innerHTML = "Article details - " + ix + " of " + count;
				doc.getElementById("s2r-single_prev").className = "s2r-prev" + (ix <= 1 ? " s2r-disabled" : "");
				doc.getElementById("s2r-single_next").className = "s2r-next" + (ix >= count ? " s2r-disabled" : "");
				doc.getElementById("s2r-save_button").innerHTML = "Done editing";
			}
			else
				output.push("<div class='s2r-lbl s2r-header'>Save As</div>");

			output.push("<select id='reference_type' class='s2r-dropdown'>");
			for (var index in labels.referenceTypes) {
				var value = labels.referenceTypes[index];
				var selected = refType == index ? " selected='selected'" : "";
				output.push("<option value='" + index + "'" + selected + ">" + value.label + "</option>");
			}
			output.push("</select>");
			var pdf = false, html = false;
			try {
				if (attachments)
					for (var i = 0; i < attachments.length; i++) {
						if (attachments[i] && attachments[i].mimeType && attachments[i].mimeType.indexOf("pdf") >= 0)
							pdf = true;
						if (attachments[i] && attachments[i].mimeType && attachments[i].mimeType.indexOf("html") >= 0) {
							html = true;
							Z.debug(attachments[i]);
						}
					}
			}
			catch (e) {
				error(doc, e);
			}
			if (pdf || html) {
				output.push("<img src='" + FLOW_SERVER + "/public/img/" + (pdf ? "pdf" : "web") + ".png' class='s2r-lbl'/><span class='s2r-input_container'><label for='s2r-attach_web' class='s2r-attach'><input type='checkbox' id='s2r-attach' checked='checked' class='s2r-attach'> <span>We found the article, want to save it?</span></label></span>");
			}
			else if (containerClass.indexOf("s2r-listView") == -1) {
				output.push("<img src='" + FLOW_SERVER + "/public/img/web.png' class='s2r-lbl'/><span class='s2r-input_container'><label for='s2r-attach_web' class='s2r-attach'><input type='checkbox' id='s2r-attach' class='s2r-attach'> <span>Save the content of this web page</span></label></span>");
			}

			output.push("<div id='s2r-ref_type_spec' class='s2r-clear'>");
			return output;
		}
		catch (e) {
			error(doc, e);
		}
	}

	function saveItems(doc, url, items, noneFound) {
		for (i in items)
			single(doc, url, items[i], noneFound);
	}

	function single(doc, url, item, noneFound, error) {
		setSaveTimeout(doc, -1);
		try {
			if(noneFound && error) {
				saveFailed(doc)
				return;
			}
			if (!item) {
				item = {};
				item.refType = "GENERIC_REF";
				item.retrievedDate = new Date();
				item.URL = url;
				item.attachments = [];
			}
			var container = doc.getElementById("s2r-meta"),
				stf = doc.getElementById("s2r-capture");
			if (!item.refType) {//this function can be called with zotero format or flow format (first view, and there-after)
				if (!item.retrievedDate)
					item.retrievedDate = new Date();
				if (!item.URL)
					item.URL = url;
				var attachments = item.attachments;
				item = conversion.convert(item);
				item.attachments = attachments;
			}
			if (stf.getAttribute("data-saving") == "true") {
				saveReference(doc, url, item, true);
				return;
			}

			if (noneFound) {
				if (url.indexOf(".pdf") > -1)
					item.attachments.push({title: 'Full Text PDF', url: url, mimeType: 'application/pdf'});
				else
					doc.getElementById("s2r-webref").style.display = "block";
			}

			var output = singleHeader(doc, item.refType, item.attachments)
				.concat(createFields(doc, item));
			output.push("</div>");

			autoSize.removeEvents(doc);

			container.innerHTML = output.join('');

			doc.getElementById("s2r-save_button").disabled = false;

			autoSize.addEvents(doc);

			if (doc.getElementById("s2r-capture").getAttribute("events_attached") != "true") {
				doc.getElementById("reference_type").addEventListener("change", function (e) {
					try {
						//get current field values (may be editted)
						autoSize.removeEvents(doc);
						item = getModified(doc);
						doc.getElementById("s2r-ref_type_spec").innerHTML = createFields(doc, item).join('');
						autoSize.addEvents(doc);
					}
					catch (ex) {
						error(doc, ex);
					}
				}, true);

				if (stf.className.indexOf("s2r-singleView") >= 0 && stf.className.indexOf("s2r-listView") == -1) {
					doc.getElementById("s2r-save_button").addEventListener("click", function (e) {
						try {
							startProgress(doc);
							item = saveReference(doc, url, item, false);
							var found = 1,
								selected = 1,
								citation = noneFound ? "web" : "regular";
							tracking(doc, {"url": url, "found": found, "selected": selected, "citation": citation, "modified": [item.modifiedFields]});
						}
						catch (e) {
							error(doc, e);
						}
					}, true);
				}
				doc.getElementById("s2r-capture").setAttribute("events_attached", "true")
			}
		}
		catch (e) {
			error(doc, e);
		}
		return "Item Displayed";
	}

	function getModified(doc) {
		var reference = {}, item = {};
		try {
			item = JSON.parse(doc.getElementById("s2r-reference_json").innerHTML);
		}
		catch (e) {
			error(doc, e);
		}
		try {
			reference.refType = doc.getElementById("reference_type").value;
			reference.modifiedFields = item.modifiedFields ? item.modifiedFields : [];
			reference.tags = item.tags ? item.tags : [];
			for (var index = 0; index < labels.order.length; index++) {
				try {
					var elem = doc.getElementById("s2r-" + labels.order[index]);
					if (elem) {
						var val = elem.value;
						if (labels.order[index] == "authors")
							val = authorNameList(val, "\n");
						if (val) {
							reference[labels.order[index]] = val;
							if (reference[labels.order[index]] != item[labels.order[index]] && reference.modifiedFields.indexOf(conversion.tracking(labels.order[index])) == -1)
								reference.modifiedFields.push(conversion.tracking(labels.order[index]));
						}
					}
					else if (item[labels.order[index]])
						reference[labels.order[index]] = item[labels.order[index]];
				}
				catch (e) {
					error(doc, e);
				}
			}
			reference.attachments = item.attachments;
			reference.attach = doc.getElementById("s2r-attach") && doc.getElementById("s2r-attach").checked;
		}
		catch (e) {
			error(doc, e);
		}
		return reference;
	}

	function saveReference(doc, url, item, useItem) {
		try {
			var reference = useItem ? item : getModified(doc);
			reference = conversion.convert(reference);//convert to deep flow model
			reference.attachments = item.attachments;
			reference.attach = useItem ? item.attachments.length : doc.getElementById("s2r-attach").checked;
			save(reference, doc, url);
			return reference;
		}
		catch (e) {
			error(doc, e);
		}
	}

	function createFields(doc, item) {
		try {
			var fieldMapping = labels.referenceTypes[item.refType].defaultFields,
				output = [];
			for (var index = 0; index < labels.order.length; index++) {
				try {
					var field = labels.order[index];
					if (fieldMapping.indexOf(field) >= 0) {
						var override = labels.referenceTypes[item.refType].fieldLabelOverides[field], label = override ? override : labels.fields[field].label;
						var value = field == "authors" ? authorNameList(item[field], "\n") : item[field];

						if (value && label.toLowerCase() == 'isbn') value = value.split(',')[0];

						output.push(
							"<div class='s2r-lbl'>" +
								label +
								(field == "authors" ? ' ("Last name, First names" each on new line)' : '') +
							"</div>" +
							"<textarea class='s2r-val' id='s2r-" + field + "' rows='1' placeholder='" +
							(field == "authors" ? "Please enter authors..." : "Please enter metadata...") +
							"'>" +
							(value ? value : "") +
							"</textarea>");
					}
				}
				catch (e) {
					error(doc, e);
				}
			}
			output.push("<div id='s2r-reference_json'>" + JSON.stringify(item) + "</div>");
			return output;
		}
		catch (e) {
			error(doc, e);
		}
	}

	var autoSize = (function () {
		function autoSize(text) {
			var textHeight = 102;
			if (text.scrollHeight < textHeight || text.id == "s2r-authors") {
				text.style.height = 'auto';
				var height = (text.scrollHeight + (text.id == "s2r-authors" ? 18 : 0))
				text.style.height = (height > 32 ? height : 32) + 'px';//minimum, one line
				text.style.overflow = 'hidden';
			}
			else {
				text.style.height = textHeight + 'px';
				text.style.overflowY = 'auto';
			}
		}

		function focusEvent() {
			//var parent = this.parentNode;
			//parent.getElementsByClassName("empty").style.display = 'none';
			this.addEventListener("keypress", keyEvent);
		}

		function blurEvent() {
			this.removeEventListener("keypress", keyEvent);
		}

		function keyEvent() {
			var that = this;
			ZU.setTimeout(function () {
				autoSize(that)
			}, 0);
		}

		function removeEvents(doc) {
			for (var index = 0; index < labels.order.length; index++) {
				var value = labels.order[index];
				var text = doc.getElementById("s2r-" + value);
				if (text) {
					text.removeEventListener("focus", focusEvent);
					text.removeEventListener("blur", blurEvent);
				}
			}
		}

		function addEvents(doc) {
			for (var index = 0; index < labels.order.length; index++) {
				var value = labels.order[index];
				var text = doc.getElementById("s2r-" + value);
				if (text) {
					autoSize(text);
					text.addEventListener("focus", focusEvent);
					text.addEventListener("blur", blurEvent);
				}
			}
		}

		return {addEvents: addEvents, removeEvents: removeEvents};
	})();

	var labels = (function () {
		var fields = sharedRefData.fields,
			referenceTypes = sharedRefData.refTypes,
			order = [
				'title', 'historicalTitle', 'authors', 'editors', 'assignees', 'recipients', 'legislativeBody', 'committee',
				'subcommittee', 'legislativeSession', 'jurisdiction', 'lawType', 'docNumber', 'sectionNumber', 'subsection',
				'publication', 'publicationDate', 'seriesTitle', 'seriesEditors', 'publisher', 'department', 'location',
				'edition', 'sequenceNumber', 'volume', 'issue', 'pages', 'doi', 'issn', 'isbn', 'type', 'url', 'retrievedDate',
				'abstract', 'geographicLocation', 'scale'
			];

		return {order: order, fields: fields, referenceTypes: referenceTypes};
	})();

	var conversion = (function () {
		var zotero = {
			itemType: {
				book: "BOOK_REF",
				bookSection: "BOOK_SECTION_REF",
				conferencePaper: "CONF_REF",
				journalArticle: "JOURNAL_ARTICLE_REF",
				magazineArticle: "MAG_REF",
				newspaperArticle: "NEWS_REF",
				report: "REPORT_REF",
				thesis: "THESIS_REF",
				webpage: "WEB_REF",
				patent: "PATENT_REF",
				email: "PERSONAL_COMM_REF",
				instantMessage: "PERSONAL_COMM_REF",
				letter: "PERSONAL_COMM_REF",
				manuscript: "UNPUBLISHED_REF",
				blogPost: "FORUM_REF",
				forumPost: "FORUM_REF",
				bill: "BILL_REF",
				statute: "LAW_REF",
				hearing: "HEARING_REF",
				'case': "COURT_REF",
				map: "MAP_REF",
				film: "FILM_REF",
				videoRecording: "FILM_REF",
				audioRecording: "MUSIC_REF",
				computerProgram: "PROGRAM_REF"
			},
			fields: {
				abstractNote: "abstract",
				applicationNumber: "applicationNumber",
				assignee: "assignees",
				billNumber: "docNumber",
				blogTitle: "publication",
				bookTitle: "publication",
				caseName: "title",
				code: "seriesTitle",
				codeNumber: "volume",
				codePages: "pages",
				codeVolume: "volume",
				committee: "committee",
				contributor: "authors",
				cosponsor: "authors",
				counsel: "authors",
				country: "country",
				court: "publisher",
				creators: "authors",
				date: "publicationDate",
				dateEnacted: "publicationDate",
				documentNumber: "docNumber",
				docketNumber: "docNumber",
				DOI: "doi",
				edition: "edition",
				editors: "editors",//creator+type=editors
				firstPage: "pages",
				forumTitle: "publication",
				history: "historicalTitle",
				ISBN: "isbn",
				ISSN: "issn",
				issue: "issue",
				issuingAuthority: "issuer",
				journalAbbreviation: "journalAbbrev",
				jurisdiction: "jurisdiction",
				language: "language",
				legislativeBody: "legislativeBody",
				nameOfAct: "title",
				number: "patentNumber",
				pages: "pages",
				place: "location",
				PMCID: "pmcid",
				PMID: "pmid",
				publicationTitle: "publication",
				publicLawNumber: "docNumber",
				publisher: "publisher",
				recipient: "recipients",
				reporter: "publication",
				reporterVolume: "volume",
				retrievedDate: "retrievedDate",
				section: "sectionNumber",
				sequenceNumber: "sequenceNumber",
				seriesEditors: "seriesEditors",
				seriesTitle: "seriesTitle",
				session: "legislativeSession",
				sponsor: "authors",
				subcommittee: "subcommittee",
				tags: "tags",
				title: "title",
				translator: "translator",//creator+type=translator
				type: "type",
				URL: "url",
				volume: "volume",
				scale: "scale"
			}
		}
		var flow = {
			fields: {
				"abstract": "abstr",
				"applicationNumber": "docIds.applicationNumber",
				"assignees": {"key": "contributors.assignees", "fn": handleAuthor},
				"authors": {"key": "authors", "fn": handleAuthor},
				"committee": "legal.committee",
				"docNumber": "legal.docNumber",
				"country": "publisher.location", // only Patent type has this, and Patent doesn't have Zotero's location field
				"doi": "docIds.doi",
				"edition": "series.edition",
				"editors": {"key": "contributors.editors", "fn": handleAuthor},
				"geographicLocation": "publication.geographicLocation",
				"historicalTitle": "legal.historicalTitle",
				"isbn": "publication.isbn",
				"issn": "publication.issn",
				"issue": "series.issue",
				"issuer": "publisher", // Patent has issuingAuthority, not publisher
				"journalAbbrev": "publication.abbrev",
				"jurisdiction": "legal.jurisdiction",
				"language": "language",
				"legislativeBody": "legal.legislativeBody",
				"legislativeSession": "legal.legislativeSession",
				"location": "publisher.location",
				"modifiedFields": "modifiedFields",
				"pages": "pages.rawPages",
				"patentNumber": "docIds.patentNumber",
				"PMCID": "docIds.pmcid",
				"PMID": "docIds.pmid",
				"publicationDate": "publicationDate.rawDate",
				"publication": "publication.title",
				"publisher": "publisher.name",
				"recipients": {"key": "contributors.recipients", "fn": handleAuthor},
				"retrievedDate": "retrievedDate.rawDate",
				"scale": "publication.scale",
				"sectionNumber": "legal.sectionNumber",
				"sequenceNumber": "legal.sequenceNumber",
				"seriesEditors": {"key": "series.editors", "fn": handleAuthor},
				"seriesTitle": "series.title",
				"subcommittee": "legal.subcommittee",
				"tags": "tags",
				"title": "title",
				"translator": {"key": "contributors.translator", "fn": handleAuthor},
				"type": "publisher.degreeType",
				"url": "url",
				"volume": "series.volume"
			}
		}

		function convert(item) {
			var converted = {}
			if (item.itemType) {//zotero
				converted.refType = zotero.itemType[item.itemType];
				if (!converted.refType)
					converted.refType = "GENERIC_REF";
				for (var field in item) {
					if (zotero.fields[field])
						converted[zotero.fields[field]] = item[field];
				}
			}
			else if (item.refType) {//flow
				converted.refType = item.refType;
				for (var field in item) {
					if (flow.fields[field]) {
						var key = flow.fields[field].key ? flow.fields[field].key : flow.fields[field],
							value = flow.fields[field].fn ? flow.fields[field].fn(item[field]) : item[field];
						if (key.indexOf(".") > 0) {//object
							var obj = key.split("."),
								tmp = converted;
							for (var i = 0; i < obj.length; i++) {
								if (!tmp[obj[i]])
									tmp[obj[i]] = {};
								if (i == obj.length - 1)
									tmp[obj[i]] = value;
								else
									tmp = tmp[obj[i]];
							}
						}
						else {
							converted[key] = value;
						}
					}
				}
			}
			return converted;
		}

		function tracking(field) {
			return flow.fields[field] ? flow.fields[field].key ? flow.fields[field].key : flow.fields[field] : "";
		}

		return {convert: convert, tracking: tracking};
	})();

	function handleAuthor(author) {
		return parseAuthor(authorNameList(author, "\n"));
	}

	function authorNameList(item, delimiter) {
		delimiter = delimiter || "; ";
		var authors = item ? (item.join ? item : [item]) : null;
		if (authors)
			authors = authors.map(function (a) {
				if (a.firstNames && a.lastName)
					return a.lastName.trim() + ", " + a.firstNames.join(' ').trim();
				else if (a.firstName && a.lastName)
					return a.lastName.trim() + ", " + a.firstName.trim();
				else if (a.lastName)
					return a.lastName.trim();
				else if (a.firstName)
					return a.firstName.trim();
				else if (a.firstNames)
					return a.firstNames.join(' ').trim();
				else if (a.rawName)
					return a.rawName.trim();
				else if (typeof(a) == "string")
					return a.trim();
			}).join(delimiter);
		return authors || "";
	}

	function parseAuthor(value) {
		if (value && value.split)
			return value.split(/\n/).map(function (item) {
				return {rawName: item};
			});
	}

	return {
		entry: entry,
		selection: selection,
		single: single,
		saveItems: saveItems
	};
})(), entry = SaveToFlow.entry, selection = SaveToFlow.selection, single = SaveToFlow.single, saveItems = SaveToFlow.saveItems;