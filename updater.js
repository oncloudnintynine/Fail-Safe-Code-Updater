// ==========================================
// App Code Maintainer - Client-Side Logic
// ==========================================

// --- HARDCODED BACKEND CONFIGURATION ---
// IMPORTANT: Paste your deployed Google Apps Script Web App URL below
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyLB4dyVb7r0IessnWtsYHf2Wl91HlownMG2Hlx3fvpD6wGl7Les7jvIta5CU4TmJZR/exec";

// --- UTILITY LOGIC & STATE ---
const statusMsg = document.getElementById('status-message');
const tokenInput = document.getElementById('gh-token');
const folderInput = document.getElementById('gh-drive-folder');
const branchInput = document.getElementById('gh-branch');
const repoSelect = document.getElementById('gh-repo');
const skipBackupCheckbox = document.getElementById('skip-backup');
const updateBtnText = document.getElementById('btn-text');

// 1. Auto-Load settings from localStorage
document.addEventListener("DOMContentLoaded", () => {
    tokenInput.value = localStorage.getItem('acm_gh_token') || '';
    folderInput.value = localStorage.getItem('acm_drive_folder') || '';
    branchInput.value = localStorage.getItem('acm_gh_branch') || 'main';
    skipBackupCheckbox.checked = localStorage.getItem('acm_skip_backup') === 'true';
    
    toggleBtnText();
    if (tokenInput.value.trim()) fetchRepos();
});

// 2. Auto-Save settings to localStorage
tokenInput.addEventListener('change', (e) => {
    localStorage.setItem('acm_gh_token', e.target.value.trim());
    if (e.target.value.trim()) fetchRepos();
});
folderInput.addEventListener('change', (e) => localStorage.setItem('acm_drive_folder', e.target.value.trim()));
branchInput.addEventListener('change', (e) => localStorage.setItem('acm_gh_branch', e.target.value.trim()));
repoSelect.addEventListener('change', (e) => localStorage.setItem('acm_gh_repo', e.target.value));

skipBackupCheckbox.addEventListener('change', (e) => {
    localStorage.setItem('acm_skip_backup', e.target.checked);
    toggleBtnText();
});

function toggleBtnText() {
    if (skipBackupCheckbox.checked) {
        updateBtnText.textContent = "Push Code (Skip Backup)";
    } else {
        updateBtnText.textContent = "Backup Repo & Push Code";
    }
}

function setStatus(msg, type = 'info') {
    statusMsg.textContent = msg;
    // Clear old state colors
    statusMsg.className = 'sticky top-4 z-50 shadow-2xl p-4 rounded-xl text-sm font-semibold text-center transition-all border backdrop-blur-md';
    
    if (type === 'error') {
        statusMsg.classList.add('bg-rose-900/80', 'text-rose-100', 'border-rose-800');
    } else if (type === 'success') {
        statusMsg.classList.add('bg-emerald-900/80', 'text-emerald-100', 'border-emerald-800');
    } else {
        statusMsg.classList.add('bg-indigo-900/80', 'text-indigo-100', 'border-indigo-800');
    }
    statusMsg.classList.remove('hidden');
}

function getConfig() {
    const repo = document.getElementById('gh-repo').value.trim();
    const branch = document.getElementById('gh-branch').value.trim();
    const token = document.getElementById('gh-token').value.trim();
    let folderInputVal = document.getElementById('gh-drive-folder').value.trim();
    
    if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
        throw new Error("GAS Web App URL is missing. Please hardcode it in updater.js.");
    }
    if (!repo || !branch || !token || !folderInputVal) {
        throw new Error("All configuration fields in Step 1 are required.");
    }

    let folderId = folderInputVal;
    if (folderInputVal.includes('drive.google.com')) { 
        const match = folderInputVal.match(/folders\/([a-zA-Z0-9_-]+)/); 
        if (match) folderId = match[1]; 
    }

    return { repo, branch, token, gasUrl: GAS_WEB_APP_URL, folderId, skipBackup: skipBackupCheckbox.checked };
}

