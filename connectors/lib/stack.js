var stackObj = function (oncomplete) {
  var stObj = [];
  this.oncomplete = oncomplete;
  this.push = function(name) {
    stObj.push(stObj.length);
  }
  this.pop = function() {
    stObj.pop();
    if(stObj.length == 0 && this.oncomplete) {
      this.oncomplete();
    }
  }
}

module.exports = stackObj;