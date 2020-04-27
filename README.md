[![License](https://img.shields.io/github/license/tnekent/narra)](LICENSE)
![npm-version](https://img.shields.io/npm/v/narra)

# Narra
A port of the useful [tree](http://mama.indstate.edu/users/ice/tree/) directory listing program in JavaScript.

## Usage
```
narra [..options] <..directories>
```

| Option | Description |
| ------ | ----------- |
| -h, --help | Show help message. |
| -a, --all | Include dot-prefixed files in listing. |
| -l, --follow | Follow symbolic links. |
| -d, --depth | Takes a number N greater than 0; descend N directories only. |
| --dirs-only | Display directories only. |
| -f | Display the offset path of each entry from top directory. |
| -x | Stay on the current filesystem only. |
| -g | Takes a glob pattern and filter files by it. Uses [picomatch](https://github.com/micromatch/picomatch) syntax and matching. Can be specified multiple times for different globs. |
