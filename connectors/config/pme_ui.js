function entry(doc,url){
	style(doc);
	container(doc);
	return "Save to Flow Loaded"
}

function style(doc){
	var style = [];
	style.push("@import url(//fonts.googleapis.com/css?family=Open+Sans:600,600italic,400,400italic,300,300italic);");
	style.push("#stf_capture {z-index:1000000000000009;box-sizing:border-box;position:fixed;right:-360px;top:0;bottom:0;width:360px;display:block;border:none;overflow:hidden;transition: all 1s ease;-webkit-transition: all 1s ease;-moz-transition: all 1s ease;}");
	style.push("#stf_capture.show {right: 0px;}");
    style.push("#stf_capture * {-moz-box-sizing:border-box;box-sizing:border-box;margin:0;padding:0;background:transparent;font-family:'Open Sans',Arial,Verdana,Helvetica,sans-serif;font-size:12px;line-height:18px;font-style:normal;font-weight:normal;text-align:left; color:#f1f2f5}");
	style.push("#stf_capture img {display:inline;}");
	style.push("#stf_capture a {text-decoration:none;color:#73b9ff;}");
	style.push("#stf_capture .clear {clear:both;margin-bottom:10px;}");
	style.push("#stf_capture .stf_status,#stf_capture .stf_download {height:72px;width:355px;background:#454a53;border-radius:4px;padding:20px;position:absolute;top:5px;right:5px;display:none;}");
	style.push("#stf_capture .stf_status {font-size:14px;font-weight:300;line-height:32px;}");
	style.push("#stf_capture .stf_status a {font-size:14px;font-weight:300;}");
	style.push("#stf_capture .stf_status button {position:absolute;top:0;right:0;font-size:13px;color:#fff;font-weight:300;text-align:center;color:#fff;width:auto;padding-left:20px;padding-right:20px;}");
	style.push("#stf_capture .stf_download {display:none;position:relative;right:0px;}");
	style.push("#stf_capture .stf_download .stf_download_info {text-align:left;margin:0 0 10px 2px;font-size:14px;font-weight:300;color:#fff;}");
	style.push("#stf_capture .stf_download .stf_download_bar {position:relative;width:315px;height:12px;background:rgb(0,115,161);border-radius:4px;}");
	style.push("#stf_capture .stf_download .stf_download_progress {position:absolute;height:12px;width:10px;background:rgb(0,154,211);border-radius:4px;}");
	style.push("#stf_capture #stf_container {z-index:1;background:#454a53;position:absolute;top:0;bottom:0;width:360px;}");
	style.push("#stf_capture #stf_container #stf_processing {padding:0 20px;font-size:14px;text-align:center;z-index:2;position:absolute;top:81px;}");
	style.push("#stf_capture.listView #stf_container #stf_processing {display:none;}");
	style.push("#stf_capture.singleView #stf_container #stf_processing {display:none;}");
	style.push("#stf_capture .warn {display:none;color:#d1d2d5;margin:10px 20px 20px 20px;padding:6px 10px;background:#585c65;border-radius:3px;box-shadow:inset 2px 3px 3px rgba(0,0,0,0.07);width:320px;}");
	style.push("#stf_capture .stf_ui_logo_wrapper {width:360px;height:81px;background:#454a53;padding-top:10px;position:absolute;top:0px;right:0px;z-index:100;text-align:center;}");
	style.push("#stf_capture.listView .stf_ui_logo_wrapper {border-bottom:1px solid #585c65}");
	style.push("#stf_capture .stf_ui_logo_wrapper .selected_header {color:#999;font-size:14px;}");
	style.push("#stf_capture.listView .stf_ui_logo_wrapper .selected_header {display:inline;}");
	style.push("#stf_capture .stf_ui_logo_wrapper .left {display:none;position:absolute;left:18px;top:51px;margin:0;line-height:20px;}");
	style.push("#stf_capture .stf_ui_logo_wrapper .right {display:none;position:absolute;right:18px;top:51px;margin:0;line-height:20px;font-size:13px;}");
	style.push("#stf_capture .stf_ui_logo_wrapper .stf_cancel {position:absolute;right:10px;top:0px;cursor:pointer;opacity:0.65;padding:10px;}");
	style.push("#stf_capture.listView:not(.singleView) .stf_ui_logo_wrapper #stf_select_all {display:inline;}");
	style.push("#stf_capture .stf_ui_logo_wrapper .single_nav img {cursor:pointer;padding:10px;opacity:0.65;}");
	style.push("#stf_capture .stf_ui_logo_wrapper .single_nav img.disabled {cursor:default;opacity:0.2;}");
	style.push("#stf_capture.listView.singleView .stf_ui_logo_wrapper .single_nav {display:inline;}");
	style.push("#stf_capture.singleView:not(.listView) .stf_ui_logo_wrapper {height:30px}");
	style.push("#stf_capture .stf_button_pane {width:360px;height:81px;position:absolute;bottom:0px;right:0px;background:#454a53;}");
	style.push("#stf_capture .stf_button_pane button {display:none;}");
	style.push("#stf_capture.listView .stf_button_pane button {display:inline;opacity:0.6;}");
	style.push("#stf_capture.listView .stf_button_pane button.enable {opacity:1.0;}");
	style.push("#stf_capture.singleView.listView .stf_button_pane button {background:rgb(85,91,103);border:1px solid rgb(109,115,127);}");
	style.push("#stf_capture.singleView .stf_button_pane button {display:inline;opacity:1.0;}");
	style.push("#stf_capture button {color:#fff;background:#0091c5;border:none;width:180px;height:32px;font-size:14px;margin:20px;margin-left:85px;text-align:center;font-weight:normal;cursor:pointer;border-radius:3px}");
	style.push("#stf_capture #stf_ui_main::-webkit-scrollbar,#stf_capture .stf_ui_itemlist::-webkit-scrollbar,#stf_capture #stf_ui_main .stf_val::-webkit-scrollbar {background:transparent;width:8px;}");
	style.push("#stf_capture #stf_ui_main::-webkit-scrollbar-thumb,#stf_capture .stf_ui_itemlist::-webkit-scrollbar-thumb,#stf_capture #stf_ui_main .stf_val::-webkit-scrollbar-thumb {background:#96989e;border-radius:5px;}");
	style.push("#stf_capture .stf_ui_itemlist {display:none;position:absolute;top:81px;bottom:81px;padding:20px 18px;background:#454a53;width:360px;overflow-y:auto;}");
	style.push("#stf_capture.listView:not(.singleView) .stf_ui_itemlist {display:block;}");
	style.push("#stf_capture .stf_ui_itemlist .stf_ui_item {position:relative;margin-bottom:5px;}");
	style.push("#stf_capture .stf_ui_itemlist .stf_ui_item .stf_item_authorlist {color:#999;padding:2px 30px 4px 23px;line-height:16px;}");
	style.push("#stf_capture .stf_ui_itemlist .stf_ui_item label {cursor:pointer;padding:2px 30px 0 23px;display:inline-block}");
	style.push("#stf_capture .stf_ui_itemlist .stf_ui_item input[type=checkbox] {position:absolute;left:0;top:5px}");
	style.push("#stf_capture .stf_ui_itemlist .stf_ui_item img.pdf {float:left;margin-right:5px;}");
	style.push("#stf_capture .stf_ui_itemlist .stf_ui_item img.detail {position:absolute;right:0px;top:5px;cursor:pointer}");
	style.push("#stf_capture #stf_ui_main {display:none;background:#454a53;position:absolute;top:81px;bottom:81px;width:360px;overflow-y:auto;padding:20px 0px;overflow-y:auto;overflow-x:hidden;}");
	style.push("#stf_capture.singleView #stf_ui_main {display:block;}");
	style.push("#stf_capture.singleView:not(.listView) #stf_ui_main {top:51px;}");
	style.push("#stf_capture #stf_ui_main .textposition {position:relative}");
	style.push("#stf_capture #stf_ui_main span.empty {color:#686d76;position:absolute;left:31px;top:7px;line-height:16px;}");
	style.push("#stf_capture #stf_ui_main span.author {color:#686d76;position:absolute;left:31px;bottom:7px;line-height:16px;display:none;}");
	style.push("#stf_capture #stf_ui_main .stf_lbl {color:#999;margin:10px 20px 0px 30px;}");
	style.push("#stf_capture #stf_ui_main .stf_val {box-sizing:border-box;overflow-x:hidden;color:#d1d2d5;margin:0px 20px;padding:6px 10px;background:#383e46;border:1px solid #565b64;width:320px;border-radius:3px;box-shadow:inset 2px 3px 3px rgba(0,0,0,0.07);overflow:hidden;outline:none;resize:none;}");
	style.push("#stf_capture #stf_ui_main img.stf_lbl {margin-top:0px;margin-left:25px;float:left;margin-bottom:20px;}");
	style.push("#stf_capture #stf_ui_main .stf_attach {margin-top:0px;vertical-align:middle;}");
	style.push("#stf_capture #stf_ui_main .input_container {display:inline-block;width:265px;display:inline;zoom:1;}");
	style.push("#stf_capture #stf_ui_main .details {border-bottom:1px solid #666;margin-bottom:20px;margin-left:20px;margin-right:20px;padding:10px;}");
	style.push("#stf_capture #stf_ui_main .header {font-size:14px;margin-top:0;}");
	style.push("#stf_capture #stf_ui_main .stf_dropdown {margin:10px 20px 20px 20px;width:320px;height:28px;background:#f1f2f5;border:1px solid #565b64;color:#333;}");
	style.push("#stf_capture #stf_ui_main .stf_dropdown option {background:#f1f2f5;color:#333;}");
	style.push("#stf_capture #stf_ui_main .stf_webref {display:none;}");

	var styleElement = doc.createElement("style");
	styleElement.innerHTML = style.join("");
	doc.head.appendChild(styleElement);
}

