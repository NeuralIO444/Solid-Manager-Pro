<div align="center">
  <img src="https://github.com/NeuralIO444/Solid-Manager-Pro/blob/main/SolidManagerBanner.png?raw=true" alt="Solid Manager Pro Banner" width="466" height="262">
  
  # Solid Manager Pro

  *The ultimate consolidation and cleanup tool for your Adobe After Effects workflow.*
</div>

---

## What is Solid Manager Pro?
**Solid Manager Pro** is a robust Adobe After Effects script that analyzes your project, identifies duplicate solids, nulls, and adjustment layers, consolidates them efficiently, and aggressively cleans up any empty folders left behind. 

It is designed to handle massive enterprise-level projects with lightning-fast execution times, ensuring that your project stays organized without slowing down your computer.

## Features
- 🚀 **Lightning Fast Replacement:** Built using the `item.usedIn` API optimization, the script directly replaces layer sources only in the comps where they are utilized instead of blindly iterating through every comp in the project.
- 🧩 **UI Dockable Panel:** Can act as both a standalone window dialog or a dockable script panel directly integrated into your After Effects workspace.
- 🔍 **Dry Run Support:** Provides a full analysis report *before* you execute the consolidation, showing exactly how many items exist and how many duplicates are queued for replacement.
- 🧹 **Aggressive Folder Cleanup:** Safe, recursive nested empty-folder deletion ensures that no unnecessary folders remain once solids are moved.
- 📂 **Protected Master Directory:** Automatically targets (or creates) a root `/Solids` directory to neatly pack all your assets, safely destroying other messy nested `Solids` folders.
- ⌨️ **Unix-Friendly Naming:** Automatically names your consolidated survivors cleanly (e.g. `Solid_FFFFFF_1920x1080`).

## Installation
1. Download the `Solid_Manager_Pro_03.jsx` script file and the corresponding `SolidManagerBanner.png` branding image.
2. Place both files into your After Effects scripts folder:
   - **Mac:** `/Applications/Adobe After Effects <Version>/Scripts/ScriptUI Panels/`
   - **Windows:** `C:\Program Files\Adobe\Adobe After Effects <Version>\Support Files\Scripts\ScriptUI Panels\`
3. Restart Adobe After Effects.
4. Launch the script directly from the **Window** menu at the very top of your application.
5. (Optional) Drag the panel tab to dock it anywhere within your workspace!

## How To Use
1. **Open** any heavily bloated After Effects project.
2. Ensure you have the **Solid Manager Pro** panel opened.
3. Click the **Scan Project** button.
   - The script will immediately tabulate all the Solids, Nulls, and Adjustment Layers in your project, grouping them by identifying traits (Type, Hex Color, and Resolution).
   - A summary report will be shown in the UI.
4. (Optional) Ensure the *Recursively delete ALL empty folders* option is checked if you'd like an aggressive project folder cleanup.
5. Click **CONSOLIDATE**.
   - The script will group duplicates, swap all active comp layers over to a single "Master/Survivor" item, and safely delete the remaining duplicates.
   - All masters will be neatly sorted into a unified `Solids` directory.


## Architecture & Compatibility
- **Module Patterned Architecture**: The code does not pollute the global DOM namespace.
- **ExtendScript ES3 Compatibility**: Written efficiently with `.jsx` standards, utilizing standard var/function patterns, maximizing backward tool compatibility for older versions of After Effects going back upwards of 10+ years.

---

> Built with care to rescue projects from Solid Folder Chaos.
>
## ⚠️ Liability & Warranty Disclaimer

**USE AT YOUR OWN RISK.**
Asset Assassin is a powerful tool that moves and standardizes hundreds of items within your After Effects project hierarchy. While designed with a safe 'Dry Run' mode, unforeseen plugin conflicts or interrupted executions can result in missing links or confused project structures if run directly on an active master without saving.

*   **No Warranty:** This software is provided "as is" without warranty of any kind, express or implied.
*   **No Liability:** The authors or copyright holders shall not be liable for any claim, damages, lost project files, missed deadlines, or other liability arising from the use of this software.
*   **Best Practice:** ALWAYS save a distinct incremental version of your `.aep` project file before executing a live `Scan & Organize`.

