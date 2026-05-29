# Fail-Safe Code Updater

If forked, remember to:

0. Enable Google Apps Script API @ https://script.google.com/u/1/home/usersettings?pageId=none
1. Change the GAS webapp link and App name in `config.js`.
2. Secrets names:
|CLASP_CREDENTIALS|
|GAS_DEPLOYMENT_ID|
|GAS_SCRIPT_ID|
3. Go to Actions and enable workflow
4. Under `config.js` change the folder, repo, and branch for backing up the tool itself:
// Configuration for this specific system tool bypasses the general UI selectors
TARGET_REPO: "  ",
TARGET_FOLDER_ID: "  ",
TARGET_BRANCH: "main"
