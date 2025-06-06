// ==UserScript==
// @name         GitHub Branch Deleter
// @namespace    https://github.com/InvictusNavarchus/github-branch-deleter
// @icon         https://github.githubassets.com/pinned-octocat.svg
// @icon64       https://github.githubassets.com/pinned-octocat.svg
// downloadURL   https://raw.githubusercontent.com/InvictusNavarchus/github-branch-deleter/master/github-branch-deleter.user.js
// @updateURL    https://raw.githubusercontent.com/InvictusNavarchus/github-branch-deleter/master/github-branch-deleter.user.js
// @version      0.1.2
// @description  Adds a button to delete all non-default/protected branches on the GitHub branches page.
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
        // Selector for the container where the "Delete All" button will be injected.
        buttonContainerSelector: 'div[class*="PageLayout-Header-"] div[class*="Box-sc"]',
        // Selector for individual branch rows in the table.
        branchRowSelector: 'tbody[class*="TableBody"] tr[class*="TableRow"]',
        // Selector for the delete icon button within a branch row.
        deleteButtonSelector: 'button:has(svg.octicon-trash)'
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
        // Find the header area next to the "Branches" title.
        const container = document.querySelector(config.buttonContainerSelector);
        if (container && !document.getElementById('batch-delete-branches-btn')) {
            const deleteAllBtn = document.createElement('button');
            deleteAllBtn.id = 'batch-delete-branches-btn';
            deleteAllBtn.textContent = 'Delete Displayed Branches';

            // Apply GitHub's Primer CSS classes for a native look and feel.
            deleteAllBtn.className = 'btn btn-danger ml-3';

            deleteAllBtn.addEventListener('click', handleDeleteAllClick);
            container.appendChild(deleteAllBtn);
            console.log('Batch Delete button injected.');
        }
    }

    /**
     * Handles the click event for the main delete button and starts the process.
     */
    async function handleDeleteAllClick() {
        const branchRows = document.querySelectorAll(config.branchRowSelector);
        const deleteButtons = Array.from(branchRows)
            .map(row => row.querySelector(config.deleteButtonSelector))
            .filter(Boolean); // Keep only rows that have a delete button.

        if (deleteButtons.length === 0) {
            alert('No deletable branches found on this page.');
            return;
        }

        if (!confirm(`Are you sure you want to attempt to delete ${deleteButtons.length} branches?\nThis action cannot be undone.`)) {
            console.log('Batch deletion cancelled by user.');
            return;
        }

        console.log(`Starting batch deletion of ${deleteButtons.length} branches.`);
        let deletedCount = 0;
        let errorCount = 0;

        // Process each delete button sequentially.
        for (const btn of deleteButtons) {
            const row = btn.closest(config.branchRowSelector);
            if (!document.body.contains(row)) {
                 // The row might have been removed by a previous deletion in a re-render.
                console.log('Row no longer exists, skipping.');
                continue;
            }
            const branchName = row.querySelector('a[class*="BranchName"]')?.textContent.trim() || 'Unknown Branch';

            try {
                // Click the delete button to delete the branch immediately.
                btn.click();
                console.log(`Deleted branch: ${branchName}`);
                deletedCount++;
                await sleep(config.deleteDelay); // Wait for the UI to update.
            } catch (error) {
                console.error(`An error occurred while deleting branch: ${branchName}`, error);
                errorCount++;
            }
        }

        alert(`Batch deletion process finished.\n\nSuccessfully deleted: ${deletedCount}\nFailed or skipped: ${errorCount}`);
        console.log('Batch deletion finished. Reloading page to reflect changes.');
        location.reload();
    }

    // --- Initialization ---

    // Use a MutationObserver to handle dynamic page content loading (common in single-page apps like GitHub).
    // This ensures our button is re-injected if the user navigates between tabs.
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
                // Check if the area we want to add our button to has appeared.
                if (document.querySelector(config.buttonContainerSelector)) {
                    injectDeleteAllButton();
                }
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Run the injection function on initial script load as well.
    injectDeleteAllButton();

})();
