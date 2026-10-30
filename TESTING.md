# Testing Multi-Scene in Foundry v14

The automated tests (`node --test`) cover the logic that does not need Foundry. This checklist covers what only a real Foundry v14 world can show. Go through it in order and note anything that differs.

## Install

Either paste the manifest URL into Foundry's Install Module dialog:

```
https://github.com/AprilLiar/DC20_Mass_Scene_Creator/releases/latest/download/module.json
```

or copy the repository contents into `Data/modules/multi-scene/`. Enable **Multi-Scene** in a world (any game system) and log in as Gamemaster.

After updating the module to a new version, reload the world with a hard refresh once (Ctrl+Shift+R, or Ctrl+F5) so the browser drops old copies of the module files.

Have a test folder ready with: a few images of different sizes, one sub-folder with more images, one video (webm or mp4), and one file that is not a picture (for example a .txt).

## 1. The button and the window

1. Open the Scenes tab. A **Multi-Scene** button should be next to Create Scene / Create Folder. If it is somewhere odd, tell me where it appeared.
2. Click it. A normal Foundry window titled Multi-Scene should open, covering the whole screen (including the sidebar and the hotbar), with the files area on the left and the options on the right.
3. Check it behaves like any Foundry window: drag it by the title bar, resize it from the bottom-right corner, minimize it, and close it with the X. Open it again after closing.

## 2. Adding files

4. Drag a folder (with a sub-folder) into the window. Every picture and the video appears as a row; names look like `Dark Forest 01` (underscores and dashes became spaces). The .txt file gives one warning.
5. Try Browse files and Browse folder.
6. Drop more files: they appear at the end of the list, and names you already edited stay as typed.
7. Remove a row with its X. Hover the video preview: it plays, muted, and stops when you leave it.

## 3. Options panel

8. Right 30% shows: Disable Vision (on), Disable Grid (on), Set Background color automatically (on), Scene Transition (Wind selected), Padding (0), Scene folder (No folder), Show in navigation bar (off).
9. The transition list should show Foundry's transitions. If Wind is missing a warning appears under it (tell me what the list contains).
10. The folder list shows your Scene folders; "New folder..." reveals a name field.
11. Change a few values, close the window, open it again: the values are remembered.

## 4. Creating

12. Click **Create Scenes**. Progress shows, the controls are locked, then the window closes and a notification gives the count.
13. In the Scenes tab, check the new Scenes: names as typed, thumbnails present, and none in the top navigation bar.
14. Open the configuration of a Scene that Multi-Scene created (its Background Image path starts with `worlds/<world>/mass-scenes/` and the file name ends with a short hash; Scenes you made earlier are not a valid test) and check:
    - Basics tab, Initial Level section: Background Image is that path, and Background Color is not the default grey `#999999` but the picture's main color.
    - Token Vision is unchecked and the Grid type is Gridless (Visibility and Grid tabs).
    - Transition type is Wind.
    - Padding is 0, and the Scene dimensions equal the picture size.
    - There is one Level with the picture as its background.
15. Activate a Scene and look at the canvas: the picture fills the Scene.
16. Look in `Data/worlds/<world>/mass-scenes/`: files are named like `Dark_Forest_01-3fa9c1d2.png`.
17. Run the same folder again: no new files appear in that folder (existing ones are reused).

## 5. Optional edge cases

18. Choose a Scene folder and a new folder name and create: Scenes land in it.
19. Turn the options off, create: tokenVision/grid/background color stay at Foundry's defaults.
20. Close the window while it is creating: it stops after the current Scene and says how many were made.

## If something goes wrong

Open the browser console (F12) and copy any lines starting with `multi-scene |` or any red errors, together with what you were doing. The most useful report is the exact step number above and what you saw instead.
