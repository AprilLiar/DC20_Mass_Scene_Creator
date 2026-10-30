# Multi-Scene

A system-agnostic module for Foundry VTT v14 that creates many Scenes at once.

Adds a **Multi-Scene** button to the Scenes tab. It opens a full-screen window where you drop image or video files (or a whole folder), edit the future Scene names, choose a few options, and create all Scenes in one go.

## Usage

1. Open the Scenes tab and click **Multi-Scene**.
2. Drop images, videos or a whole folder into the window (or use Browse files / Browse folder). Each file becomes a row; edit the Scene name next to its preview.
3. Choose options on the right: Disable Vision, Disable Grid, automatic background color, Scene Transition, padding, Scene folder, and whether the Scenes show in the navigation bar.
4. Click **Create Scenes**. Files are uploaded to `worlds/<world>/mass-scenes/` and one Scene is created per row.

Status: working in Foundry v14. A manual test checklist is in [TESTING.md](TESTING.md); the design is in [PLAN.md](PLAN.md).

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
