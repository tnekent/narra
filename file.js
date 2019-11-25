const { readdirSync, readlinkSync, lstatSync, statSync } = require("fs");
const { IS_FILE, IS_LINK, IS_DIR, getFtype, saveIno, existsIno } = require("./util");

let filecount = 0, dircount = 0;
let config;
let inotable = [];
let xdev;

function filterDirs(ents, path) {
    let filtered = [];
    let { all, dirsOnly } = config;

    for (const e of ents) {
        // Works only if `e` is not a full path
        if (!all && e[0] === ".") continue;

        let fpath = `${path}/${e}`,
            st = lstatSync(fpath),
            type = getFtype(st);
        if (dirsOnly && type & IS_FILE) continue;
        let desc = { type, bpath: e, fpath, lpath: null, dev: null, inode: null };
		
        if (type & IS_LINK) {
            try {
                st = statSync(fpath);
            } catch (err) {
                // Symlink is an orphan
                if (err.code === "ENOENT") desc.type |= IS_FILE;
                else throw err;
            }
            desc.type |= getFtype(st);
            if (dirsOnly && desc.type & IS_FILE) continue;
            desc.lpath = readlinkSync(fpath);
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

function recurseDirs(path, prefix = "") {
    let ents = readdirSync(path),
        { writer, follow, levels, fullpath } = config;

    ents = filterDirs(ents, path);
    for (let i = 0, len = ents.length; i < len; i++) {
        let { type, bpath, fpath, lpath, dev, inode } = ents[i];
        writer.write(`\n${prefix}${i === len - 1 ? "└── " : "├── "}${fullpath ? fpath : bpath}`);

        if (type & IS_LINK) {
            fpath = lpath[0] === "/" ? lpath : `${path}/${lpath}`;
            writer.write(` -> ${lpath}`);
        }

        if (type & IS_FILE) filecount++;
        else if (type & IS_DIR) {
            dircount++;
            if (dev !== xdev) continue;
            if (type & IS_LINK) {
                if (!follow) continue;
                else if (existsIno(inotable, dev, inode)) {
                    writer.write(" [recursive, not followed]");
                    continue;
                } else saveIno(inotable, dev, inode);
            }
            if (levels !== -1) config.levels = levels - 1;
            if (levels) {
                saveIno(inotable, dev, inode);
                recurseDirs(fpath, `${prefix}${i === len - 1 ? "    " : "│   "}`);
            }
        }
    }
}

function traverseDownFrom(path, _config) {
    if (_config.xdev) xdev = statSync(path).dev;
    config = { ..._config };
    recurseDirs(path);
    return [filecount, dircount];   
}

module.exports = traverseDownFrom;