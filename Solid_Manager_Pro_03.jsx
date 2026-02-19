/*
    SOLID CONSOLIDATOR v4 (Aggressive Cleanup Edition)
    
    FEATURES:
    - Dry Run Analysis.
    - Consolidates Solids/Nulls/Adj Layers.
    - Unix-friendly naming.
    - AGGRESSIVE CLEANUP: Repeats folder scan until no empty folders exist.
    - Protects ONLY the Root "Solids" folder; destroys nested "Solids" folders.
*/

(function() {
    if (!app.project) { alert("Please open a project."); return; }

    // --- 1. ANALYSIS PHASE ---
    var proj = app.project;
    var solidsFolder = null;
    var targetFolderName = "Solids";
    
    // Data storage
    var groups = {}; 
    var totalSolids = 0;
    var nullsCount = 0;
    var adjCount = 0;
    var regularCount = 0;

    // Scan Project Items
    for (var i = 1; i <= proj.numItems; i++) {
        var item = proj.item(i);
        
        if (item instanceof FootageItem && item.mainSource instanceof SolidSource) {
            totalSolids++;
            
            // Generate Unique Signature
            var s = item.mainSource;
            var hex = rgbToHex(s.color);
            var sizeKey = item.width + "x" + item.height + "_" + item.pixelAspect;
            
            // Determine Type
            var typePrefix = "SOLID";
            if (/null/i.test(item.name)) {
                typePrefix = "NULL";
                nullsCount++;
            }
            else if (/adjustment/i.test(item.name)) {
                typePrefix = "ADJ";
                adjCount++;
            }
            else {
                regularCount++;
            }

            var key = typePrefix + "_" + hex + "_" + sizeKey;

            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        }
    }

    // Calculate Stats
    var duplicatesToKill = 0;
    for (var key in groups) {
        var list = groups[key];
        if (list.length > 1) {
            duplicatesToKill += (list.length - 1);
        }
    }

    // --- 2. DRY RUN UI REPORT ---
    var report = "SOLID CONSOLIDATOR - DRY RUN REPORT\n";
    report += "------------------------------------------------\n";
    report += "Total Solids Found: " + totalSolids + "\n";
    report += "   - Visual Solids: " + regularCount + "\n";
    report += "   - Null Objects: " + nullsCount + "\n";
    report += "   - Adjustment Layers: " + adjCount + "\n\n";
    
    report += "ACTION PLAN:\n";
    report += "1. Move survivors to root '/" + targetFolderName + "' folder.\n";
    report += "2. Consolidate Duplicates: " + duplicatesToKill + " items will be deleted.\n";
    report += "3. Rename Survivors (Unix Style).\n";
    
    var w = new Window("dialog", "Dry Run Analysis");
    w.orientation = "column";
    w.alignChildren = "left";
    
    var txt = w.add("statictext", undefined, report, {multiline:true});
    txt.preferredSize = [400, 200];
    
    // CHECKBOX
    var chkClean = w.add("checkbox", undefined, "Recursively delete ALL empty folders");
    chkClean.value = true;
    
    var grp = w.add("group");
    grp.alignment = "center";
    var btnCancel = grp.add("button", undefined, "Cancel", {name:"cancel"});
    var btnOk = grp.add("button", undefined, "PROCEED", {name:"ok"});

    if (w.show() !== 1) {
        return; // User cancelled
    }

    var doCleanup = chkClean.value;


    // --- 3. EXECUTION PHASE ---
    app.beginUndoGroup("Consolidate Solids");

    try {
        // A. Create/Find Target Folder
        // We must find the exact object to protect it from deletion later
        for (var i = 1; i <= proj.rootFolder.numItems; i++) {
            var item = proj.rootFolder.item(i);
            if (item instanceof FolderItem && item.name === targetFolderName) {
                solidsFolder = item;
                break;
            }
        }
        if (!solidsFolder) solidsFolder = proj.items.addFolder(targetFolderName);

        // B. Get all layers (only if we have duplicates to process)
        var allCompLayers = [];
        if (duplicatesToKill > 0) {
            for (var i = 1; i <= proj.numItems; i++) {
                if (proj.item(i) instanceof CompItem) {
                    var comp = proj.item(i);
                    for (var l = 1; l <= comp.numLayers; l++) {
                        allCompLayers.push(comp.layer(l));
                    }
                }
            }
        }

        // C. Process Groups
        for (var key in groups) {
            var list = groups[key];
            var master = list[0]; // Survivor

            // 1. Handle Duplicates
            if (list.length > 1) {
                for (var d = 1; d < list.length; d++) {
                    var dup = list[d];
                    for (var l = 0; l < allCompLayers.length; l++) {
                        if (allCompLayers[l].source === dup) {
                            allCompLayers[l].replaceSource(master, false);
                        }
                    }
                    dup.remove();
                }
            }

            // 2. Move & Rename Master
            master.parentFolder = solidsFolder;
            
            var s = master.mainSource;
            var hex = rgbToHex(s.color);
            var dim = master.width + "x" + master.height;
            var newName = "";

            if (key.indexOf("NULL") === 0) {
                newName = "Null_" + dim; 
            } else if (key.indexOf("ADJ") === 0) {
                newName = "Adjustment_Layer_" + dim;
            } else {
                newName = "Solid_" + hex + "_" + dim;
            }

            master.name = getUniqueName(proj, newName);
        }

        // D. AGGRESSIVE CLEANUP (Repeated Sweeps)
        // We loop the cleanup function until it reports that NOTHING was deleted.
        // This ensures that if Folder B is inside Folder A, and we delete B, 
        // Folder A becomes empty and gets deleted in the next pass.
        if (doCleanup) {
            var foldersDeleted = 0;
            var iterations = 0;
            var somethingDeleted = true;

            while (somethingDeleted && iterations < 50) { // Safety break at 50 loops
                somethingDeleted = cleanEmptyFolders(proj.rootFolder, solidsFolder); 
                if (somethingDeleted) foldersDeleted++;
                iterations++;
            }
        }

        alert("Success. Project cleaned.");

    } catch(e) {
        alert("Error: " + e.toString());
    } finally {
        app.endUndoGroup();
    }


    // --- HELPERS ---

    function rgbToHex(colorArr) {
        var r = Math.round(colorArr[0] * 255);
        var g = Math.round(colorArr[1] * 255);
        var b = Math.round(colorArr[2] * 255);
        return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    function getUniqueName(proj, baseName) {
        var name = baseName;
        var inc = 1;
        while (checkNameExists(proj, name)) {
            name = baseName + "_" + inc;
            inc++;
        }
        return name;
    }

    function checkNameExists(proj, name) {
        for (var i = 1; i <= proj.numItems; i++) {
            if (proj.item(i).name === name) return true;
        }
        return false;
    }

    function cleanEmptyFolders(parentFolder, protectFolder) {
        var deletedSomething = false;
        // Loop backwards
        for (var i = parentFolder.numItems; i >= 1; i--) {
            var item = parentFolder.item(i);
            if (item instanceof FolderItem) {
                // Recursive dive first
                var childDeleted = cleanEmptyFolders(item, protectFolder);
                if (childDeleted) deletedSomething = true;
                
                // NOW check if current folder is empty
                // Crucial: We check ID to ensure we don't delete the Master Solids folder
                // regardless of what it is named.
                if (item.numItems === 0 && item.id !== protectFolder.id) {
                    item.remove();
                    deletedSomething = true;
                }
            }
        }
        return deletedSomething;
    }

})();