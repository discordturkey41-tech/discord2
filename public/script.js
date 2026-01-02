/**
 * Modern UI & Cookie Management Script
 * Handles account selection and remember-me functionality
 */

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners
    document
        .querySelectorAll('.saved-account')
        .forEach((btn) => btn.addEventListener('click', handleSavedAccountClick));
    document
        .querySelectorAll('.clear-account')
        .forEach((btn) => btn.addEventListener('click', handleClearAccount));
});

// ============================================================
// SAVED ACCOUNTS MANAGEMENT
// ============================================================

/**
 * Handle quick login with saved account
 */
async function handleSavedAccountClick(event) {
    event.preventDefault();
    const accountId = this.getAttribute('data-account-id');

    // Set remember-me state for this login
    const loginUrl = `/login?state=remember-me`;
    window.location.href = loginUrl;
}

/**
 * Clear a saved account from cookies
 */
async function handleClearAccount(event) {
    event.preventDefault();
    event.stopPropagation();

    const accountId = this.getAttribute('data-account-id');
    const accountName = this.getAttribute('data-account-name');

    if (!confirm(`Remove ${accountName} from saved accounts?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/clear-account/${accountId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            // Remove the account element with fade animation
            const accountElement = this.closest('.saved-account');
            accountElement.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => {
                accountElement.remove();

                // If no more accounts, hide the saved accounts section
                const container = document.querySelector('.saved-accounts-container');
                if (container && container.children.length === 0) {
                    container.remove();
                }
            }, 300);
        } else {
            alert('Failed to remove account');
        }
    } catch (error) {
        console.error('Error clearing account:', error.message || error);
        alert('Error removing account');
    }
}

/**
 * Handle remember-me checkbox
 */
function toggleRememberMe(checkbox) {
    const loginBtn = document.querySelector('.btn[href*="/login"]');
    if (loginBtn) {
        if (checkbox.checked) {
            loginBtn.href = `/login?state=remember-me`;
        } else {
            loginBtn.href = '/login';
        }
    }
}

// ============================================================
// ANIMATIONS
// ============================================================

// Add fade-out animation
if (!document.querySelector('style[data-fade-out]')) {
    const style = document.createElement('style');
    style.setAttribute('data-fade-out', 'true');
    style.textContent = `
        @keyframes fadeOut {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(-20px);
            }
        }
    `;
    document.head.appendChild(style);
}

// ============================================================
// UTILITIES
// ============================================================

/**
 * Get Discord avatar URL
 */
function getAvatarUrl(userId, avatarHash) {
    if (!avatarHash) {
        return `https://cdn.discordapp.com/embed/avatars/${userId % 5}.png`;
    }
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png`;
}

/**
 * Format user ID for display
 */
function formatUserId(userId) {
    return userId.slice(-4).padStart(4, '0');
}
