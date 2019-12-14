# Narra
Tree, a recursive directory listing program, ported in JavaScript

## Usage
```
usage: narra [-h] [-adflx] [-L <levels>] [-P <pattern>] [<directory list>]
```

| Option | Description |
| ------ | ----------- |
| h | Show help |
| a | Show all files, including dot-prefixed files |
| l | Follow symbolic links |
| L | Takes a number N (greater than 0); descend only N directories |
| d | Display directories only |
| f | Display the full path of each file and directory |
| x | Stay on the current filesystem only |
| P | Takes a pattern and filter files by it. Uses [picomatch](https://github.com/micromatch/picomatch) internally |

## Contribution
You can report bugs and pull requests at https://github.com/tnekent/narra.

## Todo
* Implement options
* Show colors
* Output to other formats (e.g. YAML)
