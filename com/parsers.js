const fs = require("fs");
const readline = require("readline");
const { FgGreen, FgRed, FgWhite } = require("./colors");
const { localeFileRegEx } = require("./regexps");

const DEFAULT_LOCALE = "en";

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

module.exports = {
  DEFAULT_LOCALE,
  mapLocaleFileFields,
  mapAllLocaleFileFields,
};
