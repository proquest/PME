/******* inject_ie_compat.js (mostly) *********/


if(!String.prototype.trim) {
	String.prototype.trim = function() { return this.replace(/^\s+|\s+$/, ''); };
}

/**
 * Provides textContent property in IE. explorerify rewrites the AST to replace the
 * textContent property with a function call to this.
 * @param {Object} el
 * @return {String}
 */
function textContent(el) {
	if(typeof el !== "object" || el === null) return el.textContent;
	return "textContent" in el ? el.textContent
		: "innerText" in el ? el.innerText
		: "text" in el ? el.text
		: el.nodeValue;
}

/**
 * Provides defaultView property in IE. explorerify rewrites the AST to replace the
 * defaultView property with a function call to this.
 * @param {Object} doc
 * @return {Window}
 */
function defaultView(doc) {
	if(typeof doc !== "object" || doc === null) return doc.defaultView;
	return "defaultView" in doc ? doc.defaultView : doc.parentWindow;
}

/**
 * explorerify rewrites all calls to the "filter" property on an object with a call to
 * this. It uses the "filter" property if available, or else performs its own filtering.
 * Implementation derived from https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/filter
 */
function arrayFilter(array, fun, thisp) {
	if("filter" in array) {
		var args = [];
		for(var i=1; i<arguments.length; i++) args.push(arguments[i]);
		return array.filter.apply(array, args);
	}

	if (array == null) throw new TypeError();

	var t = Object(array);
	var len = t.length >>> 0;
	if (typeof fun != "function") throw new TypeError();

	var res = [];
	for (var i = 0; i < len; i++) {
		if (i in t)	 {
			var val = t[i]; // in case fun mutates this
			if (fun.call(thisp, val, i, t))	res.push(val);
		}
	}

	return res;
};

/**
 * explorerify rewrites all calls to the "map" property on an object with a call to
 * this. It uses the "map" property if available, or else performs its own filtering.
 * Implementation derived from https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/map
 */
function arrayMap(array, callback, thisArg) {
	if("map" in array) {
		var args = [];
		for(var i=1; i<arguments.length; i++) args.push(arguments[i]);
		return array.map.apply(array, args);
	}

	var T, A, k;

	if (array == null) {
		throw new TypeError("array is null or not defined");
	}

	// 1. Let O be the result of calling ToObject passing the |this| value as the argument.
	var O = Object(array);

	// 2. Let lenValue be the result of calling the Get internal method of O with the argument "length".
	// 3. Let len be ToUint32(lenValue).
	var len = O.length >>> 0;

	// 4. If IsCallable(callback) is false, throw a TypeError exception.
	// See: http://es5.github.com/#x9.11
	if ({}.toString.call(callback) != "[object Function]") {
		throw new TypeError(callback + " is not a function");
	}

	// 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
	if (thisArg) {
		T = thisArg;
	}

	// 6. Let A be a new array created as if by the expression new Array(len) where Array is
	// the standard built-in constructor with that name and len is the value of len.
	A = new Array(len);

	// 7. Let k be 0
	k = 0;

	// 8. Repeat, while k < len
	while(k < len) {

		var kValue, mappedValue;

		// a. Let Pk be ToString(k).
		//	 This is implicit for LHS operands of the in operator
		// b. Let kPresent be the result of calling the HasProperty internal method of O with argument Pk.
		//	 This step can be combined with c
		// c. If kPresent is true, then
		if (k in O) {

			// i. Let kValue be the result of calling the Get internal method of O with argument Pk.
			kValue = O[ k ];

			// ii. Let mappedValue be the result of calling the Call internal method of callback
			// with T as the this value and argument list containing kValue, k, and O.
			mappedValue = callback.call(T, kValue, k, O);

			// iii. Call the DefineOwnProperty internal method of A with arguments
			// Pk, Property Descriptor {Value: mappedValue, Writable: true, Enumerable: true, Configurable: true},
			// and false.

			// In browsers that support Object.defineProperty, use the following:
			// Object.defineProperty(A, Pk, { value: mappedValue, writable: true, enumerable: true, configurable: true });

			// For best browser support, use the following:
			A[ k ] = mappedValue;
		}
		// d. Increase k by 1.
		k++;
	}

	// 9. return A
	return A;
};

/**
 * explorerify rewrites all calls to the "forEach" property on an object with a call to
 * this. It uses the "forEach" property if available, or else performs its own filtering.
 * Implementation derived from https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/forEach
 */
function arrayForEach(array, callback, thisArg) {
	if("forEach" in array) {
		var args = [];
		for(var i=1; i<arguments.length; i++) args.push(arguments[i]);
		return array.forEach.apply(array, args);
	}

	var T, k;

	if ( array == null ) {
		throw new TypeError( "array is null or not defined" );
	}

	// 1. Let O be the result of calling ToObject passing the |this| value as the argument.
	var O = Object(array);

	// 2. Let lenValue be the result of calling the Get internal method of O with the argument "length".
	// 3. Let len be ToUint32(lenValue).
	var len = O.length >>> 0; // Hack to convert O.length to a UInt32

	// 4. If IsCallable(callback) is false, throw a TypeError exception.
	// See: http://es5.github.com/#x9.11
	if ( {}.toString.call(callback) != "[object Function]" ) {
		throw new TypeError( callback + " is not a function" );
	}

	// 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
	if ( thisArg ) {
		T = thisArg;
	}

	// 6. Let k be 0
	k = 0;

	// 7. Repeat, while k < len
	while( k < len ) {

		var kValue;

		// a. Let Pk be ToString(k).
		//	 This is implicit for LHS operands of the in operator
		// b. Let kPresent be the result of calling the HasProperty internal method of O with argument Pk.
		//	 This step can be combined with c
		// c. If kPresent is true, then
		if ( k in O ) {

			// i. Let kValue be the result of calling the Get internal method of O with argument Pk.
			kValue = O[ k ];

			// ii. Call the Call internal method of callback with T as the this value and
			// argument list containing kValue, k, and O.
			callback.call( T, kValue, k, O );
		}
		// d. Increase k by 1.
		k++;
	}
	// 8. return undefined
}


/******* END inject_ie_compat.js *********/