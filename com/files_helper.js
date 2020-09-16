const fs = require("fs");
const path = require("path");

const getSubDirectories = (root, recursive = false) => {
  root = path.resolve(root);
  const files = fs.readdirSync(root);
  let dirs = [];
  for (let i = 0; i < files.length; i++) {
    const p = path.resolve(root, files[i]);
    const stat = fs.lstatSync(p);
    if (stat.isDirectory()) {
      dirs.push(p);
      if (recursive) {
        const children = getSubDirectories(p, true);
        dirs = [...dirs, ...children];
      }
    }
  }
  return dirs;
};

module.exports = { getSubDirectories };
