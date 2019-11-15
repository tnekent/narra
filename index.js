const { readdirSync, readlinkSync, lstatSync, statSync } = require("fs")
const { resolve, basename } = require("path");

function recurseDirs(path, config, prefix = "") {
    let ents = readdirSync(path),
        { writer } = config;

    ents = filterDirs(ents, path);
    for (let i = 0, len = ents.length; i < len; i++) {
        let { type, fpath, rpath, rtype } = ents[i]
        writer.write(`${prefix}${i === len - 1 ? "└── " : "├── "}${basename(fpath)}`)

        if (type === "link") {
            writer.write(` -> ${rpath}`)
            fpath = rpath;
            type = rtype;
        }

        writer.write("\n");
        if (type === "dir") {
            recurseDirs(fpath, config, `${prefix}${i === len - 1 ? "    " : "│   "}`)
        }
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
    let { writer } = config;

    for (const arg of args) {
        if (arg[0] === "-" && arg[1]) {
	    writer.write(`-${arg[1]} not implemented\n`)
            process.exit(1);
        } else {
            paths.push(arg);
        }
    }
    if (!paths.length) { paths.push("."); }
    for (const p of paths) {
        writer.write(`${p}\n`);
        recurseDirs(p, config);
    }
}

main()
