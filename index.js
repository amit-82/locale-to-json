const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { FgGreen, FgRed, FgWhite, FgYellow, FgBlue } = require("./com/colors");
const { mapAllLocaleFileFields } = require("./com/parsers");
const { localeFileRegEx } = require("./com/regexps");
const { getSubDirectories } = require("./com/files_helper");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const filterLocaleFiles = (file) => localeFileRegEx.test(file);
const getDefaultLocaleFileName = (sampleFile) => {
  const parts = localeFileRegEx.exec(sampleFile);
  return parts[1] + parts[3];
};

const printJSON = (locale, entriesMap, dir) => {
  const obj = {};
  let fName;

  entriesMap.forEach((val, key) => {
    key = key.replace("loc.", "");
    const keyParts = key.split(".");
    fName = fName || keyParts[0];
    let ref = obj;
    for (let i = 0; i < keyParts.length; i++) {
      if (i === keyParts.length - 1) {
        // last
        ref[keyParts[i]] = val;
      } else {
        // not last
        if (!ref[keyParts[i]]) {
          // key without value but possible children
          ref[keyParts[i]] = {};
        } else if (typeof ref[keyParts[i]] === "string") {
          // key already assigned a string value, but also has children. string value becomes child 'title'
          ref[keyParts[i]] = {
            title: ref[keyParts[i]],
          };
        }
        ref = ref[keyParts[i]];
      }
    }
  });

  if (!fName) {
    console.log(
      FgYellow,
      `-can't save ${FgRed}${locale}${FgYellow}. doesn't have entries`,
      FgWhite
    );
    return;
  }

  const exportDir = "export";
  const inputDirParts = dir.split("\\");
  const inputDirEnd = inputDirParts[inputDirParts.length - 1];

  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir);
  }
  const destinationDir = path.resolve(exportDir, inputDirEnd);
  if (!fs.existsSync(destinationDir)) {
    fs.mkdirSync(destinationDir);
  }

  const location = path.resolve(destinationDir, `${locale}.json`);
  fs.writeFileSync(location, JSON.stringify(obj));
  console.log(FgWhite, `-saved ${FgGreen}${location}`, FgWhite);
};

const requestDir = () => {
  rl.question(
    `${FgBlue}(press enter without text to exit)${FgWhite} enter dir with locale XML files: `,
    (dir) => {
      rl.question("also process sub folders? (1/0)", (recurseResponse) => {
        const withSubFolders = recurseResponse === "1";

        if (dir.trim() === "") {
          rl.close();
        } else {
        }

        try {
          if (withSubFolders) {
          }

          let dirs = [path.resolve(dir)];

          if (withSubFolders) {
            dirs = [dirs[0], ...getSubDirectories(dirs[0])];
          }

          const onProcessDirComplete = () => {
            if (dirs.length === 0) {
              console.log("got any more of them sweet xmls?");
              requestDir();
            } else {
              processDir(dirs.shift(), onProcessDirComplete, !withSubFolders);
            }
          };
          onProcessDirComplete();
        } catch (err) {
          console.log(FgRed, err.message || err, FgWhite, "better luck next time");
          requestDir();
        }
      });
    }
  );
};

const processDir = (dir, onComplete, throwOnFail = true) => {
  console.log(FgYellow, "working...", FgWhite, dir);
  let stats = fs.lstatSync(dir);
  if (!stats.isDirectory()) {
    throw "it is not a directory!";
  }
  const dirContent = fs.readdirSync(dir);
  if (dirContent.length === 0) {
    throw "directory is empty!";
  }

  const localeFiles = dirContent.filter(filterLocaleFiles);
  if (localeFiles.length === 0) {
    if (throwOnFail) {
      throw "couldn't find any local xml file that ends with '[domain]_[locale].properties.xml'";
    } else {
      onComplete();
    }
    return;
  }

  // default file
  const defaultFile = getDefaultLocaleFileName(localeFiles[0]);
  const defaultFilePath = dir + "\\" + defaultFile;

  stats = fs.lstatSync(defaultFilePath);
  if (stats.isFile()) {
    localeFiles.unshift(defaultFile);
    console.log(FgGreen, `-default file ${defaultFile} found`, FgWhite);
  } else {
    console.log(FgYellow, `-default file ${defaultFile} wasn't found`, FgWhite);
  }

  console.log(FgGreen, `-found ${localeFiles.length} files`, FgWhite);

  mapAllLocaleFileFields(dir + "\\", localeFiles, (map) => {
    map.forEach((entriesMap, locale) => {
      printJSON(locale, entriesMap, dir);
    });
    onComplete();
  });
};

rl.on("close", () => {
  console.log("bye bye");
  process.exit();
});

requestDir();
