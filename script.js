// API Configuration
const API_BASE_URL = 'https://api.neynar.com/v2/farcaster';
const API_KEY_STORAGE_KEY = 'neynar_api_key';

// Default API key (provided by user)
const DEFAULT_API_KEY = '558997B1-A58A-4D73-A667-3BE913619482';

// DOM Elements
const usernameInput = document.getElementById('usernameInput');
const searchBtn = document.getElementById('searchBtn');
const searchHint = document.getElementById('searchHint');
const settingsBtn = document.getElementById('settingsBtn');
const apiKeyModal = document.getElementById('apiKeyModal');
const modalClose = document.getElementById('modalClose');
const cancelBtn = document.getElementById('cancelBtn');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const toggleVisibility = document.getElementById('toggleVisibility');
const apiKeyStatus = document.getElementById('apiKeyStatus');

// Results elements
const resultsContainer = document.getElementById('resultsContainer');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const results = document.getElementById('results');

// Score elements
const scoreValue = document.getElementById('scoreValue');
const scoreBadge = document.getElementById('scoreBadge');
const gaugeProgress = document.getElementById('gaugeProgress');
const gaugeNeedle = document.getElementById('gaugeNeedle');
const interpretationText = document.getElementById('interpretationText');

// Profile elements
const profilePfp = document.getElementById('profilePfp');
const profileDisplayName = document.getElementById('profileDisplayName');
const profileUsername = document.getElementById('profileUsername');
const profileFid = document.getElementById('profileFid');
const profileBio = document.getElementById('profileBio');
const followerCount = document.getElementById('followerCount');
const followingCount = document.getElementById('followingCount');
const custodyAddress = document.getElementById('custodyAddress');

// Initialize
let currentApiKey = localStorage.getItem(API_KEY_STORAGE_KEY) || DEFAULT_API_KEY;

// Save default API key if not already saved
if (!localStorage.getItem(API_KEY_STORAGE_KEY)) {
    localStorage.setItem(API_KEY_STORAGE_KEY, DEFAULT_API_KEY);
}

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

usernameInput.addEventListener('input', () => {
    searchHint.textContent = usernameInput.value ? 'Press Enter to search' : 'Enter a username to get started';
});

settingsBtn.addEventListener('click', openApiKeyModal);
modalClose.addEventListener('click', closeApiKeyModal);
cancelBtn.addEventListener('click', closeApiKeyModal);
saveApiKeyBtn.addEventListener('click', saveApiKey);

toggleVisibility.addEventListener('click', () => {
    const type = apiKeyInput.type === 'password' ? 'text' : 'password';
    apiKeyInput.type = type;
});

// Click outside modal to close
apiKeyModal.addEventListener('click', (e) => {
    if (e.target === apiKeyModal) {
        closeApiKeyModal();
    }
});

// Functions
function openApiKeyModal() {
    apiKeyInput.value = currentApiKey;
    apiKeyModal.classList.add('active');
    apiKeyStatus.className = 'api-key-status';
}

function closeApiKeyModal() {
    apiKeyModal.classList.remove('active');
    apiKeyInput.value = '';
    apiKeyStatus.className = 'api-key-status';
}

function saveApiKey() {
    const newApiKey = apiKeyInput.value.trim();
    
    if (!newApiKey) {
        apiKeyStatus.className = 'api-key-status error';
        apiKeyStatus.textContent = 'Please enter an API key';
        return;
    }
    
    currentApiKey = newApiKey;
    localStorage.setItem(API_KEY_STORAGE_KEY, newApiKey);
    
    apiKeyStatus.className = 'api-key-status success';
    apiKeyStatus.textContent = 'API key saved successfully!';
    
    setTimeout(() => {
        closeApiKeyModal();
    }, 1500);
}

async function handleSearch() {
    const username = usernameInput.value.trim();
    
    if (!username) {
        showError('Please enter a username');
        return;
    }
    
    if (!currentApiKey) {
        showError('Please configure your API key in settings');
        openApiKeyModal();
        return;
    }
    
    await fetchUserData(username);
}

async function fetchUserData(username) {
    showLoading();
    
    try {
        const url = `${API_BASE_URL}/user/by_username?username=${encodeURIComponent(username)}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'x-api-key': currentApiKey,
                'x-neynar-experimental': 'true'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Invalid API key. Please check your settings.');
            } else if (response.status === 404) {
                throw new Error(`User "${username}" not found. Please check the username and try again.`);
            } else {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
        }
        
        const data = await response.json();
        displayUserData(data.user);
        
    } catch (error) {
        console.error('Error fetching user data:', error);
        showError(error.message || 'Failed to fetch user data. Please try again.');
    }
}

function displayUserData(user) {
    // Extract data
    const score = user.experimental?.neynar_user_score || user.score || 0;
    const normalizedScore = Math.min(Math.max(score, 0), 1); // Ensure 0-1 range
    
    // Update score
    scoreValue.textContent = normalizedScore.toFixed(2);
    updateScoreGauge(normalizedScore);
    updateScoreInterpretation(normalizedScore);
    
    // Update profile
    profilePfp.src = user.pfp_url || 'https://via.placeholder.com/80';
    profilePfp.alt = `${user.display_name || user.username}'s profile picture`;
    profileDisplayName.textContent = user.display_name || user.username;
    profileUsername.textContent = `@${user.username}`;
    profileFid.textContent = user.fid;
    
    // Update bio
    const bioText = user.profile?.bio?.text || 'No bio available';
    profileBio.textContent = bioText;
    
    // Update stats
    followerCount.textContent = formatNumber(user.follower_count || 0);
    followingCount.textContent = formatNumber(user.following_count || 0);
    
    // Update custody address
    const address = user.custody_address || '0x...';
    custodyAddress.textContent = formatAddress(address);
    custodyAddress.title = address; // Show full address on hover
    
    showResults();
}

function updateScoreGauge(score) {
    // Update gauge progress (arc length is 251.2)
    const dashOffset = 251.2 - (score * 251.2);
    gaugeProgress.style.strokeDashoffset = dashOffset;
    
    // Update needle rotation (-90 to 90 degrees)
    const rotation = -90 + (score * 180);
    gaugeNeedle.setAttribute('transform', `rotate(${rotation} 100 100)`);
    
    // Update badge color based on score
    if (score >= 0.7) {
        scoreBadge.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
    } else if (score >= 0.4) {
        scoreBadge.style.background = 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)';
    } else {
        scoreBadge.style.background = 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)';
    }
}

function updateScoreInterpretation(score) {
    let text = '';
    
    if (score >= 0.8) {
        text = '🌟 Excellent! This user has exceptional quality and engagement.';
    } else if (score >= 0.6) {
        text = '✨ Great! This user shows strong quality and activity.';
    } else if (score >= 0.4) {
        text = '👍 Good! This user has moderate engagement and quality.';
    } else if (score >= 0.2) {
        text = '⚠️ Fair. This user has limited activity or newer account.';
    } else {
        text = '🔍 Low score. May indicate new account or limited engagement.';
    }
    
    interpretationText.textContent = text;
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatAddress(address) {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function showLoading() {
    hideAllStates();
    loadingState.classList.add('active');
}

function showError(message) {
    hideAllStates();
    errorMessage.textContent = message;
    errorState.classList.add('active');
}

function showResults() {
    hideAllStates();
    results.classList.add('active');
}

function hideAllStates() {
    loadingState.classList.remove('active');
    errorState.classList.remove('active');
    results.classList.remove('active');
}

// Auto-focus on username input
usernameInput.focus();