function container(doc){
	var container = doc.createElement("div"), FLOW_SERVER = "http://flow.proquest.com";
	container.id = "stf_capture";
    container.className = "notranslate";
	container.innerHTML =
		'<div class="stf_status" id="stf_status"></div>' +
		'<div class="stf_download" id="stf_progress">' +
			'<div class="stf_download_info">Saving to Flow</div>' +
			'<div class="stf_download_bar"><div class="stf_download_progress" id="stf_download_progress"></div></div>' +
		'</div>' +
		'<div id="stf_container">' +
			'<div class="stf_ui_logo_wrapper">' +
				'<img src="' + FLOW_SERVER + '/public/img/PQ-StF.png"/><img src="' + FLOW_SERVER + '/public/img/close.png" class="stf_cancel" id="stf_cancel"/>' +
				'<p class="selected_header left" id="stf_header_text">Select articles</p>' +
				'<a class="stf_ui_pick_all all right" href="javascript:void(0);" id="stf_select_all">Select All</a>' +
				'<span class="right single_nav">' +
					'<img src="' + FLOW_SERVER + '/public/img/arrow-up.png" class="prev" id="stf_single_prev"/>' +
					'<img src="' + FLOW_SERVER + '/public/img/arrow-down.png" class="next" id="stf_single_next"/>' +
				'</span>' +
			'</div>' +
			'<div id="stf_processing">Finding references</div>' +
			'<div id="stf_ui_main">' +
				'<div class="stf_webref warn" id="stf_webref">Flow couldn\'t find much here, but you can enter the missing metadata below. </div>' +
				'<div class="stf_meta" id="stf_meta"></div>' +
			'</div>' +
			'<div class="stf_ui_itemlist" id="stf_ui_itemlist"></div>' +
			'<div class="stf_button_pane"><button class="stf_btn_save" disabled="disabled" id="stf_save_button">Save to Flow</button></div>' +
		'</div>'
	doc.body.appendChild(container);
  doc.getElementById("stf_cancel").addEventListener("click", function (e) {
      var elem = doc.getElementById("stf_capture"), className = elem.className;
      elem.className = className.replace("show","");
    ZU.setTimeout(function(){
        doc.body.removeChild(elem);
        Z.done();
    },1000)
  }, true);
}

