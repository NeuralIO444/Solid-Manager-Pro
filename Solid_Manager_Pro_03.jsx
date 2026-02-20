/*
    SOLID MANAGER PRO v4
    
    FEATURES:
    - Object-oriented Module Pattern (SolidManagerPro module)
    - Dockable ScriptUI Panel support with Branding Banner
    - Dry Run Analysis.
    - Consolidates Solids/Nulls/Adj Layers.
    - Unix-friendly naming.
    - AGGRESSIVE CLEANUP: Repeats folder scan until no empty folders exist.
    - Protects ONLY the Root "Solids" folder; destroys nested "Solids" folders.
    - Performance Optimization: Uses item.usedIn for fast replacement.
*/

(function (thisObj) {
    // --- MODULE DEFINITION ---
    var SolidManagerPro = {};

    // --- CONFIGURATION ---
    SolidManagerPro.config = {
        targetFolderName: "Solids",
        bannerImageName: "SolidManagerBanner.png",
        bannerWidth: 466,
        bannerHeight: 262
    };

    // --- STATE ---
    SolidManagerPro.state = {
        groups: {},
        totalSolids: 0,
        nullsCount: 0,
        adjCount: 0,
        regularCount: 0,
        duplicatesToKill: 0
    };

    // --- UTILS ---
    SolidManagerPro.utils = {
        rgbToHex: function (colorArr) {
            var r = Math.round(colorArr[0] * 255);
            var g = Math.round(colorArr[1] * 255);
            var b = Math.round(colorArr[2] * 255);
            return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
        },
        getUniqueName: function (proj, baseName) {
            var name = baseName;
            var inc = 1;
            while (this.checkNameExists(proj, name)) {
                name = baseName + "_" + inc;
                inc++;
            }
            return name;
        },
        checkNameExists: function (proj, name) {
            for (var i = 1; i <= proj.numItems; i++) {
                if (proj.item(i).name === name) return true;
            }
            return false;
        }
    };

    // --- SCANNER ---
    SolidManagerPro.scanner = {
        reset: function () {
            SolidManagerPro.state.groups = {};
            SolidManagerPro.state.totalSolids = 0;
            SolidManagerPro.state.nullsCount = 0;
            SolidManagerPro.state.adjCount = 0;
            SolidManagerPro.state.regularCount = 0;
            SolidManagerPro.state.duplicatesToKill = 0;
        },
        scan: function (proj) {
            this.reset();

            for (var i = 1; i <= proj.numItems; i++) {
                var item = proj.item(i);

                if (item instanceof FootageItem && item.mainSource instanceof SolidSource) {
                    SolidManagerPro.state.totalSolids++;

                    var s = item.mainSource;
                    var hex = SolidManagerPro.utils.rgbToHex(s.color);
                    var sizeKey = item.width + "x" + item.height + "_" + item.pixelAspect;

                    var typePrefix = "SOLID";
                    if (/null/i.test(item.name)) {
                        typePrefix = "NULL";
                        SolidManagerPro.state.nullsCount++;
                    } else if (/adjustment/i.test(item.name)) {
                        typePrefix = "ADJ";
                        SolidManagerPro.state.adjCount++;
                    } else {
                        SolidManagerPro.state.regularCount++;
                    }

                    var key = typePrefix + "_" + hex + "_" + sizeKey;

                    if (!SolidManagerPro.state.groups[key]) {
                        SolidManagerPro.state.groups[key] = [];
                    }
                    SolidManagerPro.state.groups[key].push(item);
                }
            }

            for (var key in SolidManagerPro.state.groups) {
                var list = SolidManagerPro.state.groups[key];
                if (list.length > 1) {
                    SolidManagerPro.state.duplicatesToKill += (list.length - 1);
                }
            }

            return SolidManagerPro.state;
        }
    };

    // --- CLEANER ---
    SolidManagerPro.cleaner = {
        cleanEmptyFolders: function (parentFolder, protectFolder) {
            var deletedSomething = false;
            for (var i = parentFolder.numItems; i >= 1; i--) {
                var item = parentFolder.item(i);
                if (item instanceof FolderItem) {
                    var childDeleted = this.cleanEmptyFolders(item, protectFolder);
                    if (childDeleted) deletedSomething = true;

                    if (item.numItems === 0 && item.id !== protectFolder.id) {
                        item.remove();
                        deletedSomething = true;
                    }
                }
            }
            return deletedSomething;
        }
    };

    // --- PROCESSOR ---
    SolidManagerPro.processor = {
        execute: function (doCleanup) {
            if (!app.project) { alert("Please open a project."); return; }
            var proj = app.project;

            app.beginUndoGroup("Consolidate Solids");
            try {
                // Find or Create Root "Solids" Folder
                var solidsFolder = null;
                for (var i = 1; i <= proj.rootFolder.numItems; i++) {
                    var item = proj.rootFolder.item(i);
                    if (item instanceof FolderItem && item.name === SolidManagerPro.config.targetFolderName) {
                        solidsFolder = item;
                        break;
                    }
                }
                if (!solidsFolder) {
                    solidsFolder = proj.items.addFolder(SolidManagerPro.config.targetFolderName);
                }

                // Process Groups
                var groups = SolidManagerPro.state.groups;
                for (var key in groups) {
                    var list = groups[key];
                    var master = list[0];

                    // 1. Replace Duplicates using item.usedIn for massive speedup
                    if (list.length > 1) {
                        for (var d = 1; d < list.length; d++) {
                            var dup = list[d];
                            var usedInComps = dup.usedIn; // Array of CompItems where this dup is used

                            // Replace in all comps where it is used
                            for (var c = 0; c < usedInComps.length; c++) {
                                var comp = usedInComps[c];
                                for (var l = 1; l <= comp.numLayers; l++) {
                                    if (comp.layer(l).source === dup) {
                                        comp.layer(l).replaceSource(master, false);
                                    }
                                }
                            }
                            // Delete the duplicate item from the project
                            dup.remove();
                        }
                    }

                    // 2. Move & Rename Master
                    master.parentFolder = solidsFolder;

                    var s = master.mainSource;
                    var hex = SolidManagerPro.utils.rgbToHex(s.color);
                    var dim = master.width + "x" + master.height;
                    var newName = "";

                    if (key.indexOf("NULL") === 0) {
                        newName = "Null_" + dim;
                    } else if (key.indexOf("ADJ") === 0) {
                        newName = "Adjustment_Layer_" + dim;
                    } else {
                        newName = "Solid_" + hex + "_" + dim;
                    }

                    master.name = SolidManagerPro.utils.getUniqueName(proj, newName);
                }

                // Aggressive Cleanup
                if (doCleanup) {
                    var iterations = 0;
                    var somethingDeleted = true;
                    while (somethingDeleted && iterations < 50) {
                        somethingDeleted = SolidManagerPro.cleaner.cleanEmptyFolders(proj.rootFolder, solidsFolder);
                        iterations++;
                    }
                }

                alert("Success. Project cleaned.");
            } catch (e) {
                alert("Error: " + e.toString());
            } finally {
                app.endUndoGroup();
            }
        }
    };

    // --- UI ---
    SolidManagerPro.ui = {
        build: function (thisObj) {
            var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Solid Manager Pro", undefined, { resizeable: true });
            win.orientation = "column";
            win.alignChildren = ["fill", "top"];
            win.spacing = 10;
            win.margins = 10;

            // 1. Branding Banner
            var bannerGroup = win.add("group");
            bannerGroup.alignment = ["center", "top"];

            var scriptFile = (typeof system !== "undefined") ? new File($.fileName) : null;
            var bannerFile = null;
            if (scriptFile) {
                // Attempt to locate banner relative to the script
                bannerFile = new File(scriptFile.parent.fsName + "/" + SolidManagerPro.config.bannerImageName);
            }

            if (bannerFile && bannerFile.exists) {
                var bannerImg = bannerGroup.add("image", undefined, bannerFile);
                // Hardcode dimensions as requested
                bannerImg.preferredSize = [SolidManagerPro.config.bannerWidth, SolidManagerPro.config.bannerHeight];
            } else {
                // Fallback UI
                var bannerPlaceholder = bannerGroup.add("panel", [0, 0, SolidManagerPro.config.bannerWidth, SolidManagerPro.config.bannerHeight]);
                var bannerTxt = bannerPlaceholder.add("statictext", undefined, "Banner Missing:\n" + SolidManagerPro.config.bannerImageName);
                bannerTxt.alignment = ["center", "center"];
                bannerTxt.justify = "center";
            }

            // 2. Scan Button & Results
            var scanBtn = win.add("button", undefined, "Scan Project");
            var resultsPanel = win.add("panel", undefined, "Dry Run Report");
            resultsPanel.orientation = "column";
            resultsPanel.alignChildren = ["fill", "top"];

            var txtReport = resultsPanel.add("statictext", undefined, "Click 'Scan Project' to analyze solids.", { multiline: true });
            txtReport.preferredSize.height = 120;

            // 3. Options
            var optsGroup = win.add("group");
            optsGroup.orientation = "column";
            optsGroup.alignChildren = ["left", "top"];
            var chkClean = optsGroup.add("checkbox", undefined, "Recursively delete ALL empty folders");
            chkClean.value = true;

            // 4. Execute Button
            var execBtn = win.add("button", undefined, "CONSOLIDATE");
            execBtn.enabled = false;

            // --- EVENT LISTENERS ---
            scanBtn.onClick = function () {
                if (!app.project) { alert("Please open a project."); return; }

                var stats = SolidManagerPro.scanner.scan(app.project);

                var report = "Total Solids Found: " + stats.totalSolids + "\n";
                report += "   - Visual Solids: " + stats.regularCount + "\n";
                report += "   - Null Objects: " + stats.nullsCount + "\n";
                report += "   - Adjustment Layers: " + stats.adjCount + "\n\n";
                report += "ACTION PLAN:\n";
                report += "1. Move survivors to root '/" + SolidManagerPro.config.targetFolderName + "' folder.\n";
                report += "2. Defeat Duplicates: " + stats.duplicatesToKill + " items will be eliminated.\n";
                report += "3. Rename Survivors (Unix Style).";

                txtReport.text = report;
                execBtn.enabled = true;
            };

            execBtn.onClick = function () {
                SolidManagerPro.processor.execute(chkClean.value);
                txtReport.text = "Click 'Scan Project' to analyze solids.";
                execBtn.enabled = false;
            };

            win.onResizing = win.onResize = function () {
                this.layout.resize();
            };

            return win;
        }
    };

    // --- INITIALIZATION ---
    var scriptUI = SolidManagerPro.ui.build(thisObj);
    if (scriptUI instanceof Window) {
        scriptUI.center();
        scriptUI.show();
    } else {
        scriptUI.layout.layout(true);
        scriptUI.layout.resize();
    }

})(this);