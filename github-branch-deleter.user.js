// ==UserScript==
// @name         GitHub Branch Deleter
// @namespace    https://github.com/InvictusNavarchus/github-branch-deleter
// @icon         https://github.githubassets.com/pinned-octocat.svg
// @icon64       https://github.githubassets.com/pinned-octocat.svg
// @downloadURL  https://raw.githubusercontent.com/InvictusNavarchus/github-branch-deleter/master/github-branch-deleter.user.js
// @updateURL    https://raw.githubusercontent.com/InvictusNavarchus/github-branch-deleter/master/github-branch-deleter.user.js
// @version      0.2.1
// @description  Adds a button to delete all non-default/protected branches on the GitHub branches page. Updated for 2025 UI changes.
// @author       Invictus Navarchus
// @match        https://github.com/*/*/branches*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    const config = {
        // Delay in milliseconds between deleting each branch.
        // This helps prevent rate-limiting and gives the UI time to update.
        deleteDelay: 200,
        // Selector for individual branch rows in the table.
        branchRowSelector: 'tbody[class*="TableBody"] tr[class*="TableRow"]',
        // Selector for the delete icon button within a branch row.
        deleteButtonSelector: 'button:has(svg.octicon-trash)'
    };

    /**
     * Creates a formatted timestamp string in HH:mm:ss format.
     * @returns {string} The formatted timestamp.
     */
    const getTimestamp = () => {
        return new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    /**
     * Enhanced logging function with emoji and timestamp.
     * @param {string} level - Log level (info, warn, error, success).
     * @param {string} message - The message to log.
     * @param {any} data - Optional additional data to log.
     */
    const log = (level, message, data = null) => {
        const timestamp = getTimestamp();
        const emoji = {
            info: '🔍',
            warn: '⚠️',
            error: '❌',
            success: '✅',
            start: '🚀',
            config: '⚙️',
            button: '🔘',
            delete: '🗑️',
            finish: '🏁'
        };

        const logMessage = `${emoji[level] || '📝'} [${timestamp}] GitHub Branch Deleter: ${message}`;

        if (level === 'error') {
            console.error(logMessage, data || '');
        } else if (level === 'warn') {
            console.warn(logMessage, data || '');
        } else {
            console.log(logMessage, data || '');
        }
    };

    /**
     * Pauses execution for a specified amount of time.
     * @param {number} ms - The number of milliseconds to wait.
     * @returns {Promise<void>}
     */
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    /**
     * Injects the main "Delete All" button onto the page.
     */
    function injectDeleteAllButton() {
        log('start', 'Attempting to inject Delete All button');

        // REVISED LOGIC:
        // GitHub's UI now uses dynamic, unstable class names. Instead of a brittle selector,
        // we find a stable landmark: the H1 element with the text "Branches".
        // We then append our button to its parent container, which correctly places it.
        const h1Elements = document.querySelectorAll('h1');
        let container = null;

        for (const h1 of h1Elements) {
            if (h1.textContent.trim() === 'Branches') {
                container = h1.parentElement;
                break;
            }
        }

        if (!container) {
            log('warn', 'Could not find the "Branches" title H1 to determine button placement.');
            return;
        }

        if (document.getElementById('batch-delete-branches-btn')) {
            log('info', 'Delete All button already exists, skipping injection');
            return;
        }

        log('info', 'Container found, creating button');
        const deleteAllBtn = document.createElement('button');
        deleteAllBtn.id = 'batch-delete-branches-btn';
        deleteAllBtn.textContent = 'Delete Displayed Branches';

        // Use standard Primer CSS classes for a consistent look.
        // The "New branch" button uses more complex classes, but `btn btn-danger` is a reliable fallback.
        deleteAllBtn.className = 'btn btn-danger ml-3';

        deleteAllBtn.addEventListener('click', handleDeleteAllClick);
        container.appendChild(deleteAllBtn);
        log('success', 'Delete All button successfully injected');
    }

    /**
     * Handles the click event for the main delete button and starts the process.
     */
    async function handleDeleteAllClick() {
        log('start', 'Delete All button clicked, starting deletion process');

        const branchRows = document.querySelectorAll(config.branchRowSelector);
        log('info', `Found ${branchRows.length} branch rows`, { selector: config.branchRowSelector });

        const deleteButtons = Array.from(branchRows)
            .map(row => row.querySelector(config.deleteButtonSelector))
            .filter(Boolean); // Keep only rows that have a delete button.

        log('info', `Found ${deleteButtons.length} deletable branches out of ${branchRows.length} total rows`);

        if (deleteButtons.length === 0) {
            log('warn', 'No deletable branches found on this page');
            alert('No deletable branches found on this page.');
            return;
        }

        log('info', 'Asking user for confirmation');
        if (!confirm(`Are you sure you want to attempt to delete ${deleteButtons.length} branches?\nThis action cannot be undone.`)) {
            log('info', 'Batch deletion cancelled by user');
            return;
        }

        log('start', `Starting batch deletion of ${deleteButtons.length} branches with ${config.deleteDelay}ms delay`);
        let deletedCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        // Process each delete button sequentially.
        for (let i = 0; i < deleteButtons.length; i++) {
            const btn = deleteButtons[i];
            const row = btn.closest(config.branchRowSelector);

            if (!document.body.contains(row)) {
                log('warn', `Row ${i + 1}/${deleteButtons.length} no longer exists in DOM, skipping`);
                skippedCount++;
                continue;
            }

            const branchName = row.querySelector('a[class*="BranchName"]')?.textContent.trim() || 'Unknown Branch';
            log('delete', `Processing branch ${i + 1}/${deleteButtons.length}: "${branchName}"`);

            try {
                // Click the delete button to delete the branch immediately.
                btn.click();
                log('success', `Successfully deleted branch: "${branchName}"`);
                deletedCount++;

                if (i < deleteButtons.length - 1) { // Don't wait after the last deletion
                    log('info', `Waiting ${config.deleteDelay}ms before next deletion`);
                    await sleep(config.deleteDelay);
                }
            } catch (error) {
                log('error', `Failed to delete branch: "${branchName}"`, error);
                errorCount++;
            }
        }

        const summary = `Deletion process completed - Deleted: ${deletedCount}, Failed: ${errorCount}, Skipped: ${skippedCount}`;
        log('finish', summary);
        alert(`Batch deletion process finished.\n\nSuccessfully deleted: ${deletedCount}\nFailed: ${errorCount}\nSkipped (DOM changes): ${skippedCount}`);

        log('info', 'Reloading page to reflect changes');
        location.reload();
    }

    // --- Initialization ---
    log('start', 'GitHub Branch Deleter userscript initializing');
    log('config', 'Current configuration', config);

    // Use a MutationObserver to handle dynamic page content loading (common in single-page apps like GitHub).
    // This ensures our button is re-injected if the user navigates between tabs.
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
                // Check if the area we want to add our button to has appeared.
                const h1 = Array.from(document.querySelectorAll('h1')).find(h => h.textContent.trim() === 'Branches');
                if (h1 && !document.getElementById('batch-delete-branches-btn')) {
                    log('info', 'Branches page content detected via MutationObserver, attempting injection');
                    injectDeleteAllButton();
                    // Once we've found it and injected, we don't need to keep checking this mutation record
                    return; 
                }
            }
        }
    });

    log('info', 'Setting up MutationObserver for dynamic content');
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Run the injection function on initial script load as well, in case the page is already loaded.
    log('info', 'Running initial button injection');
    // A small timeout can help ensure the initial page render is complete
    setTimeout(injectDeleteAllButton, 500); 

    log('success', 'GitHub Branch Deleter userscript initialization complete');

})();