function save(item, doc, url) {
	//pull out attach and attachments
    doc.getElementById("stf_container").style.display = "none";
    doc.getElementById("stf_progress").style.display = "block";
	ZU.HTTP.doGet('http://localhost:8080/api/1/doc/newid/',function(data_id){
		var resp = JSON.parse(data_id),attachment, useAttachment = item.attach;
        progressDialog(doc,0.2);
		if(item.attachments)
            for (var i = 0; i < item.attachments.length; i++)
                if (item.attachments[i].mimeType.indexOf("pdf") >= 0)
                    attachment = {url:item.attachments[0].url, mimeType: item.attachments[0].mimeType};
        if(!attachment && useAttachment) {//types other than pdf?
            attachment = {html: doc.documentElement.outerHTML || (new XMLSerializer().serializeToString(doc)), url: url};
        }

		delete item.attachments;
		delete item.attach;
		ZU.HTTP.doPost('http://localhost:8080/edit/'+ resp.data+'/?project=all',
			JSON.stringify(item),
			function(data_edit){
                progressDialog(doc, (useAttachment ? 0.5: 0.9));
				if (useAttachment) {
					saveAttachment(doc, attachment, resp.data);
				}
		},{"Content-Type":"application/json"});
	});
}

function progressDialog(doc,ratio){
    doc.getElementById("stf_download_progress").style.width = Math.round(ratio * 315) + "px"
}

function completeDialog(doc){
    var FLOW_SERVER = "http://localhost:8080";
    var count;
    var status = doc.getElementById("stf_status");
    progressDialog(doc, 0.9);
    doc.getElementById("stf_progress").style.display = "none";
    status.style.display = "block";
    var countText = count ? count + " articles saved." : "1 article saved."
    status.innerHTML = countText + '<form method="get" action="'+ FLOW_SERVER+'/library/recent/" target="ProQuestFlow"><button id="stf_view_button" type="submit">View in Flow</button></form>';
}

