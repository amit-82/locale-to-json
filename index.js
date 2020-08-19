const fs = require("fs");
const path = require("path");
const readline = require("readline");

Reset = "\x1b[0m";
Bright = "\x1b[1m";
Dim = "\x1b[2m";
Underscore = "\x1b[4m";
Blink = "\x1b[5m";
Reverse = "\x1b[7m";
Hidden = "\x1b[8m";

FgBlack = "\x1b[30m";
FgRed = "\x1b[31m";
FgGreen = "\x1b[32m";
FgYellow = "\x1b[33m";
FgBlue = "\x1b[34m";
FgMagenta = "\x1b[35m";
FgCyan = "\x1b[36m";
FgWhite = "\x1b[37m";

BgBlack = "\x1b[40m";
BgRed = "\x1b[41m";
BgGreen = "\x1b[42m";
BgYellow = "\x1b[43m";
BgBlue = "\x1b[44m";
BgMagenta = "\x1b[45m";
BgCyan = "\x1b[46m";
BgWhite = "\x1b[47m";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const localeFileRegEx = /^(\w+)\_(\w{2,2})(\.properties)\.xml$/i;
const DEFAULT_LOCALE = "en";

const filterLocaleFiles = (file) => localeFileRegEx.test(file);
const getDefaultLocaleFileName = (sampleFile) => {
  const parts = localeFileRegEx.exec(sampleFile);
  return parts[1] + parts[3];
};

const mapLocaleFileFields = (filePath, done) => {
  const isXML = filePath.indexOf(".xml") > -1;
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    output: process.stdout,
    terminal: false,
  });

  const keyValues = new Map();
  const xmlReg = /\s*\<entry key\=\"([\w+\.]+)\"\>/i;
  const nonXMLReg = /^[\w\.]+\=(.+)/i;
  rl.on("line", (line) => {
    line = line.trim();
    let parts;
    let sliceStart;
    if (isXML) {
      parts = xmlReg.exec(line);
      if (parts && parts.length >= 2) {
        sliceStart = line.indexOf(">");
        keyValues.set(parts[1], line.slice(sliceStart + 1).replace("</entry>", ""));
      }
    } else {
      parts = nonXMLReg.exec(line);
      sliceStart = line.indexOf("=");
      keyValues.set(line.slice(0, sliceStart), line.slice(sliceStart + 1));
    }
  });

  rl.on("close", () => {
    done && done(keyValues);
  });
};

const mapAllLocaleFileFields = (dir, files, done) => {
  files = [...files];

  const localeKeyValues = new Map();

  const parseNext = () => {
    if (files.length === 0) {
      done(localeKeyValues);
      return;
    }
    const file = files.shift(1);
    mapLocaleFileFields(dir + file, (keyValues) => {
      const localeParts = localeFileRegEx.exec(file);
      const locale = (localeParts && localeParts[2]) || DEFAULT_LOCALE;
      localeKeyValues.set(locale, keyValues);
      const color = keyValues.size ? FgGreen : FgRed;
      console.log(
        FgWhite,
        `-read ${color}${locale}${FgWhite} with ${color}${keyValues.size}${FgWhite} enteries`
      );
      parseNext();
    });
  };
  parseNext();
};

const printJSON = (locale, entriesMap) => {
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
        ref[keyParts[i]] = ref[keyParts[i]] || {};
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

  if (!fs.existsSync(fName)) {
    fs.mkdirSync(fName);
  }
  const location = `${fName}/${locale}.json`;
  fs.writeFileSync(location, JSON.stringify(obj));
  console.log(FgWhite, `-saved ${FgGreen}${location}`, FgWhite);
};

const requestDir = () => {
  rl.question(
    `${FgBlue}(press enter without text to exit)${FgWhite} enter dir with locale XML files: `,
    (dir) => {
      if (dir.trim() === "") {
        rl.close();
      } else {
      }

      try {
        dir = path.resolve(dir);
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
          throw "couldn't find any local xml file that ends with '[domain]_[locale].properties.xml'";
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
            printJSON(locale, entriesMap);
          });
          //console.log(FgGreen, "-done:", FgWhite, dir);
          /*
          rl.close();
          */
          console.log("got any more of them sweet xmls?");
          requestDir();
        });
      } catch (err) {
        console.log(FgRed, err.message || err, FgWhite, "better luck next time");
        requestDir();
      }
    }
  );
};

rl.on("close", () => {
  console.log("bye bye");
  process.exit();
});

requestDir();
