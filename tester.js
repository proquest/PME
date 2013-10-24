(function ()
{
	var bReloadAll = true;

	function reloadPME()
	{
		var h = document.getElementsByTagName('head')[0];
		var d = (new Date()).valueOf();
		PME_SRV = SRV;
		PME_SCR = document.createElement('SCRIPT');
		PME_SCR.src = 'http://' + PME_SRV + '/PME.js?version=' + d;
		h.appendChild(PME_SCR);
	}

	function scrape()
	{
		waitFor(
			function () { return !!(window.PME && window.PME.getPageMetaData); },
			10 * 1000, // allow 10s for PME to load
			extractItems
		);
	}

	function waitFor(pred, maxTime, callback)
	{
		var interval = 50;
		if (pred())
			callback(true);
		else
		{
			if (maxTime - interval > 0)
				setTimeout(function () { waitFor(pred, maxTime - interval, callback); }, interval);
			else
				callback(false);
		}
	}

	function getProps(obj)
	{
		var sReturn = '';
		for (p in obj)
		{
			sReturn += '<b>' + p + '</b>: ';
			if (typeof (obj[p]) == "object")
				sReturn += '<div style="padding-left:10px;">' + getProps(obj[p]) + '</div>';
			else
			{
				sReturn += obj[p];
				sReturn += "<br/>";
			}
		}
		return sReturn;
	}

	function extractItems(pmeAvailable)
	{
		if (pmeAvailable)
		{
			PME.getPageMetaData(function (pmeResult)
			{
				var sHTML = '<br/>Items found: ' + pmeResult.items.length;
				if (bReloadAll)
				{
					$.each(pmeResult.items, function (n)
					{
						sHTML += "<br>";
						var oThis = this;
						sHTML += getProps(oThis);
					});
				}
				else
				{
					sHTML += '. Showing first only <br/>'+ getProps(pmeResult.items[0]);
				}
				$("#divWait").html("");
				$("#divResult").html(sHTML);

			});
		}
		else
		{
			console.log('no PME')
		}
	}

	var $ = jQuery.noConflict();
	$("#btnReload, #btnReloadAll").live("click",function ()
	{
		if ($(this).is("#btnReloadAll"))
			bReloadAll = true;
		else
			bReloadAll = false;

		$("#divResult").html("");
		$("#divWait").html("Wait...");

		reloadPME();
		scrape();

	});

	$("body").prepend(
		"<div style='background-color: rgb(218, 232, 243);font-size: 11px;font-family: verdana;'>"+
		"<input type='button' value='Reload (show first only)' id='btnReload'/>" +
		"<input type='button' value='Reload (show all)' id='btnReloadAll'/><br/>" +
		"<div id='divWait'>Wait...</div>"+
		"<div id='divResult'></div>"+
		"</div>")

	scrape();
	
}());