function saveAttachment(doc, attachment,id) {
	var FLOW_SERVER = "http://localhost:8080";
    if(!attachment.html)
        ZU.HTTP.promise("GET", attachment.url, {responseType: "blob", headers:{"Content-Type": attachment.mimeType}}, function (blob) {
            progressDialog(doc, 0.7);
            try {
                if (attachment.mimeType.indexOf("html") < 0)
                    ZU.HTTP.promise("POST", FLOW_SERVER + "/savetoflow/attachment/" + id + "/", {debug: true, body: blob, headers: {"Content-Type": "application/pdf"}}, function (http) {
                        completeDialog(doc);
                    });
                else {
                    Z.debug("url=" + encodeURIComponent(attachment.url) + "&html=" + encodeURIComponent(blob));
                    ZU.HTTP.promise("POST", FLOW_SERVER + "/edit/" + id + "/html/?url="+ encodeURIComponent(attachment.url), {debug: true, headers: {"Content-Type": attachment.mimeType}, body: blob}, function (http) {
                        completeDialog(doc);
                    });
                }
            }catch(e){
                Zotero.debug(e.message);}
        });
    else
        ZU.HTTP.promise("POST", FLOW_SERVER + "/edit/" + id + "/html/?url=" + encodeURIComponent(attachment.url), {debug: true, body: attachment.html}, function (http) {
            completeDialog(doc);
        });
}

function selection(doc, url, items, callback){
	//callback should complete items, so we'll basically want to use it when we want to see of save an item.
	var container = doc.getElementById("stf_ui_itemlist"), stf = doc.getElementById("stf_capture"), ix = 1;
	stf.className = "listView";
    //list view is too fast? need a delay
    ZU.setTimeout(function(){doc.getElementById("stf_capture").className += " show";},100);
	for(itemId in items){
		var item = doc.createElement("div");
		item.className = "stf_ui_item";
		item.setAttribute("data-id", itemId);
		item.setAttribute("data-ix", ix++);
		item.addEventListener("click", function (e) {
			if(e.target.className == "detail"){//go to reference
				var thisItem = {}, thisItemId = this.getAttribute("data-id");
				stf.setAttribute("data-id", thisItemId);
				stf.setAttribute("data-ix", this.getAttribute("data-ix"));
				thisItem[thisItemId] = items[thisItemId];
				callback(thisItem);
			}
			else {//update count of selected. enable button if > 0
				setListButton(doc);
			}
		}, true);
		item.innerHTML= '<p><input type="checkbox" id="stf_cbx_'+ itemId+'"/><label for="stf_cbx_'+ itemId+'">'+ items[itemId]+'</label></p>'
		+ '<img src="http://flow.proquest.com/public/img/oval-arrow-grey.png" class="detail"/>';
		container.appendChild(item);
	}
	stf.setAttribute("data-count", ix-1);
	var savedReferences = {};
	function saveReference(){
		var item_id = stf.getAttribute("data-id"), reference = {};
		reference.refType = doc.getElementById("reference_type").value;
		for (var index = 0; index < labels.order.length; index++) {
            try {
                var elem = doc.getElementById("stf_" + labels.order[index]);
                if (elem) {
                    var val = elem.value
                    if (val) {
                        saveField(reference, labels.order[index], val);
                    }
                }
            }catch(e){
                Z.debug("error in: "+ labels.order[index]);
            }
		}
        reference.attachments = item.attachments;
		reference.attach = doc.getElementById("stf_attach") && doc.getElementById("stf_attach").checked;
		savedReferences[item_id] = reference;
	}
	doc.getElementById("stf_select_all").addEventListener("click", function (e) {
		if(this.getAttribute("unselect") == "true"){
			this.innerHTML = "Select All";
			this.setAttribute("unselect", "false");
			setListButton(doc, false);
		}
		else{
			this.innerHTML = "Unselect All";
			this.setAttribute("unselect","true");
			setListButton(doc,true);
		}
	},true);
	doc.getElementById("stf_single_next").addEventListener("click", function (e) {
		saveReference();
		move(doc, callback, items, 1);
	}, true);
	doc.getElementById("stf_single_prev").addEventListener("click", function (e) {
		saveReference();
		move(doc, callback, items, -1);
	}, true);
	doc.getElementById("stf_save_button").addEventListener("click", function (e) {
		if (stf.className.indexOf("listView") >= 0 && stf.className.indexOf("singleView") >= 0) {
			saveReference();
			stf.className = "listView";//save and back to list
			doc.getElementById("stf_header_text").innerHTML = "Select articles";
			setListButton(doc);
		}
		else if (stf.className.indexOf("listView") >= 0){
			stf.setAttribute("data-saving", "true");
			var cbx = doc.getElementById("stf_ui_itemlist").getElementsByTagName("input");
			for (var i = 0; i < cbx.length; i++) {
				if (cbx[i].checked){
					var item_id = cbx[i].id.replace("stf_cbx_","");
					if(savedReferences[item_id])
						save(savedReferences[item_id],doc,url);
					else{
						var thisItem = {};
						thisItem[item_id] = items[item_id];
						callback(thisItem);
					}
				}
			}
			//Zotero.done();
		}
	}, true);
    return "Translator results displayed";
}

