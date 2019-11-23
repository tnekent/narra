const { accessSync } = require("fs");
const { errorAndExit } = require("./util");
const traverseDownFrom = require("./file");

const usage = `
usage: narra [-h] [-la] [-L <levels>] [<directory list>]
`;
const help = `\
${usage}

-h         print this help message and exit
-a         include dot-prefixed files
-l         follow symbolic links
-L <level> descend only \`level\` directories
`;

function main() {
    let args = process.argv.slice(2),
        paths = [],
        config = {
            writer: process.stdout,
            all: false,
            follow: false,
            levels: -1,
            fullpath: false,
            dirsOnly: false
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
                    case "d":
                        config.dirsOnly = true;
                        break;
                    case "f":
                        config.fullpath = true;
                        break;
                    default:
                        errorAndExit(1, `narra: -${letter} not implemented\n`, usage);
                }
            }
        } else paths.push(arg);
    }
    if (!paths.length) paths.push("."); 
    let filecount, dircount;
    for (const p of paths) {
        try {
            accessSync(p);  
        } catch (e) {
            if (e.code === "ENOENT")
                errorAndExit(2, `${p} [error opening dir]\n`);
            else throw e; 
        }
        writer.write(p);
        [filecount, dircount] = traverseDownFrom(p, config);
        writer.write("\n");
    }
    writer.write(`\n${dircount} director${dircount === 1 ? "y" : "ies"}`);
    if (!config.dirsOnly) writer.write(`, ${filecount} file${filecount === 1 ? "" : "s"}`);
    writer.write("\n");
}

main();