async function gasCall(gasUrl, payload) {
    const res = await fetch(gasUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.error) throw new Error("GAS Error: " + data.error);
    return data;
}

// --- GITHUB API LOGIC ---
async function fetchRepos() {
    const token = tokenInput.value.trim();
    if (!token) {
        repoSelect.innerHTML = '<option value="">Enter token to load repos...</option>';
        return;
    }
    try {
        repoSelect.innerHTML = '<option value="">Fetching repositories...</option>';
        const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Invalid or expired token");
        
        const repos = await res.json();
        repoSelect.innerHTML = '';
        
        if (repos.length === 0) {
            repoSelect.innerHTML = '<option value="">No repositories found</option>';
            return;
        }

        repos.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.full_name;
            opt.textContent = r.full_name;
            repoSelect.appendChild(opt);
        });

        const savedRepo = localStorage.getItem('acm_gh_repo');
        if (savedRepo && [...repoSelect.options].some(o => o.value === savedRepo)) {
            repoSelect.value = savedRepo;
        } else {
            localStorage.setItem('acm_gh_repo', repoSelect.value);
        }
    } catch (e) {
        repoSelect.innerHTML = '<option value="">Failed to load repos (Check token)</option>';
    }
}

async function fetchAllRepoFiles(repo, branch, token) {
    const headers = { "Authorization": `Bearer ${token}` };
    const treeRes = await fetch(`https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`, { headers });
    if (!treeRes.ok) throw new Error(`GitHub API Error: Could not fetch tree for branch '${branch}'.`);
    
    const treeData = await treeRes.json();
    const fileNodes = treeData.tree.filter(item => item.type === 'blob' && !item.path.startsWith('updater/'));
    
    let compiledFiles = [];
    const batchSize = 10; 
    
    for (let i = 0; i < fileNodes.length; i += batchSize) {
        const batch = fileNodes.slice(i, i + batchSize);
        const promises = batch.map(async file => {
            const contentRes = await fetch(`https://api.github.com/repos/${repo}/git/blobs/${file.sha}`, {
                headers: { ...headers, "Accept": "application/vnd.github.v3.raw" }
            });
            if (!contentRes.ok) throw new Error(`Failed to fetch raw blob for ${file.path}`);
            return { path: file.path, content: await contentRes.text() };
        });
        compiledFiles.push(...(await Promise.all(promises)));
    }
    
    return { fileNodes, compiledFiles };
}

async function pushCommitToGitHub(repo, branch, token, files, commitMessage) {
    const headers = { 
        "Authorization": `Bearer ${token}`, 
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
    };
    const baseUrl = `https://api.github.com/repos/${repo}`;

    let res = await fetch(`${baseUrl}/git/refs/heads/${branch}`, { headers });
    if (!res.ok) throw new Error(`GitHub API Error: Could not find branch '${branch}'.`);
    const commitSha = (await res.json()).object.sha;

    res = await fetch(`${baseUrl}/git/commits/${commitSha}`, { headers });
    const baseTreeSha = (await res.json()).tree.sha;

    const treeNodes = files.map(f => ({
        path: f.path, mode: "100644", type: "blob", content: f.content
    }));

    res = await fetch(`${baseUrl}/git/trees`, {
        method: "POST", headers,
        body: JSON.stringify({ base_tree: baseTreeSha, tree: treeNodes })
    });
    if (!res.ok) throw new Error("GitHub API Error: Failed to construct Git Tree.");
    const newTreeSha = (await res.json()).sha;

    res = await fetch(`${baseUrl}/git/commits`, {
        method: "POST", headers,
        body: JSON.stringify({ message: commitMessage, tree: newTreeSha, parents: [commitSha] })
    });
    if (!res.ok) throw new Error("GitHub API Error: Failed to create Commit.");
    const newCommitSha = (await res.json()).sha;

    res = await fetch(`${baseUrl}/git/refs/heads/${branch}`, {
        method: "PATCH", headers, body: JSON.stringify({ sha: newCommitSha })
    });
    if (!res.ok) throw new Error("GitHub API Error: Failed to update branch reference.");
    
    return newCommitSha;
}

