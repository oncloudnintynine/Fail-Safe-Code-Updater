# https://oncloudnintynine.github.io/Fail-Safe-Code-Updater/

If forked, remember to:

0. Enable Google Apps Script API @ https://script.google.com/u/1/home/usersettings?pageld=none
1. Change the GAS webapp link under updater.js.
2. Change the link above.
3. Secrets names:
|CLASP_CREDENTIALS|
|GAS_DEPLOYMENT_ID|
|GAS_SCRIPT_ID|
4. Go to Actions and enable workflow
5. under updater.js change the folder if for backing up Fail-Safe-Code-Updater itself:
 // Hardcoded configuration for this specific system tool bypasses the general UI selectors
 const targetRepo = "oncloudnintynine/Fail-Safe-Code-Updater";
 const targetFolderId = "1u0irLS2iRZX9Tpx92uazdRukTemA3pLL";
 const targetBranch = "main";
