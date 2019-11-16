const { readdirSync, readlinkSync, lstatSync, statSync, accessSync } = require("fs")
const { resolve, basename } = require("path");

const usage = `\
usage: narra [<directory list>]
`
// XXX: use global?
const resolvedLinks = new Set();

function recurseDirs(path, config, prefix = "") {
    let ents = readdirSync(path),
        { writer } = config;

    ents = filterDirs(ents, path);
    for (let i = 0, len = ents.length; i < len; i++) {
        let { type, fpath, rpath, rtype } = ents[i]
        writer.write(`${prefix}${i === len - 1 ? "└── " : "├── "}${basename(fpath)}`)

        if (type === "link") {
            fpath = resolve(path, rpath);
            writer.write(` -> ${rpath}`)
            if (resolvedLinks.has(fpath)) {
                writer.write(" [recursive, not followed]\n");
                continue;
            } else resolvedLinks.add(fpath);
            
            type = rtype;
        }

        writer.write("\n");
        if (type === "dir") recurseDirs(fpath, config, `${prefix}${i === len - 1 ? "    " : "│   "}`)
        
    }
}

function filterDirs(ents, path) {
    let filtered = [];

    for (const e of ents) {
        let fpath = resolve(path, e),
            type = getFtype(lstatSync(fpath)),
            desc = { type, fpath, rpath: "", rtype: "" }
		
        if (type === "link") {
            desc.rpath = readlinkSync(fpath);
            desc.rtype = getFtype(statSync(fpath));
        }
        filtered.push(desc);
    }
    return filtered;
}

function getFtype(stats) {
    return stats.isDirectory() ? "dir"
        : stats.isSymbolicLink() ? "link" : "file"
}

function main() {
    let args = process.argv.slice(2),
        paths = [],
        config = {
            writer: process.stdout
        };
    let { writer } = config,
        restF = false;
    let { stderr, exit } = process;

    for (const arg of args) {
        if (!restF && arg[0] === "-" && arg[1]) {
            switch (arg[1]) {
                case "h":
                    stderr.write(usage);
                    exit(0);
                    break;
                case "-":
                    restF = true;
                    break;
                default:
                    stderr.write(`-${arg[1]} not implemented\n`)
                    stderr.write(usage);
                    exit(1);
            }
        } else paths.push(arg);
    }
    if (!paths.length) paths.push("."); 
    for (const p of paths) {
        try {
            accessSync(p);  
        } catch (e) {
            if (e.code === "ENOENT") {
                stderr.write(`${p} [error opening dir]\n`)
                exit(2);
            } else throw e; 
        }
        writer.write(`${p}\n`);
        recurseDirs(p, config);
    }
}

main()