function move(doc,callback,items,offset){
	var cbx = doc.getElementById("stf_ui_itemlist").getElementsByTagName("input"),
		stf = doc.getElementById("stf_capture"),
		id = stf.getAttribute("data-id");
	for (var i = 0; i < cbx.length; i++) {
		if (cbx[i].id == "stf_cbx_" + id) {
			var thisItem = {}, thisItemId = cbx[i + offset].id.replace("stf_cbx_", "");
			stf.setAttribute("data-id", thisItemId);
			stf.setAttribute("data-ix", i+(1 + offset));
			thisItem[thisItemId] = items[thisItemId];
			callback(thisItem);
		}
	}
}

function setListButton(doc,check){
	var cbx = doc.getElementById("stf_ui_itemlist").getElementsByTagName("input"), count = 0;
	for (var i = 0; i < cbx.length; i++){
		if(check !== undefined)
			cbx[i].checked = check;
		if (cbx[i].checked)
			count++;
	}
	var button = doc.getElementById("stf_save_button");
	if (count > 0) {
		button.disabled = false;
		button.className = "stf_btn_save enable";
	}
	else {
		button.disabled = true;
		button.className = "stf_btn_save";
	}
	button.innerHTML = "Save to Flow (" + count + ")";
}

function single(doc, url, item, noneFound){
    if(!item.retrievedDate)
        item.retrievedDate = new Date();
    if(!item.URL)
        item.URL = url;
    if(noneFound){
        doc.getElementById("stf_webref").style.display = "block";
    }
	function saveReference(useItem){
		var reference = useItem ? convserion.convert(item) : {};
        if(!useItem) {
            reference.refType = doc.getElementById("reference_type").value;
            if (item.attachments)
                reference.attachments = item.attachments;
            for (var index = 0; index < labels.order.length; index++) {
                var elem = doc.getElementById("stf_" + labels.order[index]);
                if (elem) {
                    var val = elem.value;
                    if (labels.order[index] == "authors")
                        val = authorNameList(val, "\n");
                    if (val) {
                        reference[labels.order[index]] = val;
                    }
                }
            }
        }
        reference = conversion.convert(reference);
        //may need to make this more complex for attach from list (like don't save html, but do save pdf)
        reference.attachments = item.attachments;
        reference.attach = useItem ? true : doc.getElementById("stf_attach").checked;
		save(reference,doc,url);
	}
	var container = doc.getElementById("stf_meta"), output = [], stf = doc.getElementById("stf_capture"), containerClass = stf.className,
		FLOW_SERVER = "http://flow.proquest.com";
	if(stf.getAttribute("data-saving") == "true"){
		saveReference(true);
		return;
	}
	stf.className = (containerClass ? containerClass+" " : "") + "singleView";
    if(containerClass.indexOf("show") < 0)
  console.log("line 357"+ Z.debug)
  console.log('line 360: '+ZU)
        ZU.setTimeout(function () {
            doc.getElementById("stf_capture").className += " show";
        }, 100);
	if (containerClass.indexOf("listView") >= 0){
		var ix = parseInt(stf.getAttribute("data-ix")), count = parseInt(stf.getAttribute("data-count"));
		doc.getElementById("stf_header_text").innerHTML = "Article details - " + ix + " of " + count;
		doc.getElementById("stf_single_prev").className = "prev" + (ix <= 1 ? " disabled" : "");
		doc.getElementById("stf_single_next").className = "next" + (ix >= count ? " disabled" : "");
		doc.getElementById("stf_save_button").innerHTML = "Done editing";
	}
	else
		output.push("<div class='stf_lbl header'>Save As</div>");
    var converted = conversion.convert(item);
	var refType = refType || converted.refType;
	output.push("<select id='reference_type' class='stf_dropdown'>");
	for(var index in labels.referenceTypes) {
		var value = labels.referenceTypes[index];
		var selected = refType == index ? " selected='selected'" : "";
		output.push("<option value='" + index + "'" + selected + ">" + value.label + "</option>");
	}
	output.push("</select>");
    var pdf = false;
    if(item.attachments)
        for(var i=0; i< item.attachments.length;i++)
            if(item.attachments[i].mimeType.indexOf("pdf") >= 0)
                pdf = true;
    //smarter - check for url and type, saving html pages (that are not this one)
	if (pdf) {
		output.push("<img src='" + FLOW_SERVER + "/public/img/pdf.png' class='stf_lbl'/><span class='input_container'><label for='stf_attach_web' class='stf_attach'><input type='checkbox' id='stf_attach' checked='checked' class='stf_attach'> <span>We see a PDF! Should we try to save it too?</span></label></span>");
	}
	else if (containerClass.indexOf("listView") == -1) {
        item.attachments = [];//kill it with fire!
		output.push("<img src='" + FLOW_SERVER + "/public/img/web.png' class='stf_lbl'/><span class='input_container'><label for='stf_attach_web' class='stf_attach'><input type='checkbox' id='stf_attach' class='stf_attach'> <span>Save the content of this web page</span></label></span>");
	}
	output.push("<div id='stf_ref_type_spec' class='clear'>");
	output = createFields(item, output, refType);
	output.push("</div>");
	container.innerHTML = output.join('');
	doc.getElementById("stf_save_button").disabled = false;
    textarea(doc);
	if (stf.className.indexOf("singleView") >= 0 && stf.className.indexOf("listView") == -1){
		doc.getElementById("stf_save_button").addEventListener("click", function (e) {
			try {
				saveReference();
			} catch (e) {
				Z.debug(e.message);
			}
		}, true);
	}
	return "Item Displayed";
}

