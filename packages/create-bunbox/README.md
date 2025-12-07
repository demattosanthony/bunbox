# create-bunbox

Scaffold a new [Bunbox](https://github.com/demattosanthony/bunbox) project with a single command.

## Usage

```bash
bun create bunbox my-app
```

You'll be prompted to configure your project. Or pass options directly:

```bash
bun create bunbox my-app --template tailwind
```

## Templates

| Template   | Description                                      |
| ---------- | ------------------------------------------------ |
| `basic`    | Simple pages and API routes                      |
| `tailwind` | Tailwind CSS + shadcn/ui components              |
| `full`     | Complete example with WebSockets, streaming, SSR |

## Options

```
-t, --template <name>  Template to use (basic, tailwind, full)
--skip-git             Skip git initialization
--skip-install         Skip dependency installation
-h, --help             Show help message
-v, --version          Show version number
```

## Examples

```bash
# Interactive mode
bun create bunbox

# With project name
bun create bunbox my-app

# Specify template
bun create bunbox my-app -t tailwind

# Skip prompts
bun create bunbox my-app --template full --skip-git --skip-install
```

## Requirements

- [Bun](https://bun.sh) >= 1.0.36

## License

MIT
