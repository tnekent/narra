const { readdirSync, readlinkSync, lstatSync, statSync, accessSync } = require("fs")
const { resolve, basename } = require("path");

const usage = `\
usage: narra [<directory list>]
`
const IS_FILE = 1,
    IS_DIR = 2,
    IS_LINK = 4;
const { stderr, exit } = process;


// XXX: use global?
const resolvedLinks = new Set();
let filecount = 0,
    dircount = 0;

function errorAndExit(code, msgs) {
    for (const msg of msgs)
        stderr.write(msg);
    exit(code);
}

function getFtype(stats) {
    return stats.isDirectory() ? IS_DIR
        : stats.isSymbolicLink() ? IS_LINK : IS_FILE;
}

function filterDirs(ents, path, config) {
    let filtered = [];

    for (const e of ents) {
        // Works only if `e` is not a full path
        if (!config.all && e[0] === ".") continue;

        let fpath = resolve(path, e),
            type = getFtype(lstatSync(fpath)),
            desc = { type, fpath, lpath: null }
		
        if (type & IS_LINK) {
            desc.lpath = readlinkSync(fpath);
            desc.type |= getFtype(statSync(fpath));
        }
        filtered.push(desc);
    }
    return filtered;
}

function recurseDirs(path, config, prefix = "") {
    let ents = readdirSync(path),
        { writer, follow } = config;

    ents = filterDirs(ents, path, config);
    for (let i = 0, len = ents.length; i < len; i++) {
        let { type, fpath, lpath } = ents[i]
        writer.write(`\n${prefix}${i === len - 1 ? "└── " : "├── "}${basename(fpath)}`)

        if (type & IS_LINK) {
            fpath = resolve(path, lpath);
            writer.write(` -> ${lpath}`)
        }

        if (type & IS_FILE) filecount++;
        else if (type & IS_DIR) {
            dircount++;
            if (type & IS_LINK) {
                if (!follow) continue;
                else if (resolvedLinks.has(fpath)) {
                    writer.write(" [recursive, not followed]");
                    continue;
                } else resolvedLinks.add(fpath);
            }
            recurseDirs(fpath, config, `${prefix}${i === len - 1 ? "    " : "│   "}`)
        }
    }
}


function main() {
    let args = process.argv.slice(2),
        paths = [],
        config = {
            writer: process.stdout,
            all: false,
            follow: false
        };
    let { writer } = config,
        restF = false;

    let i = 0, n = 0, len = args.length;
    for (; i < len; i = n) {
        n++;
        let arg = args[i];
        if (!restF && arg[0] === "-" && arg[1]) {
            for (const letter of arg.slice(1)) {
                switch (letter) {
                    case "h":
                        errorAndExit(0, usage);
                        break;
                    case "-":
                        restF = true;
                        break;
                    case "a":
                        config.all = true;
                        break;
                    case "l":
                        config.follow = true;
                        break;
                    default:
                        errorAndExit(1, `-${letter} not implemented\n`, usage);
                }
            }
        } else paths.push(arg);
    }
    if (!paths.length) paths.push("."); 
    for (const p of paths) {
        try {
            accessSync(p);  
        } catch (e) {
            if (e.code === "ENOENT")
                errorAndExit(2, `${p} [error opening dir]\n`);
            else throw e; 
        }
        writer.write(p);
        recurseDirs(p, config);
    }
    writer.write(`\n\n${dircount} director${dircount === 1 ? "y" : "ies"}, ${filecount} file${filecount === 1 ? "" : "s"}\n`);
}

main()