function textarea(doc) {
  var offset = 0, textHeight = 102;
  function autoSize(text) {
          if (text.scrollHeight < textHeight || text.id == "stf_authors") {
              text.style.height = 'auto';
              var height = (text.scrollHeight + offset + (text.id == "stf_authors" && offset ? 18 : 0))
              text.style.height = (height > 32 ? height : 32) + 'px';//minimum, one line
              text.style.overflow = 'hidden';
          }
          else {
              text.style.height = textHeight + 'px';
              text.style.overflowY = 'auto';
          }
  }

    function autoSizeEvent() {
        var that = this;
        ZU.setTimeout(function () {
        autoSize(that)
        }, 0);
    }
  for (var index = 0; index < labels.order.length; index++) {
    var value = labels.order[index];
    var text = doc.getElementById("stf_"+ value);
    if(text) {
        autoSize(text);
        text.addEventListener("focus", function (e) {
            //var parent = this.parentNode;
            //parent.getElementsByClassName("empty").style.display = 'none';
            this.addEventListener("keypress", autoSizeEvent);
        });
        text.addEventListener("blur", function (e) {
            this.removeEventListener("keypress", autoSizeEvent);
        });
    }

  }
}

function createFields(item, output, refType){
	var fieldMapping = labels.referenceTypes[refType].defaultFields;
    var converted = conversion.convert(item);
	for(var index = 0; index < labels.order.length; index++) {
		var field = labels.order[index];
		if (fieldMapping.indexOf(field) >= 0) {
			var override = labels.referenceTypes[refType].fieldLabelOverides[field], label = override ? override : labels.fields[field].label;
			var value = field == "authors" ? authorNameList(converted[field], "\n") : converted[field];
			if (value) {
				output.push("<div class='stf_lbl'>" + label + "</div>" + (field == "authors" ? "<div class='textposition'><span class='author'>Last name, First names</span>" : "") + "<textarea class='stf_val' id='stf_" + field + "' rows='1'>" + value + "</textarea>" + (field == "authors" ? "</div>" : ""));
			}
			else {
				output.push("<div class='stf_lbl'>" + label + "</div><div class='textposition'><span class='empty'>Please enter metadata...</span>" + (field == "authors" ? "<span class='author'>Last name, First names (each on a new line)</span>" : "") + "<textarea class='stf_val' id='stf_" + field + "' rows='1'></textarea></div>");
			}
		}
	}
	return output;
}

