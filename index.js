#!/usr/bin/env node

const yargs = require("yargs");
const traversePaths = require("./file");

// eslint-disable-next-line max-lines-per-function
function parseCMDArgs() {
   return yargs
      .usage("$0 [options..] <directories..>")
      .options("a", {
         alias: "all",
         description: "Include dot-prefixed files",
      })
      .options("l", {
         alias: "follow",
         description: "Follow symbolic links",
      })
      .options("d", {
         alias: "depth",
         description: "descend N level directories",
      })
      .options("f", {
         description: "display path displacement from top directory",
      })
      .options("x", {
         description: "stay on the current filesystem only",
      })
      .options("g", {
         description: "filter files by glob pattern",
      })
      .options("dirs-only", {
         description: "list directories only",
      })
      .options("output", {
         alias: "o",
         description: "send output to a file, truncating if it exists",
         coerce(out) {
            const { createWriteStream } = require("fs");
            return createWriteStream(out);
         },
      })
      .requiresArg(["d", "g"])
      .boolean(["a", "l", "f", "x", "dirs-only"])
      .string(["g", "o"])
      .number("d").argv;
}

function tree() {
   const argv = parseCMDArgs(),
      paths = argv._.length ? argv._ : ".";
   if (typeof argv.output !== "object") argv.output = process.stdout;
   traversePaths(paths, argv);
}

tree();
