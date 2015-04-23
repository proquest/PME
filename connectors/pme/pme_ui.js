
///// DO NOT EDIT this comment or anything above it. (The build script looks for the '/////' string and ignores anything above it)
// The sharedRefData object is located in the Flow codebase and gets copied into PME. If this object must be changed,
// update the file ref-type-fields.js in Flow and those changes will propagate to PME.

var SaveToFlow = (function() {
	var FLOW_SERVER = "https://flow.proquest.com",
		MODE = "DEBUG";

	function setSaveTimeout(doc,delay){
		delay = delay || 10000;
		if(delay == -1) {
			doc.getElementById("stf_container").setAttribute("not_loaded", "false");
			return;
		}
		else {
			doc.getElementById("stf_container").setAttribute("not_loaded", "true");
		}
		ZU.setTimeout(function () {
			var notLoaded = doc.getElementById("stf_container").getAttribute("not_loaded");
			if (notLoaded == "true") {
				//got stuck at done, has items, just something prevented the complete.
				Zotero.done();
				ZU.setTimeout(function () {
					var notLoaded = doc.getElementById("stf_container").getAttribute("not_loaded");
					if (notLoaded == "true") {
						doc.getElementById("stf_container").style.display = "none";
						doc.getElementById("stf_progress").style.display = "block";
						saveFailed(doc);
					}
				}, 10000);
			}
		}, delay);
	}

	function entry(doc, url) {
		if (doc && !doc.getElementById("stf_capture")) {
			style(doc);
			container(doc);

			ZU.setTimeout(function () {
				var className = doc.getElementById("stf_capture").className;
				doc.getElementById("stf_capture").className = (className ? className + " " : "") + "stf_show";
			}, 100);

			setSaveTimeout(doc);
		}
		return "Save to Flow Loaded"
	}

	function style(doc) {
		try {
			var style = [];
			style.push("@import url(//fonts.googleapis.com/css?family=Open+Sans:600,600italic,400,400italic,300,300italic);");
			style.push("#stf_capture {z-index:1000000000000009;box-sizing:border-box;position:fixed;right:-360px;top:0;bottom:0;width:360px;display:block;border:none;overflow:hidden;transition: all 1s ease;-webkit-transition: all 1s ease;-moz-transition: all 1s ease;}");
			style.push("#stf_capture.stf_show {right: 0px;}");
			style.push("#stf_capture * {-moz-box-sizing:border-box;box-sizing:border-box;margin:0;padding:0;background:transparent;font-family:'Open Sans',Arial,Verdana,Helvetica,sans-serif;font-size:12px;line-height:18px;font-style:normal;font-weight:normal;text-align:left; color:#f1f2f5}");
			style.push("#stf_capture img {display:inline;}");
			style.push("#stf_capture a {text-decoration:none;color:#73b9ff;}");
			style.push("#stf_capture .stf_clear {clear:both;margin-bottom:10px;}");
			style.push("#stf_capture .stf_status,#stf_capture .stf_download,#stf_capture .stf_error {height:72px;width:355px;background:#454a53;border-radius:4px;padding:20px;position:absolute;top:5px;right:5px;display:none;}");
			style.push("#stf_capture .stf_status,#stf_capture .stf_error {font-size:14px;font-weight:300;line-height:20px;}");
			style.push("#stf_capture .stf_status a {font-size:14px;font-weight:300;}");
			style.push("#stf_capture .stf_status button {position:absolute;top:0;right:0;font-size:13px;color:#fff;font-weight:300;text-align:center;color:#fff;width:auto;padding-left:20px;padding-right:20px;}");
			style.push("#stf_capture .stf_download {display:none;position:relative;right:0px;}");
			style.push("#stf_capture .stf_download .stf_download_info {text-align:left;margin:0 0 10px 2px;font-size:14px;font-weight:300;color:#fff;}");
			style.push("#stf_capture .stf_download .stf_download_bar {position:relative;width:315px;height:12px;background:rgb(0,115,161);border-radius:4px;}");
			style.push("#stf_capture .stf_download .stf_download_progress {position:absolute;height:12px;width:10px;background:rgb(0,154,211);border-radius:4px;}");
			style.push("#stf_capture #stf_container {z-index:1;background:#454a53;position:absolute;top:0;bottom:0;width:360px;}");
			style.push("#stf_capture #stf_container #stf_processing {padding:0 20px;font-size:14px;text-align:center;z-index:2;position:absolute;top:81px;}");
			style.push("#stf_capture.stf_listView:not(.toggle) #stf_container #stf_processing {display:none;}");
			style.push("#stf_capture.stf_listView.stf_singleView.stf_toggle #stf_container #stf_processing {display:block;top:91px;}");
			style.push("#stf_capture.stf_singleView:not(.stf_toggle) #stf_container #stf_processing {display:none;}");
			style.push("#stf_capture .stf_warn {display:none;color:#d1d2d5;margin:10px 20px 20px 20px;padding:6px 10px;background:#585c65;border-radius:3px;box-shadow:inset 2px 3px 3px rgba(0,0,0,0.07);width:320px;}");
			style.push("#stf_capture .stf_ui_logo_wrapper {width:360px;height:81px;background:#454a53;padding-top:10px;position:absolute;top:0px;right:0px;z-index:100;text-align:center;}");
			style.push("#stf_capture.stf_listView .stf_ui_logo_wrapper {border-bottom:1px solid #585c65}");
			style.push("#stf_capture .stf_ui_logo_wrapper .stf_selected_header {color:#999;font-size:14px;}");
			style.push("#stf_capture.stf_listView .stf_ui_logo_wrapper .stf_selected_header {display:inline;}");
			style.push("#stf_capture .stf_ui_logo_wrapper .stf_left {display:none;position:absolute;left:18px;top:51px;margin:0;line-height:20px;}");
			style.push("#stf_capture .stf_ui_logo_wrapper .stf_right {display:none;position:absolute;right:18px;top:51px;margin:0;line-height:20px;font-size:13px;}");
			style.push("#stf_capture .stf_ui_logo_wrapper .stf_cancel,#stf_capture .stf_error .stf_cancel {position:absolute;right:10px;top:0px;cursor:pointer;opacity:0.65;padding:10px;}");
			style.push("#stf_capture.stf_listView:not(.stf_singleView) .stf_ui_logo_wrapper #stf_select_all {display:inline;}");
			style.push("#stf_capture .stf_ui_logo_wrapper .stf_single_nav img {cursor:pointer;padding:10px;opacity:0.65;}");
			style.push("#stf_capture .stf_ui_logo_wrapper .stf_single_nav img.stf_disabled {cursor:default;opacity:0.2;}");
			style.push("#stf_capture.stf_listView.stf_singleView .stf_ui_logo_wrapper .stf_single_nav {display:inline;}");
			style.push("#stf_capture.stf_singleView:not(.stf_listView) .stf_ui_logo_wrapper {height:30px}");
			style.push("#stf_capture .stf_button_pane {width:360px;height:81px;position:absolute;bottom:0px;right:0px;background:#454a53;}");
			style.push("#stf_capture .stf_button_pane button {display:none;}");
			style.push("#stf_capture.stf_listView .stf_button_pane button {display:inline;opacity:0.6;}");
			style.push("#stf_capture.stf_listView .stf_button_pane button.stf_enable {opacity:1.0;}");
			style.push("#stf_capture.stf_singleView.stf_listView .stf_button_pane button {background:rgb(85,91,103);border:1px solid rgb(109,115,127);}");
			style.push("#stf_capture.stf_singleView .stf_button_pane button {display:inline;opacity:1.0;}");
			style.push("#stf_capture button {color:#fff;background:#0091c5;border:none;width:180px;height:32px;font-size:14px;margin:20px;margin-left:85px;text-align:center;font-weight:normal;cursor:pointer;border-radius:3px}");
			style.push("#stf_capture #stf_ui_main::-webkit-scrollbar,#stf_capture .stf_ui_itemlist::-webkit-scrollbar,#stf_capture #stf_ui_main .stf_val::-webkit-scrollbar {background:transparent;width:8px;}");
			style.push("#stf_capture #stf_ui_main::-webkit-scrollbar-thumb,#stf_capture .stf_ui_itemlist::-webkit-scrollbar-thumb,#stf_capture #stf_ui_main .stf_val::-webkit-scrollbar-thumb {background:#96989e;border-radius:5px;}");
			style.push("#stf_capture .stf_ui_itemlist {display:none;position:absolute;top:81px;bottom:81px;padding:20px 18px;background:#454a53;width:360px;overflow-y:auto;}");
			style.push("#stf_capture.stf_listView:not(.stf_singleView) .stf_ui_itemlist {display:block;}");
			style.push("#stf_capture .stf_ui_itemlist .stf_ui_item {position:relative;margin-bottom:5px;}");
			style.push("#stf_capture .stf_ui_itemlist .stf_ui_item .stf_item_authorlist {color:#999;padding:2px 30px 4px 23px;line-height:16px;}");
			style.push("#stf_capture .stf_ui_itemlist .stf_ui_item label {cursor:pointer;padding:2px 30px 0 23px;display:inline-block}");
			style.push("#stf_capture .stf_ui_itemlist .stf_ui_item input[type=checkbox] {position:absolute;left:0;top:5px}");
			style.push("#stf_capture .stf_ui_itemlist .stf_ui_item img.stf_pdf {float:left;margin-right:5px;}");
			style.push("#stf_capture .stf_ui_itemlist .stf_ui_item img.stf_detail {position:absolute;right:0px;top:5px;cursor:pointer}");
			style.push("#stf_capture #stf_ui_main {display:none;background:#454a53;position:absolute;top:81px;bottom:81px;width:360px;overflow-y:auto;padding:20px 0px;overflow-y:auto;overflow-x:hidden;}");
			style.push("#stf_capture.stf_singleView:not(.stf_toggle) #stf_ui_main {display:block;}");
			style.push("#stf_capture.stf_singleView:not(.stf_listView) #stf_ui_main {top:51px;}");
			style.push("#stf_capture #stf_ui_main .stf_textposition {position:relative}");
			style.push("#stf_capture #stf_ui_main span.stf_empty {color:#686d76;position:absolute;left:31px;top:7px;line-height:16px;}");
			style.push("#stf_capture #stf_ui_main span.stf_author {color:#686d76;position:absolute;left:31px;bottom:7px;line-height:16px;display:none;}");
			style.push("#stf_capture #stf_ui_main .stf_lbl {color:#999;margin:10px 20px 0px 30px;}");
			style.push("#stf_capture #stf_ui_main .stf_val {box-sizing:border-box;overflow-x:hidden;color:#d1d2d5;margin:0px 20px;padding:6px 10px;background:#383e46;border:1px solid #565b64;width:320px;border-radius:3px;box-shadow:inset 2px 3px 3px rgba(0,0,0,0.07);overflow:hidden;outline:none;resize:none;}");
			style.push("#stf_capture #stf_ui_main img.stf_lbl {margin-top:0px;margin-left:25px;float:left;margin-bottom:20px;}");
			style.push("#stf_capture #stf_ui_main .stf_attach {margin-top:0px;vertical-align:middle;}");
			style.push("#stf_capture #stf_ui_main .stf_input_container {display:inline-block;width:265px;display:inline;zoom:1;}");
			style.push("#stf_capture #stf_ui_main .stf_details {border-bottom:1px solid #666;margin-bottom:20px;margin-left:20px;margin-right:20px;padding:10px;}");
			style.push("#stf_capture #stf_ui_main .stf_header {font-size:14px;margin-top:0;}");
			style.push("#stf_capture #stf_ui_main .stf_dropdown {margin:10px 20px 20px 20px;width:320px;height:28px;background:#f1f2f5;border:1px solid #565b64;color:#333;}");
			style.push("#stf_capture #stf_ui_main .stf_dropdown option {background:#f1f2f5;color:#333;}");
			style.push("#stf_capture #stf_ui_main .stf_webref {display:none;}");
			style.push("#stf_capture #stf_reference_json {display:none;}");
			style.push("#stf_debug {z-index:1000000000000009;position:absolute;top:0;left:0;width:400px;min-height:100%;border:1px solid #333;background:#fff;}");
			style.push("#stf_debug div {margin:10px; border-bottom:1px solid #ccc;}");

			var styleElement = doc.createElement("style");
			styleElement.id = "stf_style";
			styleElement.innerHTML = style.join("");
			doc.head.appendChild(styleElement);
		}
		catch (e) {
			error(doc, e);
		}
	}

	function container(doc) {
		try {
			var container = doc.createElement("div");
			container.id = "stf_capture";
			container.className = "notranslate";
			container.innerHTML =
				'<iframe frameborder="0" id="stf_tracking_iframe" name="stf_tracking_iframe" allowtransparency="true" width="1" height="1"></iframe>' +
				'<form method="post" action="' + FLOW_SERVER + '/savetoflow/tracking/" accept-charset="UTF-8" enctype="application/x-www-form-urlencoded" target="stf_tracking_iframe" name="stf_tracking_form" id="stf_tracking_form">' +
				'<input type="hidden" name="found" id="stf_track_found">' +
				'<input type="hidden" name="selected" id="stf_track_selected">' +
				'<input type="hidden" name="url" id="stf_track_url">' +
				'<input type="hidden" name="modified" id="stf_track_modified">' +
				'<input type="hidden" name="citation" id="stf_track_citation">' +
				'</form>' +
				'<div class="stf_status" id="stf_status"></div>' +
				'<div class="stf_error" id="stf_error"></div>' +
				'<div class="stf_download" id="stf_progress">' +
				'<div class="stf_download_info">Saving to Flow</div>' +
				'<div class="stf_download_bar"><div class="stf_download_progress" id="stf_download_progress"></div></div>' +
				'</div>' +
				'<div id="stf_container">' +
				'<div class="stf_ui_logo_wrapper">' +
				'<img src="' + FLOW_SERVER + '/public/img/PQ-StF.png"/><img src="' + FLOW_SERVER + '/public/img/close.png" class="stf_cancel" id="stf_cancel"/>' +
				'<p class="stf_selected_header stf_left" id="stf_header_text">Select articles</p>' +
				'<a class="stf_ui_pick_all all stf_right" href="javascript:void(0);" id="stf_select_all">Select All</a>' +
				'<span class="stf_right stf_single_nav">' +
				'<img src="' + FLOW_SERVER + '/public/img/arrow-up.png" class="prev" id="stf_single_prev"/>' +
				'<img src="' + FLOW_SERVER + '/public/img/arrow-down.png" class="next" id="stf_single_next"/>' +
				'</span>' +
				'</div>' +
				'<div id="stf_processing">Finding references</div>' +
				'<div id="stf_ui_main">' +
				'<div class="stf_webref stf_warn" id="stf_webref">Flow couldn\'t find much here, but you can enter the missing metadata below. </div>' +
				'<div class="stf_meta" id="stf_meta"></div>' +
				'</div>' +
				'<div class="stf_ui_itemlist" id="stf_ui_itemlist"></div>' +
				'<div class="stf_button_pane"><button class="stf_btn_save" disabled="disabled" id="stf_save_button">Save to Flow</button></div>' +
				'</div>'
			doc.body.appendChild(container);
			attachCloseEvent(doc, "stf_cancel");
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
			var elem = doc.getElementById("stf_capture");
			if (elem) {
				var className = elem.className;
				elem.className = className.replace("stf_show", "");
				ZU.setTimeout(function () {
					try {
						//need to recheck if the element still there, it could've been removed by now
						var elem = doc.getElementById("stf_capture");
						if (elem) {
							doc.body.removeChild(elem);
							doc.head.removeChild(doc.getElementById("stf_style"));
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
		var debug = doc.getElementById("stf_debug")
		if (!debug) {
			doc.body.innerHTML += '<div id="stf_debug"></div>';
			debug = doc.getElementById("stf_debug")
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
				lineNumber: e.lineNumber//,
				//url:url
			}
			if (MODE == "debug") {
				debug(doc, JSON.stringify(errorObj));
			}
			else
				ZU.HTTP.doPost("http://ec2-54-80-213-189.compute-1.amazonaws.com:8080/stferror", JSON.stringify(errorObj), function () {
				}, {"Content-Type": "application/json"});//send to server to be logged
		}
		catch (e) {
		}
	}

	function tracking(doc, tracking) {
		try {
			doc.getElementById("stf_track_found").value = tracking.found;
			doc.getElementById("stf_track_selected").value = tracking.selected;
			doc.getElementById("stf_track_url").value = tracking.url;
			doc.getElementById("stf_track_citation").value = tracking.citation;
			doc.getElementById("stf_track_modified").value = JSON.stringify(tracking.modified);
			//doc.getElementById("stf_tracking_form").submit();
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
		doc.getElementById("stf_container").style.display = "none";
		doc.getElementById("stf_progress").style.display = "block";
	}

	function completeProgress(doc) {
		var stf = doc.getElementById("stf_capture"),
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
			var errorDialog = doc.getElementById("stf_error");
			doc.getElementById("stf_progress").style.display = "none";
			errorDialog.style.display = "block";
			errorDialog.innerHTML = '<img src="' + FLOW_SERVER + '/public/img/close.png" class="stf_cancel" id="stf_err_cancel"/>We\'re sorry, we were unable to save to Flow. We tried, but came up empty.';
			attachCloseEvent(doc, "stf_err_cancel");
		}
		catch (e) {
			error(doc, e);
		}
	}

	function attachmentFailed(doc) {
		progressDialog(doc, 1);//allow completion
		try {
			var errorDialog = doc.getElementById("stf_error");
			errorDialog.style.display = "block";
			errorDialog.style.top = '85px';
			errorDialog.innerHTML = "We're sorry, we were unable to get some of the full-text. We tried, but came up empty.";
			errorDialog.innerHTML = '<img src="' + FLOW_SERVER + '/public/img/close.png" class="stf_cancel" id="stf_err_cancel"/>We\'re sorry, we were unable to get some of the full-text. We tried, but came up empty.';
			attachCloseEvent(doc, "stf_err_cancel");
		}
		catch (e) {
			error(doc, e);
		}
		completeProgress(doc);
	}

	function progressDialog(doc, ratio) {
		var stf = doc.getElementById("stf_capture"),
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

		doc.getElementById("stf_download_progress").style.width = Math.round(ratio * 315) + "px";
		if (ratio == 1)
			completeDialog(doc);
	}

	function completeDialog(doc) {
		try {
			var count = doc.getElementById("stf_capture").getAttribute("data-saving-count"),
				status = doc.getElementById("stf_status"),
				countText = count ? count + " articles saved." : "1 article saved.";

			doc.getElementById("stf_progress").style.display = "none";
			status.style.display = "block";
			status.innerHTML = countText + '<form method="get" action="' + FLOW_SERVER + '/library/recent/" target="ProQuestFlow"><button id="stf_view_button" type="submit">View in Flow</button></form>';

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
			var status = doc.getElementById("stf_status");
			doc.getElementById("stf_progress").style.display = "none";
			status.style.display = "block";
			status.innerHTML = 'You must be logged in. <form method="get" action="' + FLOW_SERVER + '" target="ProQuestFlow"><button id="stf_view_button" type="submit">Log in now</button></form>';

			ZU.setTimeout(function () {
				try {
					status.style.display = "none";
					doc.getElementById("stf_container").style.display = "block";
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
			var container = doc.getElementById("stf_ui_itemlist"), stf = doc.getElementById("stf_capture"), ix = 1;
			if (container.getElementsByClassName("stf_ui_item").length > 0) {
				Z.debug("selection called after already loaded.");
				return;
			}
			stf.className = " stf_listView";
			for (itemId in items) {
				try {
					var item = doc.createElement("div");
					item.className = "stf_ui_item";
					item.setAttribute("data-id", itemId);
					item.setAttribute("data-ix", ix++);
					item.addEventListener("click", function (e) {
						try {
							if (e.target.className == "stf_detail") {//go to reference
								stf.className += " stf_singleView stf_toggle";
								doc.getElementById("stf_processing").innerHTML = "Loading reference";
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
					item.innerHTML = '<p><input type="checkbox" id="stf_cbx_' + itemId + '"/><label for="stf_cbx_' + itemId + '">' + items[itemId] + '</label></p>'
						+ '<img src="' + FLOW_SERVER + '/public/img/oval-arrow-grey.png" class="stf_detail"/>';
					container.appendChild(item);
				}
				catch (e) {
					error(doc, e);
				}
			}
			stf.setAttribute("data-count", ix - 1);
			var savedReferences = {};

			doc.getElementById("stf_select_all").addEventListener("click", function (e) {
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
			doc.getElementById("stf_single_next").addEventListener("click", function (e) {
				try {
					var item_id = stf.getAttribute("data-id");
					savedReferences[item_id] = getModified(doc);
					move(doc, url, callback, items, 1, savedReferences);
				}
				catch (e) {
					error(doc, e);
				}
			}, true);
			doc.getElementById("stf_single_prev").addEventListener("click", function (e) {
				try {
					var item_id = stf.getAttribute("data-id");
					savedReferences[item_id] = getModified(doc);
					move(doc, url, callback, items, -1, savedReferences);
				}
				catch (e) {
					error(doc, e);
				}
			}, true);
			doc.getElementById("stf_save_button").addEventListener("click", function (e) {
				try {
					var stf = doc.getElementById("stf_capture");
					if (stf.className.indexOf("stf_listView") >= 0 && stf.className.indexOf("singleView") >= 0) {
						var item_id = stf.getAttribute("data-id");
						savedReferences[item_id] = getModified(doc);
						stf.className = "stf_listView stf_show";//save and back to list
						doc.getElementById("stf_header_text").innerHTML = "Select articles";
						setListButton(doc);
					}
					else if (stf.className.indexOf("stf_listView") >= 0) {
						stf.setAttribute("data-saving", "true");
						stf.setAttribute("data-saving-count", 1);
						startProgress(doc);
						var cbx = doc.getElementById("stf_ui_itemlist").getElementsByTagName("input"),
							count = 0,
							modified = [],
							list = {};
						for (var i = 0; i < cbx.length; i++) {
							if (cbx[i].checked) {
								count++;
								var item_id = cbx[i].id.replace("stf_cbx_", "");
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
		var cbx = doc.getElementById("stf_ui_itemlist").getElementsByTagName("input"),
			stf = doc.getElementById("stf_capture"),
			id = stf.getAttribute("data-id");
		for (var i = 0; i < cbx.length; i++) {
			try {
				if (cbx[i].id == "stf_cbx_" + id) {
					if (i + offset < 0 || i + offset >= cbx.length)
						return;
					stf.className += " stf_toggle";
					var thisItem = {}, thisItemId = cbx[i + offset].id.replace("stf_cbx_", "");
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
			var cbx = doc.getElementById("stf_ui_itemlist").getElementsByTagName("input"), count = 0;
			for (var i = 0; i < cbx.length; i++) {
				if (check !== undefined)
					cbx[i].checked = check;
				if (cbx[i].checked)
					count++;
			}
			var button = doc.getElementById("stf_save_button");
			if (count > 0) {
				button.disabled = false;
				button.className = "stf_btn_save stf_enable";
			}
			else {
				button.disabled = true;
				button.className = "stf_btn_save";
			}
			button.innerHTML = "Save to Flow (" + count + ")";
		}
		catch (e) {
			error(doc, e);
		}
	}

	function singleHeader(doc, refType, attachments) {
		try {
			var stf = doc.getElementById("stf_capture"),
				containerClass = stf.className,
				output = [];
			containerClass = containerClass.replace(" stf_toggle", "");
			if (containerClass.indexOf("stf_singleView") < 0)
				stf.className = containerClass + " stf_singleView";
			else
				stf.className = containerClass;
			if (containerClass.indexOf("stf_listView") >= 0) {
				var ix = parseInt(stf.getAttribute("data-ix")),
					count = parseInt(stf.getAttribute("data-count"));
				doc.getElementById("stf_header_text").innerHTML = "Article details - " + ix + " of " + count;
				doc.getElementById("stf_single_prev").className = "stf_prev" + (ix <= 1 ? " stf_disabled" : "");
				doc.getElementById("stf_single_next").className = "stf_next" + (ix >= count ? " stf_disabled" : "");
				doc.getElementById("stf_save_button").innerHTML = "Done editing";
			}
			else
				output.push("<div class='stf_lbl stf_header'>Save As</div>");

			output.push("<select id='reference_type' class='stf_dropdown'>");
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
				output.push("<img src='" + FLOW_SERVER + "/public/img/" + (pdf ? "pdf" : "web") + ".png' class='stf_lbl'/><span class='stf_input_container'><label for='stf_attach_web' class='stf_attach'><input type='checkbox' id='stf_attach' checked='checked' class='stf_attach'> <span>We found the article, want to save it?</span></label></span>");
			}
			else if (containerClass.indexOf("stf_listView") == -1) {
				output.push("<img src='" + FLOW_SERVER + "/public/img/web.png' class='stf_lbl'/><span class='stf_input_container'><label for='stf_attach_web' class='stf_attach'><input type='checkbox' id='stf_attach' class='stf_attach'> <span>Save the content of this web page</span></label></span>");
			}

			output.push("<div id='stf_ref_type_spec' class='stf_clear'>");
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
			var container = doc.getElementById("stf_meta"),
				stf = doc.getElementById("stf_capture");
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
					doc.getElementById("stf_webref").style.display = "block";
			}

			var output = singleHeader(doc, item.refType, item.attachments)
				.concat(createFields(doc, item));
			output.push("</div>");

			autoSize.removeEvents(doc);

			container.innerHTML = output.join('');

			doc.getElementById("stf_save_button").disabled = false;

			autoSize.addEvents(doc);

			if (doc.getElementById("stf_capture").getAttribute("events_attached") != "true") {
				doc.getElementById("reference_type").addEventListener("change", function (e) {
					try {
						//get current field values (may be editted)
						autoSize.removeEvents(doc);
						item = getModified(doc);
						doc.getElementById("stf_ref_type_spec").innerHTML = createFields(doc, item).join('');
						autoSize.addEvents(doc);
					}
					catch (ex) {
						error(doc, ex);
					}
				}, true);

				if (stf.className.indexOf("stf_singleView") >= 0 && stf.className.indexOf("stf_listView") == -1) {
					doc.getElementById("stf_save_button").addEventListener("click", function (e) {
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
				doc.getElementById("stf_capture").setAttribute("events_attached", "true")
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
			item = JSON.parse(doc.getElementById("stf_reference_json").innerHTML);
		}
		catch (e) {
			error(doc, e);
		}
		try {
			reference.refType = doc.getElementById("reference_type").value;
			reference.modifiedFields = item.modifiedFields ? item.modifiedFields : [];
			for (var index = 0; index < labels.order.length; index++) {
				try {
					var elem = doc.getElementById("stf_" + labels.order[index]);
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
			reference.attach = doc.getElementById("stf_attach") && doc.getElementById("stf_attach").checked;
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
			reference.attach = useItem ? item.attachments.length : doc.getElementById("stf_attach").checked;
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
							"<div class='stf_lbl'>" +
								label +
								(field == "authors" ? ' ("Last name, First names" each on new line)' : '') +
							"</div>" +
							"<textarea class='stf_val' id='stf_" + field + "' rows='1' placeholder='" +
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
			output.push("<div id='stf_reference_json'>" + JSON.stringify(item) + "</div>");
			return output;
		}
		catch (e) {
			error(doc, e);
		}
	}

	var autoSize = (function () {
		function autoSize(text) {
			var textHeight = 102;
			if (text.scrollHeight < textHeight || text.id == "stf_authors") {
				text.style.height = 'auto';
				var height = (text.scrollHeight + (text.id == "stf_authors" ? 18 : 0))
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
				var text = doc.getElementById("stf_" + value);
				if (text) {
					text.removeEventListener("focus", focusEvent);
					text.removeEventListener("blur", blurEvent);
				}
			}
		}

		function addEvents(doc) {
			for (var index = 0; index < labels.order.length; index++) {
				var value = labels.order[index];
				var text = doc.getElementById("stf_" + value);
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
				'title', 'historicalTitle', 'authors', 'editors', 'assignees', 'recipients', 'legislativeBody',
				'legislativeSession', 'docNumber', 'sectionNumber', 'subsection', 'publication', 'publicationDate',
				'seriesTitle', 'seriesEditors', 'publisher', 'department', 'location', 'edition', 'volume', 'issue', 'pages',
				'doi', 'issn', 'isbn', 'type', 'url', 'retrievedDate', 'abstract'
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
				bill: "BILL_REF"
			},
			fields: {
				abstractNote: "abstract",
				applicationNumber: "applicationNumber",
				assignee: "assignees",
				billNumber: "docNumber",
				blogTitle: "publication",
				bookTitle: "publication",
				code: "seriesTitle",
				codePages: "pages",
				codeVolume: "volume",
				contributor: "authors",
				cosponsor: "authors",
				country: "country",
				creators: "authors",
				date: "publicationDate",
				DOI: "doi",
				edition: "edition",
				editors: "editors",//creator+type=editors
				forumTitle: "publication",
				history: "historicalTitle",
				ISBN: "isbn",
				ISSN: "issn",
				issue: "issue",
				issuingAuthority: "issuer",
				journalAbbreviation: "journalAbbrev",
				language: "language",
				legislativeBody: "legislativeBody",
				number: "patentNumber",
				pages: "pages",
				place: "location",
				PMCID: "pmcid",
				PMID: "pmid",
				publicationTitle: "publication",
				publisher: "publisher",
				recipient: "recipients",
				retrievedDate: "retrievedDate",
				section: "section",
				seriesEditors: "seriesEditors",
				seriesTitle: "seriesTitle",
				session: "legislativeSession",
				sponsor: "authors",
				title: "title",
				translator: "translator",//creator+type=translator
				type: "type",
				URL: "url",
				volume: "volume"
			}
		}
		var flow = {
			fields: {
				"abstract": "abstr",
				"applicationNumber": "docIds.applicationNumber",
				"assignees": {"key": "contributors.assignees", "fn": handleAuthor},
				"authors": {"key": "authors", "fn": handleAuthor},
				"docNumber": "legal.docNumber",
				"country": "publisher.location", // only Patent type has this, and Patent doesn't have Zotero's location field
				"doi": "docIds.doi",
				"edition": "series.edition",
				"editors": {"key": "contributors.editors", "fn": handleAuthor},
				"historicalTitle": "legal.historicalTitle",
				"isbn": "publication.isbn",
				"issn": "publication.issn",
				"issue": "series.issue",
				"issuer": "publisher", // Patent has issuingAuthority, not publisher
				"journalAbbrev": "publication.abbrev",
				"language": "language",
				"legislativeBody": "legal.legislativeBody",
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
				"section": "legal.sectionNumber",
				"seriesEditors": {"key": "series.editors", "fn": handleAuthor},
				"seriesTitle": "series.title",
				"legislativeSession": "legal.legislativeSession",
				"title": "title",
				"translator": {"key": "contributors.translator", "fn": handleAuthor},
				"type": "subType",
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