var labels = (function(){
	var fields = {
		abstract: { label: "Abstract"},
		alternateTitle: {label: "Alternate Title"},
		authors: { label: "Authors"},
		arXivId: { label: "ArXiv ID" },
		availability: { label: "Availability" },
		classification: { label: "Classification"},
		compilers: { label: "Compilers"  },
		department: { label: "Department" },
		doi: { label: "DOI"},
		edition: { label: "Edition"},
		editors: { label: "Editors"},
		eventName: { label: "Event" },
		eventLocation: { label: "Event Location" },
		eventDate: { label: "Event Date" },
		extraData: { label: "Extra Data"},
		isbn: { label: "ISBN"},
		isElectronic: { label: "Is Electronic?" },
		issn: { label: "ISSN"},
		issue: { label: "Issue"},
		journalAbbrev: { label: "Journal Abbrev"},
		language: { label: "Language"},
		locCallNumber: { label: "LC Call #"},
		location: { label: "Place of Publication"},
		pages: { label: "Pages"},
		pmcid: { label: "PMCID"},
		pmid: { label: "PMID"},
		publication: { label: "Publication"},
		publicationEditors: { label: "Publication Editors" },
		publicationDate: { label: "Date"},
		publisher: { label: "Publisher"},
		republishedDate: { label: "Republished Date"},
		retrievedDate: { label: "Date Retrieved"},
		shortTitle: { label: "Short Title"},
		seriesEditors: { label: "Series Editors"},
		seriesTitle: { label: "Series Title"},
		sourceName: { label: "Source Name"},
		sourceDatabase: { label: "Source DB"},
		sourceLibrary: { label: "Source Library"},
		sourceLocation: { label: "Source Location"},
		sourceAccession: { label: "Source Accession"},
		title: { label: "Title"},
		translators: { label: "Translators"},
		type: { label: "Type" },
		url: { label: "Retrieved From"},
		userNotes: { label: "Notes" },
		version: { label: "Version" },
		volume: { label: "Volume"}
        },
	referenceTypes = {
		JOURNAL_ARTICLE_REF: {
			label: 'Journal Article',
			defaultFields: [ 'abstract', 'authors', 'issue', 'pages', 'publication', 'publicationDate', 'title', 'url', 'userNotes', 'volume', 'doi', 'issn' ],
			optionalFields: [ 'arXivId', 'alternateTitle', 'retrievedDate', 'edition', 'extraData', 'isElectronic', 'journalAbbrev', 'language', 'pmcid', 'pmid', 'republishedDate', 'seriesEditors', 'shortTitle', 'sourceName', 'sourceDatabase', 'sourceLibrary', 'sourceLocation', 'sourceAccession', 'translators' ],
			fieldLabelOverides: { publication: 'Journal' }
		},
		BOOK_REF: {
			label: "Book",
			defaultFields: [ 'abstract', 'authors', 'location', 'edition', 'publicationDate', 'seriesTitle', 'publisher', 'title', 'userNotes', 'doi', 'isbn' ],
			optionalFields: [ 'alternateTitle', 'compilers', 'editors', 'extraData', 'isElectronic', 'language', 'lcCallNumber', 'translators', 'url'],
			fieldLabelOverides: { }
		},
		BOOK_SECTION_REF: {
			label: "Book section",
			defaultFields: [ 'abstract', 'authors', 'editors', 'location', 'pages', 'publicationDate', 'publication', 'publisher', 'title', 'userNotes', 'doi', 'isbn' ],
			optionalFields: [ 'alternateTitle', 'compilers', 'edition', 'extraData', 'isElectronic', 'language', 'lcCallNumber', 'seriesEditors', 'sourceName', 'sourceDatabase', 'sourceLibrary', 'sourceLocation', 'sourceAccession', 'translators', 'url' ],
			fieldLabelOverides: { publication: 'Book title', title: 'Section title' },
		},
		GENERIC_REF: {
			label: "Generic",
			defaultFields: [ 'abstract', 'authors', 'location', 'publication', 'publicationDate', 'publisher', 'title', 'url', 'userNotes', 'doi', 'isbn', 'issn' ],
			optionalFields: [ 'availability', 'alternateTitle', 'arXivId', 'classification', 'compilers', 'department', 'doi', 'edition', 'editors', 'eventName', 'eventLocation', 'eventDate', 'extraData', 'isbn', 'isElectronic', 'issn', 'issue', 'journalAbbrev', 'language', 'lcCallNumber', 'pages', 'pmcid', 'pmid', 'publicationEditors', 'republishedDate', 'retrievedDate', 'seriesEditors', 'seriesTitle', 'shortTitle', 'sourceName', 'sourceDatabase', 'sourceLibrary', 'sourceLocation', 'sourceAccession', 'translators', 'type', 'version', 'volume' ],
			fieldLabelOverides: { }
		},
		WEB_REF: {
			label: "Web page",
			defaultFields: [ 'abstract', 'authors', 'publication', 'publicationDate', 'retrievedDate', 'title', 'url', 'userNotes', 'doi' ],
			optionalFields: [ 'alternateTitle', 'extraData', 'language', 'publicationEditors', 'version' ],
			fieldLabelOverides: { publication: 'Website', url: 'URL' }
		},
		REPORT_REF: {
			label: "Report",
			defaultFields: [ 'abstract', 'authors', 'location', 'pages', 'publication', 'publicationDate', 'publisher', 'title', 'userNotes', 'doi' ],
			optionalFields: [ 'alternateTitle', 'retrievedDate', 'edition', 'editors', 'extraData', 'isElectronic', 'language', 'lcCallNumber', 'sourceName', 'sourceDatabase', 'sourceLibrary', 'sourceLocation', 'sourceAccession', 'translators', 'url' ],
			fieldLabelOverides: { publication: 'Institution' }
		},
		CONF_REF: {
			label: "Conference proceeding",
			defaultFields: [ 'abstract', 'authors', 'location', 'pages', 'publication', 'publicationDate', 'publisher', 'title', 'userNotes', 'doi' ],
			optionalFields: [ 'alternateTitle', 'retrievedDate', 'editors', 'eventName', 'eventDate', 'extraData', 'isElectronic', 'language', 'lcCallNumber', 'sourceName', 'sourceDatabase', 'sourceLibrary', 'sourceLocation', 'sourceAccession', 'translators', 'url' ],
			fieldLabelOverides: { eventName: 'Conference', eventDate: 'Conference Date', publication: 'Proceedings Title' }
		},
		NEWS_REF: {
			label: "Newspaper article",
			defaultFields: [ 'abstract', 'authors', 'location', 'edition', 'pages', 'publication', 'publicationDate', 'retrievedDate', 'title', 'userNotes', 'url', 'doi' ],
			optionalFields: [ 'alternateTitle', 'editors', 'extraData', 'isElectronic', 'language', 'sourceName', 'sourceDatabase', 'sourceLibrary', 'sourceLocation', 'sourceAccession', 'translators' ],
			fieldLabelOverides: { }
		},
		THESIS_REF: {
			label: "Thesis",
			defaultFields: [ 'abstract', 'authors', 'department', 'pages', 'publicationDate', 'publisher', 'title', 'type', 'userNotes', 'doi' ],
			optionalFields: [ 'alternateTitle', 'location', 'extraData', 'isElectronic', 'language', 'lcCallNumber', 'sourceName', 'sourceDatabase', 'sourceLibrary', 'sourceLocation', 'sourceAccession', 'url' ],
			fieldLabelOverides: { publisher: 'University', location: 'Location' }
		},
		MAG_REF: {
			label: "Magazine article",
			defaultFields: [ 'abstract', 'authors', 'location', 'pages', 'publication', 'publicationDate', 'publisher', 'title', 'userNotes', 'url', 'doi' ],
			optionalFields: [ 'alternateTitle', 'extraData', 'editors', 'isElectronic', 'language', 'lcCallNumber', 'retrievedDate', 'sourceName', 'sourceDatabase', 'sourceLibrary', 'sourceLocation', 'translators'],
			fieldLabelOverides: { }
		}
    },
	order = ['title', 'authors', 'editors', 'publication', 'publicationDate', 'seriesTitle', 'publisher', 'department', 'location', 'edition', 'volume', 'issue', 'pages', 'doi', 'issn', 'isbn', 'type', 'url', 'retrievedDate', 'abstract'];

	return {order:order, fields: fields, referenceTypes: referenceTypes};
})();

