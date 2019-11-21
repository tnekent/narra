const { readdirSync, readlinkSync, lstatSync, statSync, accessSync } = require("fs");

const usage = `
usage: narra [-h] [-la] [-L <levels>] [<directory list>]
`;
const help = `\
${usage}

-h	   print this help message and exit
-a         include dot-prefixed files
-l	   follow symbolic links
-L <level> descend only \`level\` directories
`;
const IS_FILE = 1,
    IS_DIR = 2,
    IS_LINK = 4;
const { stderr, exit } = process;
const inotable = [];

let filecount = 0,
    dircount = 0;

function saveIno(dev, inode) {
    let hash = inode & 255;
    if (!inotable[hash]) inotable[hash] = [];
    inotable[hash].push([dev, inode]);
}

function existsIno(dev, inode) {
    let hash = inode & 255;
    if (!inotable[hash]) return false;
    for (const ino of inotable[hash]) 
        if (ino[0] === dev && ino[1] === inode) return true;
    
    return false;
}

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

        let fpath = `${path}/${e}`,
            st = lstatSync(fpath),
            type = getFtype(st),
            desc = { type, bpath: e, fpath, lpath: null, dev: null, inode: null };
		
        if (type & IS_LINK) {
            st = statSync(fpath);
            desc.lpath = readlinkSync(fpath);
            desc.type |= getFtype(st);
            desc.dev = st.dev;
            desc.inode = st.ino;
        } else if (type & IS_DIR) {
            desc.dev = st.dev;
            desc.inode = st.ino;
        }
        filtered.push(desc);
    }
    return filtered;
}

function recurseDirs(path, config, prefix = "") {
    let ents = readdirSync(path),
        { writer, follow, levels } = config;

    ents = filterDirs(ents, path, config);
    for (let i = 0, len = ents.length; i < len; i++) {
        let { type, bpath, fpath, lpath, dev, inode } = ents[i];
        writer.write(`\n${prefix}${i === len - 1 ? "└── " : "├── "}${bpath}`);

        if (type & IS_LINK) {
            fpath = lpath[0] === "/" ? lpath : `${path}/${lpath}`;
            writer.write(` -> ${lpath}`);
        }

        if (type & IS_FILE) filecount++;
        else if (type & IS_DIR) {
            dircount++;
            if (type & IS_LINK) {
                if (!follow) continue;
                else if (existsIno(dev, inode)) {
                    writer.write(" [recursive, not followed]");
                    continue;
                } else saveIno(dev, inode);
            }
            if (levels !== -1) config.levels = levels - 1;
            if (levels) {
                saveIno(dev, inode);
                recurseDirs(fpath, config, `${prefix}${i === len - 1 ? "    " : "│   "}`);
            }
        }
    }
}


function main() {
    let args = process.argv.slice(2),
        paths = [],
        config = {
            writer: process.stdout,
            all: false,
            follow: false,
            levels: -1
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
                        errorAndExit(0, help);
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
                    case "L": {
                        let l = args[n++];
                        if (!l)
                            errorAndExit(1, "narra: missing argument to -L\n");
                        else if (Number.isNaN(l = Number(l)) || --l < 0)
                            errorAndExit(1, "narra: invalid level, must be greater than zero\n");
                        config.levels = l;
                    }
                        break;
                    default:
                        errorAndExit(1, `narra: -${letter} not implemented\n`, usage);
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
        writer.write("\n");
    }
    writer.write(`\n${dircount} director${dircount === 1 ? "y" : "ies"}, ${filecount} file${filecount === 1 ? "" : "s"}\n`);
}

main();
