# Fail-Safe-Code-Updater

## Complete Deployment Guide (New GitHub & Google Accounts)

Follow these steps to deploy your own isolated instance of the App Code Maintainer using completely new accounts.

### Phase 1: Google Account & Drive Setup
1. Log in to your new Google Account.
2. Go to [Google Drive](https://drive.google.com/) and create a new folder (e.g., `App Backups`).
3. Open the folder and copy the **Folder ID** from the URL (it is the long string of characters after `folders/`, e.g., `1aBcDeFgHiJkLmNoPqRsTuVwXyZ`). Save this for later.

### Phase 2: Google Apps Script (Backend) Initial Setup
1. Go to [Google Apps Script User Settings](https://script.google.com/home/usersettings) and turn **ON** the Google Apps Script API.
2. Go to the [Apps Script Dashboard](https://script.google.com/) and click **New Project**.
3. Name the project (e.g., "Fail-Safe Backend").
4. Copy the code from `backend/Code.js` in this repository and paste it into `Code.gs` in the Apps Script editor.
5. Go to Project Settings (gear icon on the left), and check **"Show appsscript.json manifest file in editor"**.
6. Go back to the editor, open the newly visible `appsscript.json` file, and paste the exact contents of `backend/appsscript.json` from this repository.
7. Click the blue **Deploy** button at the top right > **New deployment**.
    * Select type: **Web App** (click the gear icon next to "Select type" to find this).
    * Description: "Initial Deployment".
    * Execute as: **Me**.
    * Who has access: **Anyone**.
8. Click **Deploy**. (You will be prompted to authorize access. Click Review Permissions > Choose your account > Advanced > Go to Fail-Safe Backend).
9. Copy the **Web app URL** and **Deployment ID**. Save these securely.
10. Go to Project Settings (gear icon) again and copy the **Script ID**. Save this securely.

### Phase 3: GitHub Setup & Forking
1. Log in to your new GitHub Account.
2. Fork this repository to your own account.
3. Enable GitHub Pages to host the frontend:
    * Go to your forked repository's **Settings > Pages**.
    * Build and deployment source: **Deploy from a branch**.
    * Branch: `main`, folder: `/ (root)`.
    * Click **Save**. Your frontend URL will soon be live at `https://<your-username>.github.io/<repo-name>/`.
4. Configure GitHub Actions Secrets so your repo can talk to your Google Apps Script:
    * Go to **Settings > Secrets and variables > Actions**.
    * Click **New repository secret** and add the following three secrets:
        1. `GAS_SCRIPT_ID`: Paste the Script ID from Phase 2 Step 10.
        2. `GAS_DEPLOYMENT_ID`: Paste the Deployment ID from Phase 2 Step 9.
        3. `CLASP_CREDENTIALS`: You will generate this using GitHub Codespaces directly in your browser.
            * Go to the main page of your repository.
            * Click the green **<> Code** button, switch to the **Codespaces** tab, and click **Create codespace on main**.
            * Wait for the web editor to load, then click into the terminal panel at the bottom.
            * Run: `npm install -g @google/clasp`
            * Run: `clasp login --no-localhost`
            * It will provide a URL. Open that URL in a new browser tab, log in with your Google Account, and click "Allow".
            * Google will display an authorization code. Copy it, paste it back into your Codespaces terminal, and hit Enter.
            * Run: `cat ~/.clasprc.json`
            * Copy the **entire JSON output** printed in the terminal and paste it as the value for the `CLASP_CREDENTIALS` secret.
            * (You can now close and delete the Codespace).

### Phase 4: Enable Actions & Update Variables
1. Go to the **Actions** tab in your GitHub repository.
2. Click **"I understand my workflows, go ahead and enable them"**.
3. Edit the `config.js` file in your GitHub repository to link everything together:
    * Update `GAS_WEB_APP_URL` with your new Web App URL (from Phase 2 Step 9).
    * Update `TARGET_REPO` with your specific `"username/repo-name"`.
    * Update `TARGET_FOLDER_ID` with the Google Drive Folder ID you created in Phase 1.
4. Commit your changes to `config.js`. This commit will automatically trigger a GitHub Action to deploy the updated backend code securely!

### Phase 5: Create GitHub Fine-Grained Token (For UI Usage)
To actually use the web tool to push updates to your repositories:
1. Go to your GitHub Profile **Settings (Top Right Avatar) > Developer Settings > Personal access tokens > Fine-grained tokens**.
2. Click **Generate new token**.
3. Name it (e.g., "Code Maintainer UI Token").
4. Under **Repository access**, select **All repositories** (or only the repositories you want the tool to manage).
5. Under **Repository permissions**, set **Contents** to **Read and write**.
6. Generate the token and copy it. You will paste this directly into the tool's UI (Step 1: Configuration) when you open your live GitHub Pages link.
