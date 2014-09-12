var fs = require('graceful-fs');
var path = require('path');
var _root,
    _callback;

function deleteAllObjects(objects, fromDir) {
  objects.every(function(obj) {
    var objPath = path.join(fromDir, obj);
    fs.stat(objPath, function(err, st) {
      if(!st)
        return false;
      if(st.isDirectory()) {
        deleteFolder(objPath)
      }
      else {
        fs.unlink(objPath, function() {
          deleteParentFolder(fromDir);
        })
      }
    });
    return true;
  });
}
function deleteFolder(folder) {
  fs.exists(folder, function(exists) {
    if(exists) {
      fs.readdir(folder, function(err, objects) {
        if(!objects)
          deleteParentFolder(folder)
        else if(objects.length == 0) {
          fs.rmdir(folder, function(err) {
            if(!err) {
              deleteParentFolder(folder)
              if(folder == _root)
                _callback();
            }
          });
        }
        else
          deleteAllObjects(objects, folder)
      });
    }
  });
}
function deleteParentFolder(dir) {
  var parent = path.join(dir, "..");
  if(parent.indexOf(_root) == 0)
    deleteFolder(parent);
}

var deleteRecursive = function(root, callback) {
  _root = root;
  _callback = callback;
  fs.exists(_root, function(exists) {
    if(exists) {
      deleteFolder(_root);
    }
    else
      _callback();
  });
};

module.exports.delete = deleteRecursive;