async function pollWorkflowStatus(repo, token, commitSha) {
    const headers = { 
        "Authorization": `Bearer ${token}`, 
        "Accept": "application/vnd.github.v3+json"
    };
    const baseUrl = `https://api.github.com/repos/${repo}/actions/runs?head_sha=${commitSha}`;
    
    let attempts = 0;
    const maxAttempts = 60; // Up to 5 minutes
    let runId = null;
    
    setStatus(`GitHub Action triggers starting... Waiting for workflow to queue.`, 'info');

    while (attempts < maxAttempts) {
        attempts++;
        await new Promise(r => setTimeout(r, 5000));
        
        try {
            const res = await fetch(baseUrl, { headers });
            if (!res.ok) continue;
            const data = await res.json();
            
            if (data.total_count > 0) {
                const run = data.workflow_runs[0];
                runId = run.id;
                
                if (run.status === 'completed') {
                    if (run.conclusion === 'success') {
                        setStatus(`🎉 Deployment successful! GitHub Action completed successfully.`, 'success');
                    } else {
                        setStatus(`⚠️ Deployment concluded with errors (Status: ${run.conclusion}). Please check GitHub Actions.`, 'error');
                    }
                    return;
                } else {
                    setStatus(`⏳ GitHub Action in progress (State: ${run.status})...`, 'info');
                }
            } else {
                // If no workflows are detected after 4 attempts (20 seconds), we can assume none exist
                if (attempts > 4 && !runId) {
                    setStatus(`✅ Push successful! (No GitHub Actions workflow detected for this commit).`, 'success');
                    return;
                }
            }
        } catch (e) {
            console.warn("Polling error silently ignored:", e);
        }
    }
    
    setStatus(`✅ Push successful! (Timed out waiting for GitHub Actions deployment feedback).`, 'success');
}

// --- CORE ACTIONS ---

// 1. UPDATE PUSH FLOW
document.getElementById('updater-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const payloadInput = document.getElementById('gh-payload').value.trim();
    const btnSpinner = document.getElementById('btn-spinner');
    const submitBtn = document.getElementById('submit-btn');

    try {
        const config = getConfig();
        
        const files = [];
        const fileRegex = /\$\$\$\s*FILE:\s*([^\$]+)\s*\$\$\$\s*```javascript([\s\S]*?)```/g;
        let match;
        while ((match = fileRegex.exec(payloadInput)) !== null) {
            files.push({ path: match[1].trim(), content: match[2].trim() });
        }
        if (files.length === 0) throw new Error("No valid files parsed. Ensure you copied the exact format.");

        submitBtn.disabled = true;
        btnSpinner.classList.remove('hidden');
        
        if (!config.skipBackup) {
            setStatus("Fetching full repository tree to create a Drive backup...", "info");
            updateBtnText.textContent = "Step 1/2: Backing up repo...";
            
            const { fileNodes, compiledFiles } = await fetchAllRepoFiles(config.repo, config.branch, config.token);
            const hierarchy = fileNodes.map(f => f.path).join('\n');
            
            await gasCall(config.gasUrl, { action: 'backupCode', folderId: config.folderId, hierarchy, files: compiledFiles });
            setStatus(`Backup successful! Pushing new code to GitHub...`, "info");
            updateBtnText.textContent = "Step 2/2: Pushing Update...";
        } else {
            setStatus("Skipping Backup. Pushing new code directly to GitHub...", "info");
            updateBtnText.textContent = "Pushing Update...";
        }

        const newCommitSha = await pushCommitToGitHub(config.repo, config.branch, config.token, files, "Automated emergency update via App Code Maintainer");

        // UI Reset before polling so user can act immediately if they want
        document.getElementById('gh-payload').value = '';
        submitBtn.disabled = false;
        btnSpinner.classList.add('hidden');
        toggleBtnText();

        // Start polling the actions asynchronously
        pollWorkflowStatus(config.repo, config.token, newCommitSha);

    } catch (err) {
        setStatus(err.message, "error");
        submitBtn.disabled = false;
        btnSpinner.classList.add('hidden');
        toggleBtnText();
    }
});

