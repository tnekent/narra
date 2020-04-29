const { readdirSync, accessSync, readlinkSync, statSync } = require("fs");
const { isMatch } = require("picomatch");

class EntryFilter {
   constructor(options) {
      this.options = options;
   }

   filter(direntlist) {
      return direntlist.filter(dirent => {
         return (
            this.filterHidden(dirent) &&
            this.filterNonDirectoryByGlob(dirent) &&
            this.filterDirsOnly(dirent)
         );
      });
   }

   filterDirsOnly(dirent) {
      return this.options.dirsOnly === true && !dirent.isDirectory()
         ? false
         : true;
   }

   filterHidden(dirent) {
      return this.options.a !== true && dirent.name[0] === "." ? false : true;
   }

   // Since -g by default does not filter directory names
   filterNonDirectoryByGlob(dirent) {
      return dirent.isDirectory() ? true : this.filterByGlob(dirent);
   }

   filterByGlob(dirent) {
      return typeof this.options.g !== "undefined" &&
         !isMatch(dirent.name, this.options.g)
         ? false
         : true;
   }
}

class Entry {
   constructor(path, parentDir) {
      this.path = path;
      this.offsetPath = parentDir + path;
   }

   getPath(full) {
      return full ? this.offsetPath : this.path;
   }

   static getEntryType(dirent, parentDir) {
      return dirent.isDirectory()
         ? new Directory(dirent.name, parentDir)
         : dirent.isSymbolicLink()
         ? new SymbolicLink(dirent.name, parentDir)
         : new RegularFile(dirent.name, parentDir);
   }
}

class RegularFile extends Entry {}

class EntryContainer extends Entry {
   constructor(path, parentDir) {
      super(path, parentDir);
      this.stats = null;
   }

   getDirents() {
      return readdirSync(this.offsetPath, { withFileTypes: true });
   }

   getDev() {
      return this.getStats().dev;
   }

   getStats() {
      if (this.stats === null) this.stats = statSync(this.offsetPath);
      return this.stats;
   }

   getInode() {
      return this.getStats().ino;
   }

   // abstract isTraversable(options);
}

class Directory extends EntryContainer {
   isTraversable() {
      return true;
   }
}

class SymbolicLink extends EntryContainer {
   getPath(full) {
      const linkedPath = readlinkSync(this.offsetPath);
      return `${super.getPath(full)} -> ${linkedPath}`;
   }

   isTraversable() {
      return this.getStats().isDirectory();
   }
}

class DirectoryTraverser {
   constructor(options, inodeSet) {
      this.inodeSet = inodeSet;
      this.options = options;
      this.dev = null;
      this.dircount = 0;
      this.filecount = 0;
   }

   traverseAt(dir) {
      DirectoryTraverser.checkDirAccess(dir);
      process.stdout.write(dir.getPath(""));
      if (this.options.x) this.dev = dir.getDev();
      this.traverse(dir, this.options.d - 1, "");
   }

   traverse(traversable, level, lastPrefix) {
      const entries = this.getEntries(traversable);

      for (let i = 0, { length } = entries; i < length; i++) {
         let entry = entries[i],
            prefix = `\n${lastPrefix}${i === length - 1 ? "└── " : "├── "}`;
         process.stdout.write(prefix + entry.getPath(this.options.f));
         this.incrementCount(entry);
         if (this.isTraversable(entry, level)) {
            const prefix = `${lastPrefix}${i === length - 1 ? "    " : "│   "}`,
               nextLevel = level > 0 ? level - 1 : level;
            this.traverse(entry, nextLevel, prefix);
         }
      }
   }

   incrementCount(entry) {
      if (entry instanceof EntryContainer && entry.isTraversable())
         this.dircount++;
      else this.filecount++;
   }

   // eslint-disable-next-line complexity
   isTraversable(entry, level) {
      if (entry instanceof EntryContainer && level !== 0) {
         const traversable =
            this.options.l !== true && entry instanceof SymbolicLink
               ? false
               : entry.isTraversable();
         return traversable && this.checkDev(entry) && this.checkInode(entry);
      }
      return false;
   }

   checkDev(entry) {
      return !this.options.x ? true : entry.getDev() === this.dev;
   }

   checkInode(entry) {
      if (this.options.l) {
         const inode = entry.getInode();
         if (entry instanceof SymbolicLink && this.inodeSet.has(inode)) {
            process.stdout.write(" [recursive, not followed]");
            return false;
         }
         this.inodeSet.add(inode);
      }
      return true;
   }

   getEntries(traversable) {
      return new EntryFilter(this.options)
         .filter(traversable.getDirents())
         .map(dirent =>
            // We add a slash to fromDir because `readdir` does not append slashes
            // in its results. This way we would'nt be using functions `join` or the
            // like from the path module, which can have overhead.
            Entry.getEntryType(dirent, `${traversable.offsetPath}/`)
         );
   }

   // eslint-disable-next-line consistent-return
   static checkDirAccess(dir) {
      try {
         return accessSync(dir.offsetPath);
      } catch (e) {
         if (e.code === "ENOENT")
            process.stderr.write(" [error opening dir]\n");
         else throw e;
      }
   }
}

module.exports = function (dirpaths, options) {
   const inodeSet = new Set(),
      traverser = new DirectoryTraverser(options, inodeSet);

   for (const path of dirpaths) {
      let dir = new Directory(path, "");
      traverser.traverseAt(dir);
   }

   const filecount = `${traverser.filecount} file${
         traverser.filecount !== 1 ? "s" : ""
      }`,
      dircount = `${traverser.dircount} director${
         traverser.dircount !== 1 ? "ies" : "y"
      }`;
   process.stdout.write(`\n\n${dircount}, ${filecount}`);
};
