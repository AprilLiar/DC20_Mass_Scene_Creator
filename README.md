# Multi-Scene

A system-agnostic module for Foundry VTT v14 that creates many Scenes at once.

Adds a **Multi-Scene** button to the Scenes tab. It opens a full-screen window where you drop image or video files (or a whole folder), edit the future Scene names, choose a few options, and create all Scenes in one go.

Status: under development. See [PLAN.md](PLAN.md) for the design and the implementation order.

## Install

In Foundry, open Add-on Modules, click Install Module, and paste this manifest URL:

```
https://github.com/AprilLiar/DC20_Mass_Scene_Creator/releases/latest/download/module.json
```

The URL works once the first release exists.

## Development

No build step. The repository contents are the module. Run the tests with Node 22 or newer:

```
node --test
```

Every push to `main` that changes more than Markdown files publishes a new GitHub Release (patch version bumped automatically).

## License

MIT
