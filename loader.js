new function() {
	if(document.getElementById("zotero-iframe")) {
		alert("A previous translation process is still in progress. Please wait for it to complete, "+
			"or refresh the page.");
		return;
	};

	var baseURL = window.location.hostname +(window.location.port?":"+window.location.port:""),
		ie = (!document.evaluate ? "_ie" : ""),
		common = baseURL+"common"+ie+".js?_="+(new Date()),
		inject = baseURL+"inject"+ie+".js?_="+(new Date());

	var iframe = document.createElement("iframe"),
		tag = document.body || document.documentElement;
	iframe.id = "zotero-iframe";
	iframe.style.display = "none";
	iframe.style.borderStyle = "none";
	iframe.setAttribute("frameborder", "0");
	iframe.src = 'javascript:(function(){document.open();try{window.parent.document;}catch(e){document.domain="' + document.domain.replace(/[\\\"]/g, "\\$0")+'";}document.write(\'<!DOCTYPE html><html><head><script src="'+common+'"></script><script src="'+inject+'"></script></head><body></body></html>\');document.close();})()';
	tag.appendChild(iframe);
};
undefined;
