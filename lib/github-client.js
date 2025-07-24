// lib/github-client.js
class GitHubClient {
    constructor(accessToken) {
        this.accessToken = accessToken;
        this.baseUrl = 'https://api.github.com';
    }

    async createRepository(repoName, description = '') {
        console.log('🏗️ Creating GitHub repository:', repoName);
        
        try {
            const response = await fetch(`${this.baseUrl}/user/repos`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'CV-Landing-Generator'
                },
                body: JSON.stringify({
                    name: repoName,
                    description: description,
                    private: false,
                    auto_init: false, // We'll push our own files
                    has_issues: false,
                    has_projects: false,
                    has_wiki: false
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub API error: ${response.status} - ${errorData.message}`);
            }

            const repo = await response.json();
            console.log('✅ Repository created:', repo.html_url);

            return {
                id: repo.id,
                name: repo.name,
                fullName: repo.full_name,
                htmlUrl: repo.html_url,
                cloneUrl: repo.clone_url,
                defaultBranch: repo.default_branch || 'main'
            };

        } catch (error) {
            console.error('❌ Failed to create repository:', error);
            throw error;
        }
    }

    async uploadFiles(repoName, files) {
        console.log('📤 Uploading files to repository:', repoName);
        console.log('   Files to upload:', Object.keys(files));

        try {
            // Get repository info
            const repoInfo = await this.getRepository(repoName);
            const branch = repoInfo.defaultBranch;

            // For empty repositories, we need to use the Contents API approach
            console.log('📝 Uploading files to empty repository using Contents API...');
            
            let lastCommitData = null;
            
            // Upload each file sequentially to avoid conflicts
            for (const [fileName, content] of Object.entries(files)) {
                console.log(`   Uploading: ${fileName}`);
                
                const response = await fetch(`${this.baseUrl}/repos/${repoInfo.fullName}/contents/${fileName}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${this.accessToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json',
                        'User-Agent': 'CV-Landing-Generator'
                    },
                    body: JSON.stringify({
                        message: `Add ${fileName}`,
                        content: Buffer.from(content, 'utf8').toString('base64'),
                        branch: branch
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Failed to upload ${fileName}: ${errorData.message}`);
                }
                
                lastCommitData = await response.json();
                console.log(`   ✅ Uploaded: ${fileName}`);
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            console.log('✅ All files uploaded successfully');
            
            return {
                commitSha: lastCommitData.commit.sha,
                commitUrl: lastCommitData.commit.html_url
            };

        } catch (error) {
            console.error('❌ Failed to upload files:', error);
            throw error;
        }
    }

    async enableGitHubPages(repoName) {
        console.log('📄 Enabling GitHub Pages for:', repoName);

        try {
            const repoInfo = await this.getRepository(repoName);
            
            const response = await fetch(`${this.baseUrl}/repos/${repoInfo.fullName}/pages`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'CV-Landing-Generator'
                },
                body: JSON.stringify({
                    source: {
                        branch: repoInfo.defaultBranch,
                        path: '/'
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                
                // GitHub Pages might already be enabled
                if (response.status === 409) {
                    console.log('⚠️ GitHub Pages already enabled');
                    return await this.getGitHubPagesInfo(repoName);
                }
                
                throw new Error(`Failed to enable GitHub Pages: ${errorData.message}`);
            }

            const pages = await response.json();
            console.log('✅ GitHub Pages enabled:', pages.html_url);

            return {
                url: pages.html_url,
                status: pages.status,
                source: pages.source
            };

        } catch (error) {
            console.error('❌ Failed to enable GitHub Pages:', error);
            throw error;
        }
    }

    async getRepository(repoName) {
        try {
            const response = await fetch(`${this.baseUrl}/user/repos`, {
                headers: {
                    'Authorization': `token ${this.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'CV-Landing-Generator'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get repositories: ${response.status}`);
            }

            const repos = await response.json();
            const repo = repos.find(r => r.name === repoName);

            if (!repo) {
                throw new Error(`Repository ${repoName} not found`);
            }

            return {
                id: repo.id,
                name: repo.name,
                fullName: repo.full_name,
                htmlUrl: repo.html_url,
                defaultBranch: repo.default_branch || 'main'
            };

        } catch (error) {
            console.error('❌ Failed to get repository info:', error);
            throw error;
        }
    }

    async getGitHubPagesInfo(repoName) {
        try {
            const repoInfo = await this.getRepository(repoName);
            
            const response = await fetch(`${this.baseUrl}/repos/${repoInfo.fullName}/pages`, {
                headers: {
                    'Authorization': `token ${this.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'CV-Landing-Generator'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get GitHub Pages info: ${response.status}`);
            }

            const pages = await response.json();
            return {
                url: pages.html_url,
                status: pages.status,
                source: pages.source
            };

        } catch (error) {
            console.error('❌ Failed to get GitHub Pages info:', error);
            throw error;
        }
    }
}

module.exports = GitHubClient;