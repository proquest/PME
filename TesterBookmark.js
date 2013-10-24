(function ()
{
	if (window.PME_SCR || window.TST_SRC)
		return;
	var h = document.getElementsByTagName('head')[0];
	var d = (new Date()).valueOf();
	SRV = 'localhost/PME';
	PME_SRV = SRV;
	PME_SCR = document.createElement('SCRIPT');
	PME_SCR.src = 'http://' + PME_SRV + '/PME.js?version=' + d;
	h.appendChild(PME_SCR);
	TST_SRC = document.createElement('SCRIPT');
	TST_SRC.src = 'http://' + PME_SRV + '/tester.js?version=' + d;
	h.appendChild(TST_SRC);
})();

////bookmark////
/***************
javascript:(function(){if(window.PME_SCR||window.TST_SRC)return;var h=document.getElementsByTagName('head')[0];var d=(new Date()).valueOf();	SRV = 'localhost/PME';PME_SRV=SRV;PME_SCR=document.createElement('SCRIPT');PME_SCR.src='http://'+PME_SRV+'/PME.js?version='+d;h.appendChild(PME_SCR);TST_SRC=document.createElement('SCRIPT');TST_SRC.src='http://'+PME_SRV+'/tester.js?version='+d;h.appendChild(TST_SRC);})();
***************/