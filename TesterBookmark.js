(function ()
{
	if (window.PME_SCR || window.TST_SRC)
		return;
	var h = document.getElementsByTagName('head')[0];
	var d = new Date().getTime();
	var p = window.location.protocol + '//';
	SRV = p + 'localhost:8273';
	PME_SRV = SRV;
	PME_SCR = document.createElement('SCRIPT');
	PME_SCR.src = PME_SRV + '/PME.js?version=' + d;
	h.appendChild(PME_SCR);
	TST_SRC = document.createElement('SCRIPT');
	TST_SRC.src = PME_SRV + '/tester.js?version=' + d;
	h.appendChild(TST_SRC);
})();

////bookmark////
/***************
// Paste the line below into the Location field of a bookmark:

javascript:(function(){if(window.PME_SCR||window.TST_SRC)return;var h=document.getElementsByTagName('head')[0];var d=new Date().getTime();var p=window.location.protocol+'//';SRV = p+'localhost:8273';PME_SRV = SRV;PME_SCR=document.createElement('SCRIPT');PME_SCR.src=PME_SRV+'/PME.js?version='+d;h.appendChild(PME_SCR);TST_SRC=document.createElement('SCRIPT');TST_SRC.src=PME_SRV+'/tester.js?version='+d;h.appendChild(TST_SRC);})();
***************/