// 2. LOAD BACKUPS FLOW
document.getElementById('load-backups-btn').addEventListener('click', async () => {
    const btn = document.getElementById('load-backups-btn');
    const btnText = document.getElementById('load-btn-text');
    const btnSpinner = document.getElementById('load-btn-spinner');
    const rbContainer = document.getElementById('rollback-container');
    const select = document.getElementById('rollback-select');

    try {
        const config = getConfig();
        btn.disabled = true;
        btnSpinner.classList.remove('hidden');
        btnText.textContent = "Fetching Backups...";
        setStatus("Scanning Drive folder for backups...", "info");

        const data = await gasCall(config.gasUrl, { action: 'getBackups', folderId: config.folderId });
        
        if (!data.backups || data.backups.length === 0) {
            throw new Error("No compatible backups found in the specified Drive folder.");
        }

        select.innerHTML = '';
        data.backups.forEach(b => {
            const dateStr = new Date(b.time).toLocaleString();
            const option = document.createElement('option');
            option.value = b.id;
            option.textContent = `${dateStr} - ${b.name}`;
            select.appendChild(option);
        });

        rbContainer.classList.remove('hidden');
        setStatus(`Loaded ${data.backups.length} backups. Select one and perform rollback.`, "success");

    } catch(err) {
        setStatus(err.message, "error");
    } finally {
        btn.disabled = false;
        btnSpinner.classList.add('hidden');
        btnText.textContent = "Refresh Available Backups";
    }
});

// 3. EXECUTE ROLLBACK FLOW
document.getElementById('rollback-btn').addEventListener('click', async () => {
    const btn = document.getElementById('rollback-btn');
    const btnText = document.getElementById('rb-btn-text');
    const btnSpinner = document.getElementById('rb-btn-spinner');
    const select = document.getElementById('rollback-select');
    const fileId = select.value;

    if (!confirm("Are you absolutely sure you want to rollback the repository to this specific version? This will push the backup contents over your current files.")) return;

    try {
        const config = getConfig();
        btn.disabled = true;
        btnSpinner.classList.remove('hidden');
        btnText.textContent = "Retrieving Document...";
        setStatus("Fetching backup document contents from Google Drive...", "info");

        const data = await gasCall(config.gasUrl, { action: 'getBackupContent', fileId });
        
        btnText.textContent = "Pushing Rollback...";
        setStatus("Parsing document and executing rollback over GitHub API...", "info");

        const files = [];
        const fileRegex = /\$\$\$\s*FILE:\s*([^\$]+)\s*\$\$\$\s*```javascript([\s\S]*?)```/g;
        let match;
        while ((match = fileRegex.exec(data.content)) !== null) {
            files.push({ path: match[1].trim(), content: match[2].trim() });
        }
        
        if (files.length === 0) throw new Error("Could not parse files from the backup document. Document may be malformed.");

        const newCommitSha = await pushCommitToGitHub(config.repo, config.branch, config.token, files, "Emergency Repository Rollback via App Code Maintainer");

        document.getElementById('rollback-container').classList.add('hidden');
        
        // Reset UI immediately
        btn.disabled = false;
        btnSpinner.classList.add('hidden');
        btnText.textContent = "Perform Rollback";

        // Poll Github actions for rollback deployment status
        pollWorkflowStatus(config.repo, config.token, newCommitSha);

    } catch(err) {
        setStatus(err.message, "error");
        btn.disabled = false;
        btnSpinner.classList.add('hidden');
        btnText.textContent = "Perform Rollback";
    }
});