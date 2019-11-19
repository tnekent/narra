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

function filterDirs(ents, path) {
    let filtered = [];

    for (const e of ents) {
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
        { writer } = config;

    ents = filterDirs(ents, path);
    for (let i = 0, len = ents.length; i < len; i++) {
        let { type, fpath, lpath } = ents[i]
        writer.write(`\n${prefix}${i === len - 1 ? "└── " : "├── "}${basename(fpath)}`)

        if (type & IS_LINK) {
            fpath = resolve(path, lpath);
            writer.write(` -> ${lpath}`)
            if (type & IS_DIR && resolvedLinks.has(fpath)) {
                dircount++;
                writer.write(" [recursive, not followed]");
                continue;
            } else resolvedLinks.add(fpath);
        }

        if (type & IS_FILE) filecount++;
        if (type & IS_DIR) {
            recurseDirs(fpath, config, `${prefix}${i === len - 1 ? "    " : "│   "}`)
            dircount++;
        }
    }
}


function main() {
    let args = process.argv.slice(2),
        paths = [],
        config = {
            writer: process.stdout
        };
    let { writer } = config,
        restF = false;

    for (const arg of args) {
        if (!restF && arg[0] === "-" && arg[1]) {
            switch (arg[1]) {
                case "h":
                    errorAndExit(0, usage);
                    break;
                case "-":
                    restF = true;
                    break;
                default:
                    errorAndExit(1, `-${arg[1]} not implemented\n`, usage);
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