var conversion = (function(){
    var zotero = {
        itemType:{
            book: "BOOK_REF",
            bookSection: "BOOK_SECTION_REF",
            conferencePaper: "CONF_REF",
            journalArticle: "JOURNAL_ARTICLE_REF",
            magazineArticle: "MAG_REF",
            newspaperArticle: "NEWS_REF",
            report: "REPORT_REF",
            thesis: "THESIS_REF",
            webpage: "WEB_REF"
        },
        fields: {
            abstractNote: "abstract",
            creators: "authors",
            DOI: "doi",
            edition: "edition",
            editors: "editors",//creator+type=editors
            ISBN: "isbn",
            ISSN: "issn",
            issue: "issue",
            journalAbbreviation: "journalAbbrev",
            language: "language",
            place: "location",
            pages: "pages",
            PMCID: "pmcid",
            PMID: "pmid",
            publicationTitle: "publication",
            date: "publicationDate",
            publisher: "publisher",
            retrievedDate: "retrievedDate",
            title: "title",
            translator:"translator",//creator+type=translator
            URL: "url",
            volume: "volume"
        }
    }
    var flow = {
        fields: {
            "abstract": "abstr",
            "authors": {"key": "authors", "fn": parseAuthor},
            "doi": "docIds.doi",
            "PMCID": "docIds.pmcid",
            "PMID": "docIds.pmid",
            "edition": "series.edition",
            "editors": {"key": "contributors.editors", "fn": parseAuthor},
            "isbn": "publication.isbn",
            "issn": "publication.issn",
            "journalAbbrev": "publication.abbrev",
            "language": "language",
            "publicationDate": "publicationDate.rawDate",
            "publication": "publication.title",
            "volume": "series.volume",
            "issue": "series.issue",
            "pages": "pages.rawPages",
            "publisher": "publisher.name",
            "location": "publisher.location",
            "translator": {"key": "contributors.translator", "fn": parseAuthor},
            "title":"title",
            "retrievedDate": "retrievedDate.rawDate",
            "url":"url"
        }
    }
    function convert(item){
        var converted = {}
        if(item.itemType){//zotero
            converted.refType = zotero.itemType[item.itemType];
            for(var field in item){
                if(zotero.fields[field])
                    converted[zotero.fields[field]] = item[field];
            }
        }
        else if(item.refType){//flow
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
    return {convert:convert};
})();

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
	if (value)
		return value.split(/\n/).map(function (item) {
			return {rawName: item};
		});
}