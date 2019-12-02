const IS_FILE = 1,
    IS_DIR = 2,
    IS_LINK = 4;

function errorAndExit(code, ...msgs) {
    for (const msg of msgs)
        process.stderr.write(msg);
    process.exit(code);
}

function getFtype(stats) {
    return stats.isDirectory() ? IS_DIR
        : stats.isSymbolicLink() ? IS_LINK : IS_FILE;
} 

function saveIno(inotable, dev, inode) {
    let hash = inode & 255,
        inop = inotable[hash];
    if (!inop) {
        inotable[hash] = [[dev, inode]];
        return;
    }
    for (let i = 0, len = inop.length; i < len; i++) {
        let c = inop[i];
        if (c[0] === dev && c[1] === inode) return;
    }
    inop.push([dev, inode]);
}

function existsIno(inotable, dev, inode) {
    let hash = inode & 255;
    if (!inotable[hash]) return false;
    for (const ino of inotable[hash]) 
        if (ino[0] === dev && ino[1] === inode) return true;
    
    return false;
}

module.exports = {
    IS_FILE,
    IS_LINK,
    IS_DIR,
    errorAndExit,
    getFtype,
    saveIno,
    existsIno
};
